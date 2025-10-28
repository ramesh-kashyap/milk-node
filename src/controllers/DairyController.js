const sequelize = require('../config/connectDB');
const { QueryTypes, Op, fn, col, literal, json } = require('sequelize');
const bcrypt = require("bcryptjs");
const { User, MilkEntry, Payment,Transaction, Customer, Product, ProductTrx} = require('../models');
const { INSERT } = require('sequelize/lib/query-types');
const { success } = require('zod');

const dairyReport = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(200).json({ status: false, message: "User not Found!" });
    }
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // 👉 1. Today’s total
    const todayTotals = await MilkEntry.findAll({
  attributes: [
    [fn("SUM", col("MilkEntry.litres")), "litres"],
    [fn("SUM", col("MilkEntry.amount")), "amount"],
   
  ],
  include: [
    {
      model: Customer,
      attributes: [],        // we only need customer_type
      where: { user_id: user.id } // filter by user id
    }
  ],
  where: {
    [Op.and]: [
      // compare only the date part
      sequelize.where(fn("DATE", col("MilkEntry.date")), "=", today)
    ]
  },
  group: ["Customer.customer_type"], // group by customer type
  raw: true
});
 
    // console.log('Today Totals:', todayTotals);
 
    // 👉 2. Monthly totals
 const monthTotals = await MilkEntry.findAll({
  attributes: [
    [sequelize.fn('YEAR', sequelize.col('MilkEntry.created_at')), 'year'],
    [sequelize.fn('MONTH', sequelize.col('MilkEntry.created_at')), 'month'],
    [sequelize.fn('DATE_FORMAT', sequelize.col('MilkEntry.created_at'), '%M'), 'month_name'],
    'note',
    [sequelize.fn('SUM', sequelize.col('MilkEntry.litres')), 'litres'],
    [sequelize.fn('SUM', sequelize.col('MilkEntry.amount')), 'amount'],
  ],
  include: [
    {
      model: Customer,
      where: { user_id: user.id },
    },
  ],
  group: ['year', 'month', 'note'],
});
 
    res.json({
      status: true,
      date: today,
      today: todayTotals,
      months: monthTotals
    });
  } catch (err) {
    console.error("Error in dairyReport:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};
 

const dairyPurchase = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(200).json({ status: false, message: "User not Found!" });
    }
    // Fetch all entries for this user
    const entries = await MilkEntry.findAll({
      where: { note: "Buy"},
      order: [['created_at', 'DESC']],
      include : [{
        model : Customer,
        where :{user_id: req.user.id,
          customer_type: 'Purchaser'          // 👈 only purchase customers,
        },
      }],
      raw: true
    });
    res.json({
      status: true,
      entries
    });
 
  } catch (err) {
    console.error("Error in dairyPurchase:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const dairySale = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(200).json({ status: false, message: "User not Found!" });
    }
    const entries = await MilkEntry.findAll({
      where: { note: "Sale"},
  order: [['created_at', 'DESC']], // latest entries first
  include: [
    {
      model: Customer,
      where: {
        user_id: req.user.id,
        customer_type: 'Seller'          // 👈 only purchase customers
      },
    },
  ],
  raw: true,
});
 
console.log('Fetched sale entries:', entries); // 👈 debug log
    res.json({
      status: true,
      entries
    });
 
  } catch (err) {
    console.error("Error in dairyPurchase:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const getPayments = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(200).json({ status: false, message: "User not found" });
    }

    // ✅ Read query params from frontend
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // default 20 per page
    const offset = (page - 1) * limit;

    const { count, rows: payments } = await MilkEntry.findAndCountAll({
      order: [["created_at", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: Customer,
          attributes: ["id", "name", "code"],
          where: { user_id: req.user.id , active_status: 1},
        },
      ],
    });

    if (!payments || payments.length === 0) {
      return res.status(200).json({
        status: false,
        message: "No payments found",
        payments: [],
        totalPages: 0,
        currentPage: page,
      });
    }

    return res.status(200).json({
      status: true,
      payments,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      message: "Payments fetched successfully",
    });
  } catch (error) {
    console.error("getPayments Error:", error.message);
    return res.status(200).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


const dairyProducts = async (req, res) => {
  try {
    const { id, productName, productUnit, price, stock } = req.body;
    const user_id = req.user.id;
 
    // ✅ Validation
    if (!productName || !productUnit || !price || !stock) {
      return res.status(400).json({ status: false, message: "All fields are required" });
    }
 
    let product;
 
    if (id) {
      const [updated] = await Product.update(
        {
          product_name: productName,
          product_unit: productUnit,
          product_price: price,
          stock,
        },
        {
          where: { id: id, user_id: user_id },
        }
      );
 
      if (updated === 0) {
        return res.status(404).json({ status: false, message: "Product not found or not yours" });
      }
 
      product = await Product.findOne({ where: { id, user_id } });
 
      return res.status(200).json({
        status: true,
        message: "Product updated successfully",
        product,
      });
    } else {
      // ✅ Insert new product
      product = await Product.create({
        user_id,
        product_name: productName,
        product_unit: productUnit,
        product_price: price,
        stock,
      }); 
      return res.status(200).json({
        status: true,
        message: "Product added successfully",
        product,
      });
    }
  } catch (error) {
    console.error("dairyProducts Error:", error.message);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
 

          const fetchProducts = async (req, res) => {
          try{
          const user_id = req.user.id; 
          if(! user_id){
            return res.status(200).json({status: false, message: "! Unauthrised User"});
          }
          const fetch = await Product.findAll({user_id:user_id
            })
              if (fetch) {
                return res.status(200).json({
                  status: true,
                  message: "Product added successfully",
                  product: fetch,        // better key name
                });
                } else {
                  return res.status(500).json({
                    status: false,
                    message: "Failed to insert product",
                  });
                }
                
                } catch(error){
                console.error("onCustomer Error:" ,error.message);
                return res.status(200).json({
                  status: false,
                  message: "Somethings went Wrong",
                  error: error.message,
                })
                }
              }

        const deleteproducts = async (req, res) => {
          const { id } = req.params;
          const user_id = req.user.id;
          try {
            const result = await Product.destroy({
              where: { id: id, user_id: user_id }
            });

            if (result === 0) {
              return res.status(404).json({ status: false, message: "Product not found" });
            }

            res.json({ status: true, message: "Product deleted successfully" });
          } catch (err) {
            console.error("Delete Error:", err);
            res.status(500).json({ status: false, message: "Server error" });
          }
        };

      const custprolist = async (req, res) => {
        try {
          const userId = req.user?.id;
          if (!userId) {
            return res.status(200).json({ success: false, message: "Unauthorized User" });
          }
          // fetch all customers for this user
          const customers = await Customer.findAll({ where: { user_id: userId, active_status: 1 } });
          const  products = await Product.findAll();

          return res.status(200).json({
            success: true,
            message: "Customer and Products fetched",
            customers,
            products,
          });   
        } catch (error) {
          console.error("custprolist error:", error);
          return res.status(500).json({ success: false, message: "Something went wrong" });
        }
      };



      const customerproducts = async (req, res) => {
        try {
          const { bill,  customer, product_id,transactionType, code , product_name, price, quantity, amount, stock, note} = req.body;       
          const user_id = req.user.id;
          if (!product_id || !price || !quantity || !amount) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
          }
           const customerid = await Customer.findOne({
                where: { code: code},
              
              });
          const c_id = customerid.id;
            
          const trx = await ProductTrx.create({
            bill: bill,
            user_id: user_id,
            product_id: product_id,
            customer_id: c_id,
            t_type: transactionType,
            product_name: product_name,
            price: price,
            quantity: quantity,
            amount: amount,
            stock: stock,
            code: code,
            note: note, // ✅ fixed
          });
          return res.status(201).json({
            success: true,
            message: "Transaction saved successfully",
            data: trx,
          });
        } catch (error) {
          console.error("customerproducts error:", error);
          return res.status(500).json({ success: false, message: "Fill All Details" });
        }
      };

      const transDetails = async (req, res) => {
          try {
            const userId = req.user.id;
            if (!userId) {
              return res.status(200).json({ success: false, message: "User Not Authenticated!" });
            }
            const user = await User.findOne({ where: { id: userId } });
            if (!user) {
              return res.status(200).json({ success: false, message: "User Not Found!" });
            }
            const { customerId, code, allEntries } = req.body; // 👈 from frontend
            let whereCondition = { user_id: userId };

            if (!allEntries) {
              // If specific customer is selected
              if (customerId) {
                whereCondition.customer_id = customerId;
              }
              if (code) {
                whereCondition.code = code;
              }
            }
            // Else keep only user_id to fetch all

            // Fetch customers for dropdown
            const customers = await Customer.findAll({
              where: { user_id: userId , active_status: 1},
            });

            // Fetch transactions based on condition
            const payments = await Transaction.findAll({
              where: whereCondition,
              raw: true,
            });
            const products = await ProductTrx.findAll({
              where: whereCondition,
              raw: true,
            });
            return res.status(200).json({
              success: true,
              customers,
              payments,
              products,
              message: "Data fetched successfully!",
            });
          } catch (error) {
            console.error("transDetails error:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
          }
        };


       
          const getCode = async (req, res) => {
            try {
              const user_id = req.user.id; 
              if(! user_id){
              return res.status(200).json({status: false, message: "! Unauthrised User"});
            }
              let account;

                account = await Customer.findAll({ where: { user_id: user_id , active_status: 1} });

              if (!account) {
                return res.status(200).json({ message: 'Not found' });
              }
              return res.status(200).json({success: true, message: 'data found', data: account });
            } catch (error) {
              console.error(error);
              return res.status(500).json({ success: false, message: 'Server error' });
            }
          };


          const createTransaction = async (req , res) =>{
            try {
              const { ac_no , code, amount, bill_date, remark} = req.body;
              if (!ac_no || !code || !amount || !bill_date || !remark) {
                return res.status(200).json({
                  success: false,
                  message: 'All fields are required (ac_no, code, amount, bill_date, mode)',
                });
              }

              const user_id = req.user.id;
                if(! user_id){
              return res.status(200).json({status: false, message: "! Unauthrised User"});
            }

              const transaction = await Transaction.create({
                user_id,
                customer_id:ac_no,
                code,
                amount,
                bill_date,
                remark
              });

              return res.status(200).json({
                success: true,
                message: 'Transaction created successfully',
                data: transaction,
              });
            } catch(e){
              console.error(e)
              return res.status(500).json({
                success:false,
                message:'Server Error',
              })
            }
          }


          const getMilkEntries = async (req, res) => {
              try {
              const customerId = req.query.customer_id;
              if (!customerId) {
                return res.status(200).json({ success: false, message: 'customer_id query parameter is required' });
              }
                const user_id = req.user?.id;
                if (!user_id) {
                  return res.status(200).json({ success: false, message: '! Unauthorized User' });
                }
              const entries = await MilkEntry.findAll({
              where: {
                customer_id: customerId,
            
              },
              order: [['date', 'DESC']], // sort by date descending
            });
            
                const customer = await Customer.findAll({
                  where: { id: customerId,active_status: 1 },
                });
                const payment = await Payment.findAll({
                  where: { customer_id: customerId },
                });
            
                  const productTransactions = await ProductTrx.findAll({
                  where: { customer_id: customerId },
                });
                return res.status(200).json({
                  success: true,
                  message: 'Milk entries fetched successfully',
                  data: entries,
                  customer: customer,
                  payment: payment,
                  productTransactions: productTransactions,
                });
            
              } catch (e) {
                console.error('Error fetching milk entries:', e);
                return res.status(500).json({
                  success: false,
                  message: 'Server Error',
                });
              }
            };

         const billReport = async (req, res) => {
            try {
              const { from, to } = req.body;
              console.log(`Generating bill report from ${from} to ${to}`);
              const user_id = req.user.id;
              if (!user_id) {
                return res.status(401).json({ success: false, message: "Unauthorized User" });
              }
              // ------------------ DATE FILTER ------------------
              const dateFilter = from && to ? { [Op.between]: [from, to] } : undefined;
 
              // ------------------ PAYMENTS ------------------
              const paymentWhere = { user_id };
              if (dateFilter) paymentWhere.date = dateFilter;
 
             const payments = await Payment.findAll({
  attributes: [
    "customer_id",
    // sum only payments of type 'receive'
    [
      fn(
        "SUM",
        literal(`
          CASE
            WHEN LOWER(TRIM(\`type\`)) = 'receive' THEN amount
            ELSE 0
          END
        `)
      ),
      "totalReceive"
    ],
    // sum only payments of type 'pay'
    [
      fn(
        "SUM",
        literal(`
          CASE
            WHEN LOWER(TRIM(\`type\`)) = 'pay' THEN amount
            ELSE 0
          END
        `)
      ),
      "totalPay"
    ]
  ],
  where: paymentWhere,
  include: [
    {
      model: Customer,
      attributes: ["id", "name", "code", "customerType"],
      where: { user_id },
    }
  ],
  group: ["Payment.customer_id", "Customer.id"],
  raw: true,
});

console.log('Payments Data:', payments);

 
              // ------------------ MILK ENTRIES ------------------
              const milkWhere = {};
              if (dateFilter) milkWhere.date = dateFilter;
 
             const milkData = await MilkEntry.findAll({
  attributes: [
    "customer_id",
    // total milk amount: +amount for seller, -amount for purchaser
    [
      fn(
        "SUM",
        literal(`
          CASE
            WHEN LOWER(TRIM(\`Customer\`.\`customer_type\`)) = 'Seller' THEN amount
            WHEN LOWER(TRIM(\`Customer\`.\`customer_type\`)) = 'Purchaser' THEN -amount
            ELSE 0
          END
        `)
      ),
      "totalMilk"
    ]
  ],
  where: milkWhere,
  include: [
    {
      model: Customer,
      attributes: ["id", "name", "code", "customer_type"],
      where: { user_id },
    }
  ],
  group: ["MilkEntry.customer_id", "Customer.id"],
  raw: true,
});

              console.log('Milk Data:', milkData);
 
              // ------------------ PRODUCT TRANSACTIONS ------------------
              const productWhere = { user_id };
              if (dateFilter) productWhere.bill = dateFilter;
 
            const productData = await ProductTrx.findAll({
                attributes: [
                  "customer_id",
                  // total purchase
                  [
                    fn(
                      "SUM",
                      literal(`
                        CASE
                          WHEN LOWER(TRIM(\`t_type\`)) = 'purchase' THEN amount
                          ELSE 0
                        END
                      `)
                    ),
                    "totalPurchase"
                  ],
                  // total sale
                  [
                    fn(
                      "SUM",
                      literal(`
                        CASE
                          WHEN LOWER(TRIM(\`t_type\`)) = 'sale' THEN amount
                          ELSE 0
                        END
                      `)
                    ),
                    "totalSale"
                  ],
                  // total = purchase - sale
                  [
                    literal(`
                      SUM(
                        CASE
                          WHEN LOWER(TRIM(\`t_type\`)) = 'purchase' THEN amount
                          WHEN LOWER(TRIM(\`t_type\`)) = 'sale' THEN -amount
                          ELSE 0
                        END
                      )
                    `),
                    "totalAmount"
                  ]
                ],
                where: productWhere,
                include: [
                  {
                    model: Customer,
                    attributes: ["id", "name", "code", "customer_type"],
                    where: { user_id },
                  }
                ],
                group: ["ProductTrx.customer_id", "Customer.id"],
                raw: true,
              });          
           
              console.log('Product Data:', productData);
              
              // ------------------ COMBINE LOGIC ------------------
              const report = {}; 
              const ensureCustomer = (item) => {
                const id = item["Customer.id"];
                if (!report[id]) {
                  report[id] = {
                    customer_id: id,
                    code: item["Customer.code"],
                    name: item["Customer.name"],
                    type: item["Customer.customer_type"], // "Seller" or "Purchaser"
                    milk_amount: 0,
                    product_purchase: 0,
                    product_sale: 0,
                     product_amount: 0,
                    payment: 0,
                  };
                }
                return report[id];
              };
 
               milkData.forEach(item => {
              const entry = ensureCustomer(item);
              const amt = parseFloat(item.totalMilk || 0);
              entry.milk_amount += amt;
            });

              // --- Add Product Data (merge into milk if needed) ---
              productData.forEach(item => {
                const entry = ensureCustomer(item);
                entry.product_amount += parseFloat(entry.product_amount|| 0);

                const amt = parseFloat(item.totalAmount || 0);
                console.log('Product Amount for customer', entry.name, ':', amt);
                entry.product_amount += amt;   // + for purchase, - for sale (already handled in SQL)
              
              });

              // --- Add Payment Data ---
              payments.forEach(item => {
                const entry = ensureCustomer(item);
                entry.total_receive = parseFloat(entry.total_receive || 0);
              entry.total_pay = parseFloat(entry.total_pay || 0);
                console.log('Payment for customer', entry.name, ': Receive', item.totalReceive, 'Pay', item.totalPay);
                entry.total_receive += parseFloat(item.totalReceive || 0);
                entry.total_pay += parseFloat(item.totalPay || 0);
              });
 
              // ------------------ FINAL CALCULATIONS ------------------
              const result = Object.values(report).map(r => {
                // let due = 0, product = 0, total = 0;
                console.log('Calculating for customer:', r);
              console.log('  Milk Amount:', (Number(r.milk_amount) || 0).toFixed(2));;
                const totalBalance = r.milk_amount;
                const totalDue = r.product_amount - totalBalance;
                const netPayment = (Number(r.total_receive) - Number(r.total_pay)) - totalDue;
                 console.log('  Total Balance:', totalBalance.toFixed(2));
                console.log('  Product Amount:', r.product_amount.toFixed(2));
                console.log('  Total Due:', totalDue.toFixed(2));
                console.log('  Net Payment:', netPayment.toFixed(2));
                
                // if (r.type === "Seller") {
                //   due = (r.milk_amount + r.product_purchase) - r.payment;
                //   product = r.product_sale;
                //   total = (r.milk_amount + r.product_purchase + r.product_sale) - r.payment;
                // } else if (r.type === "Purchaser") {
                //   due = (r.milk_amount + r.product_sale) - r.payment;
                //   product = r.product_purchase;
                //   total = (r.milk_amount + r.product_sale - r.product_purchase) - r.payment;
                // }
 
                return {
                  account_name: r.name,
                  payment: (Number(r.total_receive) - Number(r.total_pay) || 0).toFixed(2),
                  due: (totalDue || 0).toFixed(2),
                  product: (r.product_amount || 0).toFixed(2),
                  total: (netPayment || 0).toFixed(2),
                  type: r.type,
                };
              });
 
              // Separate sellers and purchasers (optional)
              const sellers = result.filter(r => r.type === "Seller");
              const purchasers = result.filter(r => r.type === "Purchaser");
 
              return res.status(200).json({
                success: true,
                sellers,
                purchasers,
                all: result, // optional if you want combined output
              });
 
            } catch (e) {
              console.error(e);
              return res.status(500).json({
                success: false,
                message: "Server Error",
                error: e.message,
              });
            }
          };
           
 
           const createPayment = async (req,res) =>{
            try{
              const{amount,customerId,type} = req.body;
              const user_id = req.user.id;
              if(!amount || !customerId || !type){
                return res.status(200).json({success: false, message: 'Amount, Customer ID and Type are required'});
              }
              const date = new Date().toISOString().split('T')[0];          
              const activeEntries = await MilkEntry.findAll({
            where: {
              customer_id: customerId,
              status: 'active', // only active ones
            },
          });
          
          // 2. If any active entries found, mark them inactive
          if (activeEntries.length > 0) {
            const test = await MilkEntry.update(
              { status: 'inactive' },
              { where: { customer_id: customerId, status: 'active' } }
            );
          }
          
          const activeProducts = await ProductTrx.findAll({
                where: { customer_id: customerId, status: 'active' }
              });
          
              if (activeProducts.length > 0) {
                await ProductTrx.update(
                  { status: 'inactive' },
                  { where: { customer_id: customerId, status: 'active' } }
                );
              }
            
          const payment = await Payment.create({
                user_id,
                customer_id: customerId,
                date,
                type: type,
                mode:  'cash',
                amount,
                note:'Payment made'
              });
          
              return res.status(200).json({success:true, message: 'Payment recorded', data: payment});
            }catch(e){
              console.error(e);
              return res.status(500).json({success: false, message: 'Server Error'});
            }
 
}
 


module.exports = {dairyReport, dairyPurchase,dairySale, getPayments,dairyProducts,fetchProducts,deleteproducts, custprolist,customerproducts, transDetails, getCode, createTransaction, getMilkEntries, billReport, createPayment};

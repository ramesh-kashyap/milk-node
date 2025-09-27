const sequelize = require('../config/connectDB');
const { QueryTypes, Op, fn, col, literal } = require('sequelize');
const bcrypt = require("bcryptjs");
const { User, MilkEntry, Payment,Transaction, Customer, Product, ProductTrx} = require('../models');
const { INSERT } = require('sequelize/lib/query-types');

const dairyReport = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(200).json({ status: false, message: "User not Found!" });
    }
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // 👉 1. Today’s total
    const todayTotals = await MilkEntry.findOne({
      attributes: [
        [fn("SUM", col("litres")), "litres"],
        [fn("SUM", col("amount")), "amount"]
      ],
      where: {
        customer_id: user.id,   // ✅ FIXED
        [Op.and]: sequelize.where(
          fn("DATE", col("created_at")),
          "=",
          today
        )
      },
      raw: true
    });

    // 👉 2. Monthly totals
    const monthlyTotals = await MilkEntry.findAll({
  attributes: [
    [fn("YEAR", col("created_at")), "year"],
    [fn("MONTH", col("created_at")), "month"],
    [fn("DATE_FORMAT", col("created_at"), "%M"), "month_name"],
    "note",
    [fn("SUM", col("litres")), "litres"],
    [fn("SUM", col("amount")), "amount"],
  ],
  where: { customer_id: user.id },
  group: ["year", "month", "note"],   // 👈 include note in group
  order: [[literal("year"), "DESC"], [literal("month"), "DESC"]],
  raw: true,
});
    res.json({
      status: true,
      date: today,
      today: todayTotals,
      months: monthlyTotals
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
      // where: {customer_id: user.id, note: "Buy"}, 
      order: [['created_at', 'DESC']],
      include : [{
        model : Customer,
        where :{user_id: req.user.id},
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
      // where: {customer_id: user.id, note: "Sale"}, 
      order: [['created_at', 'DESC']], // latest entries first
      include :[{
        model:Customer,
        where: {user_id: req.user.id},
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
          // console.log(transactionType,bill, note, customer, product_id, product_name, price, quantity, amount, stock);
        
          // const match = customer.match(/\(([^)]+)\)/);
          // const code = match ? match[1] : null;
          const user_id = req.user.id; 
          // validate required fields
          if (!product_id || !price || !quantity || !amount) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
          }
          const trx = await ProductTrx.create({
            bill: bill,
            user_id: user_id,
            product_id: product_id,
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
            const products = await Transaction.findAll({
              where: whereCondition,
              raw: true,
            });
            //  console.log(transactions);
            return res.status(200).json({
              success: true,
              customers,
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
          // console.log('Fetching milk entries for user:', req.user);
            const customerId = req.query.customer_id;
            if (!customerId) {
              return res.status(200).json({ success: false, message: 'customer_id query parameter is required' });
            }
              const user_id = req.user?.id;
              if (!user_id) {
                return res.status(200).json({ success: false, message: '! Unauthorized User' });
              }
          
            const entries = await MilkEntry.findAll({
                where: { customer_id: customerId },
                order: [['date', 'DESC']], 
              });  
          
              const customer = await Customer.findAll({
                where: { id: customerId , active_status: 1},
              
              });
              // console.log('Fetched entries:', entries);
              return res.status(200).json({
                success: true,
                message: 'Milk entries fetched successfully',
                data: entries,
                customer: customer,
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
                const user_id = req.user.id;

                if (!user_id) {
                  return res.status(401).json({ success: false, message: "Unauthorized User" });
                }

                const whereClause = { user_id };

                if (from && to) {
                  whereClause.date = {
                    [Op.between]: [from, to],  // 👈 filter by date range
                  };
                }

                const payments = await Payment.findAll({
                  attributes: [
                    "customer_id",
                    "type",
                    [fn("SUM", col("amount")), "totalAmount"],
                  ],
                  where: whereClause,
                  include: [
                    {
                      model: Customer,
                      attributes: ["id", "name", "code", "customerType"],
                      where: { user_id },
                    },
                  ],
                  group: ["customer_id", "type", "Customer.id"],
                  raw: true,
                });

                return res.status(200).json({
                  success: true,
                  data: payments,
                });
              } catch (e) {
                console.error(e);
                return res.status(500).json({
                  success: false,
                  message: "Server Error",
                });
              }
            };


module.exports = {dairyReport, dairyPurchase,dairySale, getPayments,dairyProducts,fetchProducts,deleteproducts, custprolist,customerproducts, transDetails, getCode, createTransaction, getMilkEntries, billReport};

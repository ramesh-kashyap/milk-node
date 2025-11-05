const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes ,Op } = require('sequelize');
const bcrypt = require("bcryptjs");
const { User,Customer,Payment,MilkRate ,MilkEntry } = require('../models');  // ✅ Correct way
const { customerCreateSchema,customerListSchema } = require('../validators/customer.schema');
const customer = require('../models/customer');

const  getUserDetails = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(200).json({
        status: false,
        message: "User not found",
      });
    }


    return res.status(200).json({
      status: true,
      message: "User details fetched successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        subscription: user.subscription_type,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("getUserDetails Error:", error.message);
    return res.status(200).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

function parseDecimalOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// CREATE
const  addCustomer = async (req, res) => {
  try {
    // console.log(req.body);
      const user = req.user;

      const data = customerCreateSchema.parse(req.body);
       // pre-check (fast fail)
      const exists = await Customer.findOne({ where: { code: data.code } });
      if (exists) {
        return res.status(200).json({
          status: false,
          message: `Customer code ${data.code} already exists.`,
        });
      }
    // business rules: if enabled, value required
    if (data.buffalo.enabled && parseDecimalOrNull(data.buffalo.value) === null) {
       return res.status(200).json({
        status: false,
        message: "Buffalo value required when enabled",
      });
    }
    if (data.cow.enabled && parseDecimalOrNull(data.cow.value) === null) {
       return res.status(200).json({
        status: false,
        message: "Cow value required when enabled",
      });
    }

    const created = await Customer.create({
      user_id: user.id,
      code: data.code,
      name: data.name,
      phone: data.phone || null,

      customerType: data.customerType,
      basis: data.basis,

      buffaloEnabled: data.buffalo.enabled,
      buffaloValue: parseDecimalOrNull(data.buffalo.value),

      cowEnabled: data.cow.enabled,
      cowValue: parseDecimalOrNull(data.cow.value),

      alertMethod: data.alertMethod,
      printSlip: data.printSlip,
    });

     return res.status(200).json({
      status: true,
      message: "Customer added successfully",
    });

  } catch (err) {
    console.error(err);
    if (err.name === 'ZodError') {
      return res.status(200).json({ error: err.flatten() });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// LIST via POST (filters in body)
const getCustomerList = async (req, res) => {
  try {
    const body = customerListSchema.parse({
      ...req.body,
      page: Number(req.body?.page ?? 1),
      limit: Number(req.body?.limit ?? 20),
    });

    const where = {};
    if (body.type) where.customerType = body.type;
    if (body.q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${body.q}%` } },
        { code: { [Op.like]: `%${body.q}%` } },
        { phone: { [Op.like]: `%${body.q}%` } },
      ];
    }

    const offset = (body.page - 1) * body.limit;

    const { rows, count } = await Customer.findAndCountAll({
      where,
      limit: body.limit,
      offset,
      order: [['created_at', 'DESC']],
    });

      return res.json({
        total: count,
        page: body.page,
        pageSize: body.limit,
        items: rows,
      });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION', details: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getUseron = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(200).json({
        status: false,
        message: "User not found",
      });
    }

    const customer = await Customer.findAll({
      where: { user_id: user.id }
    });

    if (!customer) {
      return res.status(200).json({
        status: false,
        message: "Customer not found"
      });
    }

    return res.status(200).json({
      status: true,
      message: "User details fetched successfully",
      customer
    });
  } catch (error) {
    console.error("getUserDetails Error:", error.message);
    return res.status(200).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const onCustomer = async (req, res) => {
  try {
    const {id, active} = req.body;
    const user = req.user;// will be 1 or 0
    if (!user) {
      return res.status(200).json({ status: false, message: "User not found" });
    }
    const [updated] = await Customer.update(
      { active_status: active }, // change to { status_active: active } if your DB column is status_active
      { where: { user_id: user.id , id : id} }
    );

    if (!updated) {
      return res.status(200).json({
        status: false,
        message: "Customer not found or not updated",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Customer status updated successfully",
    });
  } catch (error) {
    console.error("onCustomer Error:", error.message);
    return res.status(200).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// const transection = async (req, res) => {
//   try {
//     const {id, active} = req.body;
//     const user = req.user;// will be 1 or 0
//     if (!user) {
//       return res.status(200).json({ status: false, message: "User not found" });
//     }
//     const [updated] = await Customer.update(
//       { active_status: active }, // change to { status_active: active } if your DB column is status_active
//       { where: { user_id: user.id , id : id} }
//     );

//     if (!updated) {
//       return res.status(200).json({
//         status: false,
//         message: "Customer not found or not updated",
//       });
//     }

//     return res.status(200).json({
//       status: true,
//       message: "Customer status updated successfully",
//     });
//   } catch (error) {
//     console.error("onCustomer Error:", error.message);
//     return res.status(200).json({
//       status: false,
//       message: "Something went wrong",
//       error: error.message,
//     });
//   }
// };

const userDetails = async (req, res) => {
  try {
   const userId = req.user?.id;
    // validate required fields
    if (!userId) {
      return res.status(400).json({ success: false, message: "Unauthrised" });
    }
    const userDe = await User.findOne({where: {id:userId} });
    if(!userDe){
      return res.status(200).json({success: false, message: "!No User Data Found"});
    }
    return res.status(201).json({
      success: true,
      message: "Dairy Details fetch Successfully",
      data: userDe,
    });
  } catch (error) {
    console.error("customerproducts error:", error);
    return res.status(500).json({ success: false, message: "Fill All Details" });
  }
};

                const updateUserDetail = async (req, res) => {
                  try {
                    const userId = req.user?.id;
                    if (!userId) {
                      return res.status(400).json({ success: false, message: "Unauthorized" });
                    }
                    const { name, phone, address } = req.body;
                    const userDe = await User.findOne({ where: { id: userId } });
                    if (!userDe) {
                      return res
                        .status(200)
                        .json({ success: false, message: "No User Data Found" });
                    }
                    // Update only fields provided
                    if (name) userDe.name = name;
                    if (phone) userDe.phone = phone;
                    if (address) userDe.address = address;
                    await userDe.save();

                    return res.status(200).json({
                      success: true,
                      message: "Dairy details updated successfully",
                      data: userDe,
                    });
                  } catch (error) {
                    console.error("updateUserDetail error:", error);
                    return res.status(500).json({
                      success: false,
                      message: "Failed to update user details",
                    });
                  }
                };
              const saveMilkEntry = async (req, res) => {
                  console.log('saveMilkEntry body:', req.body);
                  try {
                    /**
                    * Expected body (from your Flutter payload):
                    * {
                    *   date: "2025-09-10",
                    *   session: "AM"|"PM",
                    *   customer_id: 123,
                    *   litres: 10.5,
                    *   fat: 7.5,
                    *   rate: 62.5,
                    *   amount: 656.25,
                    *   animal: "buffalo"|"cow",
                    *   basis: "fat"|"rate"|"fat_snf",
                    *   zero: false,
                    *   note: "optional"
                    * }
                    */
                    const {
                      customer_id, date, session, litres, fat,
                      rate, amount, animal, basis, zero
                    } = req.body;
                  console.log('check:',req.body);
                    if (!customer_id || !date || !session || !animal || !basis) {
                      return res.status(400).json({ status: false, message: 'Missing required fields' });
                    }
                
                    const getType = await Customer.findOne({ where: { id: customer_id },attributes: ['customer_type'],raw: true });
                      console.log('Customer Type:', getType);
                      let note = getType.customer_type === 'Seller' ? 'Sale':'Buy';
                
                    const entry = await MilkEntry.create({
                      customer_id,
                      date,
                      session,
                      litres,
                      status: 'active', 
                      fat,
                      rate,
                      amount,
                      animal,
                      note: note ?? null,
                      // you can add `basis` and `zero` if you add those columns in milk_entries table
                      // basis,
                      // zero
                    });
                
                    return res.status(200).json({
                      status: true,
                      message: 'Milk entry saved',
                      data: entry,
                    });
                  } catch (err) {
                    console.error('saveMilkEntry error:', err);
                    return res.status(500).json({ status: false, message: 'Server error' });
                  }
                };

             const bulkEntryCustomer = async (req, res) => {
              try{                
                const userId = req.user?.id;
                if (!userId) {
                  return res.status(200).json({success:false, message:"! Unauthrised"});
                }
                 const customers = await Customer.findAll({where: { user_id: userId }, order: [['id', 'DESC']],});
                //  console.log(customers);
                if(!customers || customers.length === 0){
                  return res.status(200).json({success:false, message: "Customers Not found"});
                }
                return res.status(200).json({success:true, customers:customers});

              }
              catch(error){
               return res.status(200).json({success: false, message: "somthings wrong"});
              }
             }



            const bulkEntry = async (req, res) => {
              console.log("🧾 Incoming Body:", req.body);
              try {
                const { code, liters,  fat: inputFat, snf, session, note } = req.body;
                const userId = req.user?.id;

                if (!userId) {
                  return res.status(200).json({ success: false, message: "Unauthorized" });
                }

                const customer = await Customer.findOne({ where: { code } });
                if (!customer) {
                  return res.status(200).json({ success: false, message: "Customer not found" });
                }
                // 🐄 Determine animal
                let fat = inputFat;
                let animal = "";
                  if (customer.buffaloEnabled && customer.cowEnabled) {
                    animal = "buffalo"; // default to buffalo if both are enabled
                    fat = customer.buffaloValue;
                  } else if (customer.buffaloEnabled) {
                    animal = "buffalo";
                    fat = customer.buffaloValue;
                  } else if (customer.cowEnabled) {
                    animal = "cow";
                    fat = customer.cowValue;
                  } else {
                    return res.status(200).json({ success: false, message: "No animal enabled for this customer" });
                  }
                console.log(animal, customer.basis);
                // 🧮 Get Milk Rate by animal and basis
                const milkRate = await MilkRate.findOne({
                  where: { animal, basis: customer.basis },
                });
                console.log(milkRate);
                if (!milkRate) {
                  return res.status(200).json({ success: false, message: "Milk rate not found" });                 
                }
                 
                // 💰 Calculate rate and amount
                let rate = 0;
                let amount = 0;

                switch (customer.basis.toLowerCase()) {
                  case "rate":
                    rate = customer.rate ?? milkRate.fixed_rate ?? 0;
                    amount = parseFloat(liters) * rate;
                    break;

                  case "fat":
                    rate = milkRate.fat_rate ?? 0;
                    amount = parseFloat(liters) * rate;
                    break;

                  case "fatsnf":
                    rate = milkRate.fat_rate + (milkRate.snf_rate ?? 0);
                    amount =
                      parseFloat(liters) * milkRate.fat_rate +
                      (parseFloat(snf) || 0) * (milkRate.snf_rate || 0);
                    break;

                  default:
                    rate = 0;
                    amount = 0;
                }
                console.log(amount)
                const data = {
                customer_id: customer.id,
                date: new Date().toISOString().split("T")[0],
                session: session || "AM",
                litres: liters,
                fat: fat,
                snf: snf ?? null,
                rate: rate,
                status: "Active",
                amount: amount,
                animal: animal,
                note: note || "Sale",
                created_at: new Date(),
                updated_at: new Date(),
              };
                console.log(data);
                // 🧾 Insert Milk Entry
                const newEntry = await MilkEntry.create(data);

                return res.status(200).json({
                  success: true,
                  message: "Milk entry saved successfully",
                  data: newEntry,
                });
              } catch (error) {
                console.error("❌ Error in bulkEntry:", error);
                return res.status(200).json({
                  success: false,
                  message: "Something went wrong",
                  error: error.message,
                });
              }
            };


            const getDefaultsrates = async (req, res) => {
              try {
                const rows = await MilkRate.findAll({
                  order: [['updated_at', 'DESC'], ['created_at', 'DESC']],
                });
            
                const data = {};
                for (const r of rows) {
                  const a = r.animal;   // buffalo | cow
                  const b = r.basis;    // rate | fat | fat_snf
                  if (!data[a]) data[a] = {};
                  if (!data[a][b]) {
                    data[a][b] = {
                      fixed_rate: Number(r.fixed_rate || 0),
                      fat_rate:   Number(r.fat_rate   || 0),
                      snf_rate:   Number(r.snf_rate   || 0),
                    };
                  }
                }
            
                return res.status(200).json({ status: true, data });
              } catch (err) {
                console.error('getDefaultsrates error:', err);
                return res.status(500).json({ status: false, message: 'Failed to load rates' });
              }
            };
            const saveDefaultsrate = async (req, res) => {
            try {
                const { bm_fat_rate, cm_fat_rate, bm_fixed_rate, cm_fixed_rate } = req.body;        
                const updates = [
                  { animal: "buffalo", basis: "fat",  fat_rate: bm_fat_rate },
                  { animal: "buffalo", basis: "rate", fixed_rate: bm_fixed_rate },
                  { animal: "cow",     basis: "fat",  fat_rate: cm_fat_rate },
                  { animal: "cow",     basis: "rate", fixed_rate: cm_fixed_rate },
                ];
            
                for (const u of updates) {
                  if (u.fat_rate == null && u.fixed_rate == null) continue;
                  const [row] = await MilkRate.findOrCreate({
                    where: { animal: u.animal, basis: u.basis },
                    defaults: { fat_rate: 0, snf_rate: 0, fixed_rate: 0 },
                  });
                  await row.update({
                    fat_rate:   u.fat_rate   ?? row.fat_rate,
                    fixed_rate: u.fixed_rate ?? row.fixed_rate,
                  });
                }
            
                return res.json({ status: true, message: "Rates saved" });
              } catch (err) {
                console.error("save error:", err);
                return res.status(500).json({ status: false, message: "Failed to save rates" });
              }
            };
           const saveFatSnfRates = async (req, res) => {
              try {
                const {
                  buffalo_fat_rate,
                  buffalo_snf_rate,
                  cow_fat_rate,
                  cow_snf_rate,
                  buffalo_fixed_rate,
                  cow_fixed_rate,
                } = req.body;
            
            
                // Utility to update only if value is provided
                const updateRate = async (animal, basis, fatRate, snfRate, fixedRate) => {
                  const row = await MilkRate.findOne({ where: { animal, basis } });
                  if (!row) return 'not_found';
            
                  const updates = {};
                  if (fatRate !== undefined && fatRate !== null) updates.fat_rate = fatRate;
                  if (snfRate !== undefined && snfRate !== null) updates.snf_rate = snfRate;
                  if (fixedRate !== undefined && fixedRate !== null) updates.fixed_rate = fixedRate;
            
                  if (Object.keys(updates).length > 0) {
                    await row.update(updates);
                    return 'updated';
                  }
            
                  return 'no_change';
                };
            
                await updateRate('buffalo', 'fat_snf', buffalo_fat_rate, buffalo_snf_rate, buffalo_fixed_rate);
                await updateRate('cow', 'fat_snf', cow_fat_rate, cow_snf_rate, cow_fixed_rate);
            
                return res.json({
                  status: true,
                  message: 'Rates updated successfully',
                });
              } catch (err) {
                console.error('Save Fat/SNF Error:', err);
                return res.status(500).json({
                  status: false,
                  message: 'Failed to save rates',
                });
              }
            };
            
           const getAllMilkRates = async (req, res) => {
              try {
                const rows = await MilkRate.findAll({
                  order: [['updated_at', 'DESC'], ['created_at', 'DESC']],
                });
                const data = {};            
                for (const r of rows) {
                  const animal = r.animal; // buffalo | cow
                  const basis = r.basis;   // rate | fat | fat_snf            
                  if (!data[animal]) data[animal] = {};
                  if (!data[animal][basis]) data[animal][basis] = [];
            
                  data[animal][basis].push({
                    fixed_rate: r.fixed_rate !== null ? Number(r.fixed_rate) : null,
                    fat_rate:   r.fat_rate   !== null ? Number(r.fat_rate) : null,
                    snf_rate:   r.snf_rate   !== null ? Number(r.snf_rate) : null,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                  });
                }
            
                return res.status(200).json({ status: true, data });
              } catch (err) {
                console.error('getAllMilkRates error:', err);
                return res.status(500).json({ status: false, message: 'Failed to load rates' });
              }
            };


            const updateCustomer = async (req, res) => {
                        try {
                          const { name, code ,cowEnabled ,buffaloEnabled,cowValue,buffaloValue,basis} = req.body;                      
                          // Parse and validate input with Zod                 
                      
                        
                          // Find the customer by ID (or code)
                          const customer = await Customer.findOne({
                            where: { code: code }
                          });
                      
                          if (!customer) {
                            return res.status(200).json({
                              status: false,
                              message: "Customer not found",
                            });
                          }
                      
                          // ✅ Pre-check business rules
                          if (buffaloEnabled === null) {
                            return res.status(200).json({
                              status: false,
                              message: "Buffalo value required when enabled",
                            });
                          }
                      
                          if (cowEnabled === null) {
                            return res.status(200).json({
                              status: false,
                              message: "Cow value required when enabled",
                            });
                          }
                      
                          let cowEnableds = 0;
                          let buffaloEnableds =0;
                      
                          if (cowEnabled) {
                            cowEnableds = 1;
                          }
                      
                          if (buffaloEnabled) {
                            buffaloEnableds = 1;
                          }
                      
                          // ✅ Update customer
                          await customer.update({
                            basis: basis, 
                            buffaloEnabled: buffaloEnableds,
                            buffaloValue: parseDecimalOrNull(buffaloValue) ?? null, 
                            cowEnabled: cowEnableds,
                            cowValue: parseDecimalOrNull(cowValue) ?? null, 
                          });
                      
                          return res.status(200).json({
                            status: true,
                            message: "Customer updated successfully",
                            customer,
                          });
                      
                        } catch (err) {
                        console.error(err);
                    updateCustomer
                        if (err.name === "ZodError") {
                          return res.status(200).json({ error: err.flatten() });
                        }
                    
                        return res.status(500).json({ error: "Internal server error" });
                      }
            };
 
 

module.exports = { getUserDetails,addCustomer,getCustomerList,getUseron,onCustomer,userDetails,updateUserDetail,saveMilkEntry,getDefaultsrates,saveDefaultsrate, saveFatSnfRates ,getAllMilkRates, updateCustomer, bulkEntryCustomer, bulkEntry};

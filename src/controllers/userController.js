const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes ,Op } = require('sequelize');
const bcrypt = require("bcryptjs");
const { User,Customer,Payment,MilkRate ,MilkEntry } = require('../models');  // ✅ Correct way
const { customerCreateSchema,customerListSchema } = require('../validators/customer.schema');

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
                const {customer_id, date, session, litres, fat, rate, amount, animal, basis, zero, note} = req.body;
            
                if (!customer_id || !date || !session || !animal || !basis) {
                  return res.status(400).json({ status: false, message: 'Missing required fields' });
                }
                const entry = await MilkEntry.create({
                  customer_id,
                  date,
                  session,
                  litres,
                  fat,
                  rate,
                  amount,
                  animal,
                  note: note ?? null,
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
            
                console.log(bm_fat_rate, cm_fat_rate, bm_fixed_rate, cm_fixed_rate);
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



module.exports = { getUserDetails,addCustomer,getCustomerList,getUseron,onCustomer,userDetails,updateUserDetail,saveMilkEntry,getDefaultsrates,saveDefaultsrate };

const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes ,Op } = require('sequelize');
const bcrypt = require("bcryptjs");
const { User,Customer,Payment } = require('../models');  // ✅ Correct way
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
  console.log(req.body);
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


module.exports = { getUserDetails,addCustomer,getCustomerList,getUseron,onCustomer,userDetails };

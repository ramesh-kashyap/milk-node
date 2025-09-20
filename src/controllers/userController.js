const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes ,Op } = require('sequelize');
const bcrypt = require("bcryptjs");
const { User,Customer,MilkRate,MilkEntry } = require('../models');  // ✅ Correct way
const { customerCreateSchema,customerListSchema } = require('../validators/customer.schema');

const  getUserDetails = async (req, res) => {
  try {
    // ✅ req.user is set in authMiddleware
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


const r2 = (n) => Number.parseFloat(n ?? 0).toFixed ? Number(Number(n).toFixed(2)) : 0;

async function getRateRow(animal, basis) {
  // Pick the row for this animal + basis from milk_rates
  const row = await MilkRate.findOne({ where: { animal, basis } });
  if (!row) return { fat_rate: 0, snf_rate: 0, fixed_rate: 0 };
  return {
    fat_rate:   Number(row.fat_rate || 0),
    snf_rate:   Number(row.snf_rate || 0),
    fixed_rate: Number(row.fixed_rate || 0),
  };
}

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
    const {
      customer_id, date, session, litres, fat,
      rate, amount, animal, basis, zero, note
    } = req.body;

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

const deleteCustomer = async (req, res) => {
  try {
    const user = req.user; // from auth middleware
    const { id, code } = req.body;

    if (!id && !code) {
      return res.status(200).json({
        status: false,
        message: "Either id or code is required",
      });
    }

    // Look up record belonging to this user
    const where = {
      user_id: user.id,
      ...(id ? { id } : { code }),
    };

    const customer = await Customer.findOne({ where });

    if (!customer) {
      return res.status(200).json({
        status: false,
        message: "Customer not found",
      });
    }

    // Delete it (hard delete)
    await customer.update({ isDeleted: true });

    return res.status(200).json({
      status: true,
      message: "Customer deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);

    if (
      err.name === "SequelizeForeignKeyConstraintError" ||
      err.name === "SequelizeDatabaseError"
    ) {
      return res.status(200).json({
        status: false,
        message:
          "Unable to delete: this customer has linked records. Remove those first.",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const getCustomerList = async (req, res) => {
  try {
    const user = req.user; // from auth middleware
    const body = customerListSchema.parse({
      ...req.body,
      page: Number(req.body?.page ?? 1),
      limit: Number(req.body?.limit ?? 20),
      // optional: includeDeleted: boolean in schema if you want
    });

    // clamp pagination a bit (optional)
    const page  = Math.max(1, body.page || 1);
    const limit = Math.min(100, Math.max(1, body.limit || 20));
    const offset = (page - 1) * limit;

    // base where: user scope + soft-delete
    const where = {
      user_id: user.id,
      ...(body.includeDeleted ? {} : { isDeleted: false }),
    };

    // type filter
    if (body.type) where.customerType = body.type;

    // search filter (escape % and _ to avoid wildcards from user input)
    if (body.q) {
      const q = String(body.q).trim();
      const esc = q.replace(/[%_]/g, m => '\\' + m);
      const like = { [Op.like]: `%${esc}%` };
      where[Op.or] = [
        { name: like },
        { code: like },
        { phone: like },
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']], // ensure this column exists; otherwise use 'createdAt'
      // distinct: true, // uncomment if you add joins/associations later
    });

    return res.json({
      total: count,
      page,
      pageSize: limit,
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


module.exports = { getUserDetails,addCustomer,getCustomerList,deleteCustomer,getDefaultsrates,saveDefaultsrate,saveMilkEntry };


const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require('../config/connectDB');
// Import models
const User           = require('./user')(sequelize);
const Customer       = require('./customer')(sequelize);
const MembershipPlan = require('./membershipPlan')(sequelize);
const Subscription   = require('./subscription')(sequelize);
const Invoice        = require('./invoice')(sequelize);
const Product        = require('./product')(sequelize);
const MilkEntry      = require('./milkEntry')(sequelize);
const Payment        = require('./payment')(sequelize);
const Transaction        = require('./transaction')(sequelize);
const ProductTrx        = require('./dairyTransection')(sequelize);

// Associations
Customer.hasMany(MilkEntry,   { foreignKey: 'customer_id' });
MilkEntry.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(Payment,     { foreignKey: 'customer_id' });
Payment.belongsTo(Customer,   { foreignKey: 'customer_id' });

Customer.hasMany(Subscription,{ foreignKey: 'customer_id' });
Subscription.belongsTo(Customer,{ foreignKey: 'customer_id' });

MembershipPlan.hasMany(Subscription,{ foreignKey: 'plan_id' });
Subscription.belongsTo(MembershipPlan,{ foreignKey: 'plan_id' });

Subscription.hasMany(Invoice, { foreignKey: 'subscription_id' });
Invoice.belongsTo(Subscription,{ foreignKey: 'subscription_id' });

MembershipPlan.hasMany(Invoice,{ foreignKey: 'plan_id' });
Invoice.belongsTo(MembershipPlan,{ foreignKey: 'plan_id' });

// In models/customer.js
Customer.hasMany(Transaction, { foreignKey: "customer_id" });
Transaction.belongsTo(Customer, { foreignKey: "customer_id" });



// Optional: Payment → Invoice (nullable)
Invoice.hasMany(Payment,      { foreignKey: 'invoice_id' });
Payment.belongsTo(Invoice,    { foreignKey: 'invoice_id' });

module.exports = {
  sequelize,
  User,
  Customer,
  MembershipPlan,
  Subscription,
  Invoice,
  Product,
//   Bill,
//   BillItem,
Transaction,
  MilkEntry,
  ProductTrx,
  Payment
};
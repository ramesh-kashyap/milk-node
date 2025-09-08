// models/subscription.js
const { DataTypes } = require('sequelize');
const { addMonths } = require('date-fns');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    customer_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    plan_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    status: { type: DataTypes.ENUM('active','past_due','canceled','expired'), defaultValue: 'active' },
    starts_at: { type: DataTypes.DATE, allowNull: false },
    ends_at: { type: DataTypes.DATE, allowNull: false },
    auto_renew: { type: DataTypes.BOOLEAN, defaultValue: true },
    canceled_at: { type: DataTypes.DATE }
  }, { tableName: 'subscriptions', underscored: true, timestamps: true });

  // Helper to initialize ends_at if not set (requires eager-loaded plan or pass months)
  Subscription.beforeValidate(async (sub, opts) => {
    if (!sub.ends_at && sub.starts_at && sub.plan_id) {
      // fetch plan to get interval_months if not provided
      const Plan = sequelize.models.MembershipPlan;
      const plan = sub.plan || (await Plan.findByPk(sub.plan_id));
      if (plan) sub.ends_at = addMonths(new Date(sub.starts_at), plan.interval_months);
    }
  });

  return Subscription;
};
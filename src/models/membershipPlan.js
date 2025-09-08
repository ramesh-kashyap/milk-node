// models/membershipPlan.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MembershipPlan', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(60), allowNull: false }, // Monthly, Quarterly, Yearly
    interval: { type: DataTypes.ENUM('monthly','quarterly','yearly'), allowNull: false },
    interval_months: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false }, // 1/3/12
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    currency: { type: DataTypes.CHAR(3), defaultValue: 'INR' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'membership_plans', underscored: true, timestamps: true });
};
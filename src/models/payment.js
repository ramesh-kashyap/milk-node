// models/payment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, // seller or buyer
    // invoice_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },   // optional link
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.ENUM('pay','receive'), allowNull: false },  // dairy perspective
    mode: { type: DataTypes.ENUM('cash','upi','bank'), defaultValue: 'cash' },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    note: { type: DataTypes.STRING(180) }
  }, { tableName: 'payments', underscored: true, timestamps: true });

  return Payment;
};
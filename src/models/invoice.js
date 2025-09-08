// models/invoice.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    subscription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    plan_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    number: { type: DataTypes.STRING(30), unique: true },
    billed_for_start: { type: DataTypes.DATE, allowNull: false },
    billed_for_end: { type: DataTypes.DATE, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    status: { type: DataTypes.ENUM('unpaid','paid','void'), defaultValue: 'unpaid' },
    issued_at: { type: DataTypes.DATE, allowNull: false },
    paid_at: { type: DataTypes.DATE },
    note: { type: DataTypes.STRING(180) }
  }, { tableName: 'invoices', underscored: true, timestamps: true });

  return Invoice;
};
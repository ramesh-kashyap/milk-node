// models/transaction.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/connectDB');
module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    user_id: { type: DataTypes.INET(20), allowNull: false },
    customer_id: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    bill_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'transactions',
    underscored: true,
    timestamps: true, // created_at and updated_at
  });

  return Transaction;
};

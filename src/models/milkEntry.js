// models/milkEntry.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MilkEntry = sequelize.define('MilkEntry', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    customer_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, // seller
    date: { type: DataTypes.DATEONLY, allowNull: false },
    session: { type: DataTypes.ENUM('AM','PM'), allowNull: false },
    litres: { type: DataTypes.DECIMAL(8,2), allowNull: false },
    fat: { type: DataTypes.DECIMAL(4,2) },
    snf: { type: DataTypes.DECIMAL(4,2) },
    rate: { type: DataTypes.DECIMAL(6,2), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    animal: { type: DataTypes.ENUM('cow','buffalo'), allowNull: false },
    note: { type: DataTypes.STRING(180) }
  }, { tableName: 'milk_entries', underscored: true, timestamps: true });


  return MilkEntry;
};
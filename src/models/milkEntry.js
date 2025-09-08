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

  // Guard: only sellers can have milk entries; also compute amount if not set
  MilkEntry.beforeValidate(async (entry) => {
    const Customer = sequelize.models.Customer;
    const c = await Customer.findByPk(entry.customer_id, { attributes: ['id','type'] });
    if (!c || c.type !== 'seller') throw new Error('Milk entry must belong to a seller customer');
    if ((entry.rate ?? null) != null && (entry.litres ?? null) != null) {
      entry.amount = Number(entry.rate) * Number(entry.litres);
    }
  });

  return MilkEntry;
};
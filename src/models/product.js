// models/product.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    unit: { type: DataTypes.STRING(20), defaultValue: 'kg' },
    rate: { type: DataTypes.DECIMAL(8,2), allowNull: false }
  }, { tableName: 'products', underscored: true, timestamps: true });
};
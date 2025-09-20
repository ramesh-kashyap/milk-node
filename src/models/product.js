// models/product.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id :{type: DataTypes.BIGINT.UNSIGNED, autoIncrement: false},
    product_name: { type: DataTypes.STRING(100), allowNull: false },
    product_unit: { type: DataTypes.STRING(20), defaultValue: 'kg' },
    rate: { type: DataTypes.DECIMAL(8,2), allowNull: true},
    product_price: { type: DataTypes.INTEGER(8,2), allowNull: false},
    stock: {type: DataTypes.INTEGER(8,2), allowNull: false},
  }, { tableName: 'dairy_product', underscored: true, timestamps: true });
  return Product;
};
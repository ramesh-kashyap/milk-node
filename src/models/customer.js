// models/customer.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Customer = sequelize.define('Customer', {
    user_id: { type: DataTypes.INET(20), allowNull: false },
    code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    customerType: { type: DataTypes.ENUM('Seller', 'Purchaser'), allowNull: false },
    basis: { type: DataTypes.ENUM('fat', 'rate', 'fatSnf'), allowNull: false, defaultValue: 'fat' },
    buffaloEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    buffaloValue: { type: DataTypes.DECIMAL(6, 2) },
    snfValue: { type: DataTypes.DECIMAL(6, 2) },
    cowEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  
    cowValue: { type: DataTypes.DECIMAL(6, 2) },
    alertMethod: {
      type: DataTypes.ENUM('No Alerts', 'SMS', 'WhatsApp', 'Phone Call'),
      allowNull: false,
      defaultValue: 'No Alerts'
    },
    printSlip: {
      type: DataTypes.ENUM('Default', 'Compact', 'Detailed', 'None'),
      allowNull: false,
      defaultValue: 'Default'
    },
  }, {
    tableName: 'customers',
    underscored: true,
  });

  return Customer;
};
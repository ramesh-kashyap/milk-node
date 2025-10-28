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
    cowEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    cowValue: { type: DataTypes.DECIMAL(6, 2) },
    alertMethod: {
       type: DataTypes.ENUM('no_alerts', 'sms', 'whatsapp', 'phone_call'),
      allowNull: false,
      defaultValue: 'no_alerts'
    },
    active_status: {
      type: DataTypes.ENUM('0', '1',),
      allowNull: false,
      defaultValue: '1'
    },
    printSlip: {
      type: DataTypes.ENUM('default','compact','detailed','none'),
      allowNull: false,
      defaultValue: 'default'
    },
  }, {
    tableName: 'customers',
    underscored: true,
  });

  

  return Customer;

};
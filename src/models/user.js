// models/user.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { 
      type: DataTypes.BIGINT.UNSIGNED, 
      autoIncrement: true, 
      primaryKey: true 
    },
    name: { 
      type: DataTypes.STRING(100), 
      allowNull: false 
    },
     address: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    phone: { 
      type: DataTypes.STRING(20), 
      unique: true, 
      allowNull: false 
    },
    role: { 
      type: DataTypes.ENUM('admin','staff'), 
      defaultValue: 'staff' 
    },

    // OTP fields
    otp_code: { 
      type: DataTypes.STRING(6), 
      allowNull: true 
    },
    otp_expires_at: { 
      type: DataTypes.DATE, 
      allowNull: true 
    }

  }, { 
    tableName: 'users', 
    underscored: true, 
    timestamps: true 
  });

  return User;
};
// models/MilkRate.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MilkRate = sequelize.define(
    "MilkRate",
    {
      animal: {
        type: DataTypes.ENUM("buffalo", "cow"),
        allowNull: false,
        unique: true,
      },
      basis: {
        type: DataTypes.ENUM("rate", "fat", "fat_snf"),
        allowNull: false,
        defaultValue: "rate",
      },
      fat_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      snf_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      fixed_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "milk_rates",
      underscored: true,
    }
  );

  return MilkRate;
};
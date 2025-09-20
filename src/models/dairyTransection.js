const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductTrx = sequelize.define('ProductTrx', {
    id: { 
      type: DataTypes.BIGINT.UNSIGNED, 
      autoIncrement: true, 
      primaryKey: true 
    },
    user_id: { 
      type: DataTypes.BIGINT.UNSIGNED, 
      allowNull: true 
    },
    bill: { 
      type: DataTypes.BIGINT.UNSIGNED, 
      allowNull: true 
    },
    product_id: { 
      type: DataTypes.INTEGER, 
      allowNull: true 
    },
    product_name: { 
      type: DataTypes.STRING(100), 
      allowNull: true 
    },
    price: { 
      type: DataTypes.DECIMAL(8, 2), 
      allowNull: true 
    },
    stock: { 
      type: DataTypes.INTEGER, 
      allowNull: true 
    },
    price: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  }, { 
    tableName: 'product_transactions',
    underscored: true,
    timestamps: true
  });

  return ProductTrx;
};

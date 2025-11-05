const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes ,Op } = require('sequelize');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require('../models');  // ✅ Correct way
const express = require('express');
// const bodyParser = require('body-parser')
const { PasswordReset } = require('../models');
const { sendEmail } = require('../services/userService');


// Export function

function verificationCode(length) {
    if (length <= 0) return 0;
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// Send OTP Function
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(200).json({
        message: 'Phone number is required!',
        status: false,
      });
    }

    // Find or create user by phone
    let user = await User.findOne({ where: { phone } });
    if (!user) {
      user = await User.create({
        name: `User-${phone.slice(-4)}`,
        phone,
        role: 'staff'
      });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // valid for 5 min

    // Save OTP & expiry
    await user.update({ otp_code: otp, otp_expires_at: expiry });

    console.log(`📲 OTP for ${phone} is ${otp}`);

    return res.status(200).json({
      message: 'OTP sent successfully!',
      status: true,
    });

  } catch (error) {
    console.error("sendOtp Error:", error.message);
    return  res.status(200).json({
      message: error.message,
      status: false,
    });
  }
};

// Verify OTP and Login Function
const login = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(200).json({
        message: 'Phone and OTP are required!',
        status: false,
      });
    }

    // Find user
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return  res.status(200).json({
        message: 'User not found!',
        status: false,
      });
    }

    // Check OTP
    if (user.otp_code !== otp) {
      return res.status(200).json({
        message: 'Invalid OTP!',
        status: false,
      });
    }

    if (!user.otp_expires_at || new Date() > new Date(user.otp_expires_at)) {
      return res.status(200).json({
        message: 'OTP expired!',
        status: false,
      });
    }

    // Clear OTP after success
    await user.update({ otp_code: null, otp_expires_at: null });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '30d' }
    );
    // console.log("thsi is the token",token);
    return res.status(200).json({
      message: 'Login successful!',
      status: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      token
      
    });

  } catch (error) {
    console.error("Login Error:", error.message);
    return  res.status(200).json({
      message: error.message,
      status: false,
    });
  }
};


// POST /complete-profile
const completeProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware
    const { name, address } = req.body;

    console.log(userId);
    

    if (!name || !address) {
      return res.status(200).json({
        status: false,
        message: "Name and address are required!",
      });
    }

    // find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(200).json({
        status: false,
        message: "User not found!",
      });
    }

    // update profile
    await user.update({ name, address });

    return res.json({
      status: true,
      message: "Account Created successfully!",
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        address: user.address,
      },
    });
  } catch (error) {
    console.error("completeProfile Error:", error.message);
    return res.status(200).json({
      status: false,
      message: error.message,
    });
  }
};




// POST /logout
const logout = async (req, res) => {
  try {
    // If using JWT → optional: blacklist the token
    // For now, just tell client to clear it
    return res.json({ status: true, message: "Logged out successfully" });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};






module.exports = { sendOtp,login , logout , completeProfile };


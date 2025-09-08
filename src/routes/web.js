const express = require('express');
let router = express.Router();

const userController = require("../controllers/userController");
const AuthController = require("../controllers/AuthController");
const authMiddleware = require("../middleware/authMiddleware");


router.post('/sendOtp', AuthController.sendOtp);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/complete-profile', authMiddleware, AuthController.completeProfile);

router.get("/auth/me", authMiddleware, userController.getUserDetails);
router.post("/addCustomer", authMiddleware, userController.addCustomer);
router.post("/customers/list", authMiddleware, userController.getCustomerList);



// Mount the router on /api/auth so that /register becomes /api/auth/register
const initWebRouter = (app) => {
    app.use('/api/auth', router);
  };

  module.exports = initWebRouter;

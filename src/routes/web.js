const express = require('express');
let router = express.Router();

const userController = require("../controllers/userController");
const AuthController = require("../controllers/AuthController");
const authMiddleware = require("../middleware/authMiddleware");
const DairyController = require("../controllers/DairyController");

router.post('/sendOtp', AuthController.sendOtp);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/complete-profile', authMiddleware, AuthController.completeProfile);

router.get("/auth/me", authMiddleware, userController.getUserDetails);
router.get("/userOn", authMiddleware, userController.getUseron);
router.post("/onCustomer", authMiddleware, userController.onCustomer);
router.post("/addCustomer", authMiddleware, userController.addCustomer);
router.post("/customers/list", authMiddleware, userController.getCustomerList);
router.get("/dairyreport", authMiddleware, DairyController.dairyReport);
router.get("/dairypurchase", authMiddleware, DairyController.dairyPurchase);
router.get("/dairysale", authMiddleware, DairyController.dairySale);

router.post("/dairyProducts", authMiddleware, DairyController.dairyProducts);
router.get("/fetchProducts", authMiddleware, DairyController.fetchProducts);

router.get("/paymentslip", authMiddleware, DairyController.getPayments);
router.post("/dairyProducts/:id", authMiddleware, DairyController.deleteproducts);
router.post("/custprolist", authMiddleware, DairyController.custprolist);
router.post("/customerproducts", authMiddleware, DairyController.customerproducts);
router.get("/userDetails", authMiddleware, userController.userDetails);
router.get("/get-code", authMiddleware, DairyController.getCode);
router.post("/transactions", authMiddleware, DairyController.createTransaction);
// router.get("/transection", authMiddleware, userController.transection);
// router.get("/getpayments", authMiddleware, userController.getPayments);
// Mount the router on /api/auth so that /register becomes /api/auth/register
const initWebRouter = (app) => {
    app.use('/api/auth', router);
  };

  module.exports = initWebRouter;

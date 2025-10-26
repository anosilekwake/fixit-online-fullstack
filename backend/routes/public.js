// routes/public.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/publicController");

router.post("/submit", ctrl.submit);
router.post("/mpesa/stk", ctrl.mpesaStk);
router.post("/mpesa/stk/callback", express.json(), ctrl.mpesaStkCallback); // Daraja will POST JSON
module.exports = router;

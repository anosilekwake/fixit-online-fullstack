const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  orderRef: { type: String, required: true, index: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  mpesaCheckoutRequestID: { type: String }, // from Daraja
  mpesaMerchantRequestID: { type: String },
  resultCode: { type: Number },
  resultDesc: { type: String },
  transactionId: { type: String },
  status: { type: String, enum: ["Pending","Success","Failed"], default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  callbackData: { type: Object }
});

module.exports = mongoose.model("Payment", PaymentSchema);

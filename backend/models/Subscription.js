const mongoose = require("mongoose");
const SubscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  plan: { type: String, default: "free" },
  active: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Subscription", SubscriptionSchema);

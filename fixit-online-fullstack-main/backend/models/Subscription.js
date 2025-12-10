import { Schema, model } from "mongoose";
const SubscriptionSchema = new Schema({
  email: { type: String, required: true, index: true },
  plan: { type: String, default: "free" },
  active: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
});
export default model("Subscription", SubscriptionSchema);

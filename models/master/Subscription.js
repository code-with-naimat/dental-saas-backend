const mongoose = require("mongoose");
const masterConnection = require("../../config/masterDb");

const subscriptionSchema = new mongoose.Schema(
  {
    clinicId: { type: String, required: true, unique: true },
    planType: {
      type: String,
      enum: ["basic", "pro", "premium"],
      default: "basic",
    },
    price: { type: Number, required: true },
    currency: { type: String, enum: ["PKR", "USD"], default: "USD" },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "trialing"],
      default: "trialing",
    },
    nextBillingDate: { type: Date },
    // Payment gateway details — kaunsa gateway use hua aur uska reference id
    paymentGateway: { type: String, enum: ["stripe", "jazzcash", "easypaisa", null], default: null },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    lastTransactionRef: { type: String }, // JazzCash/EasyPaisa transaction reference number
  },
  { timestamps: true }
);

module.exports = masterConnection.model("Subscription", subscriptionSchema);

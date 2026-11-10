const mongoose = require("mongoose");
const masterConnection = require("../../config/masterDb");

const clinicSchema = new mongoose.Schema(
  {
    clinicId: { type: String, required: true, unique: true }, // used for tenant DB name
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true }, // e.g. "smilecare" -> smilecare.yourapp.com
    ownerEmail: { type: String, required: true },
    phone: { type: String },
    status: {
      type: String,
      enum: ["active", "suspended", "trial", "cancelled"],
      default: "trial",
    },
  },
  { timestamps: true }
);

module.exports = masterConnection.model("Clinic", clinicSchema);

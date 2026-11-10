const mongoose = require("mongoose");
const masterConnection = require("../../config/masterDb");

const adminSchema = new mongoose.Schema(
  {
    clinicId: { type: String, required: true }, // links to Clinic.clinicId
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "clinic_admin", "staff"],
      default: "clinic_admin",
    },
  },
  { timestamps: true }
);

module.exports = masterConnection.model("Admin", adminSchema);

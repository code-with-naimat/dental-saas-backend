const mongoose = require("mongoose");

// Ye sirf schema definitions hain — inhe alag alag clinic connections
// ke sath "compile" kiya jayega (getTenantModels.js dekhein).

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    historyNotes: { type: String },
  },
  { timestamps: true }
);

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialty: { type: String },
    workingHours: { type: String }, // e.g. "Mon-Sat 10am-6pm" (simple version)
    email: { type: String, unique: true, sparse: true }, // doctor login ke liye (optional)
    passwordHash: { type: String },
  },
  { timestamps: true }
);

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    dateTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled", "no_show"],
      default: "booked",
    },
    source: {
      type: String,
      enum: ["call", "chat", "website", "manual"],
      default: "manual",
    },
  },
  { timestamps: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

const reminderSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    type: { type: String, enum: ["sms", "email", "whatsapp"], required: true },
    sentAt: { type: Date },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  },
  { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    linkSentAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = {
  patientSchema,
  doctorSchema,
  appointmentSchema,
  invoiceSchema,
  reminderSchema,
  reviewSchema,
};

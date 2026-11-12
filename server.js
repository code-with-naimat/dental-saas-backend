require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./config/masterDb"); // master DB connection start ho jayegi import hote hi

const signupRoutes = require("./routes/signup");
const appointmentRoutes = require("./routes/appointments");
const receptionistRoutes = require("./routes/receptionist");
const invoiceRoutes = require("./routes/invoices");
const reviewRoutes = require("./routes/reviews");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payments");
const clinicInfoRoutes = require("./routes/clinicInfo");
const doctorRoutes = require("./routes/doctors");
const patientRoutes = require("./routes/patients");
const doctorAuthRoutes = require("./routes/doctorAuth");
const doctorPortalRoutes = require("./routes/doctorPortal");
const stripeService = require("./services/stripeService");
const startReminderScheduler = require("./services/reminderScheduler");

const app = express();

app.use(cors());

// Stripe webhook ko RAW body chahiye signature verify karne ke liye —
// isliye ye route express.json() se PEHLE, apne raw parser ke sath mount hota hai
app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripeService.stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("[Stripe Webhook] Signature verify fail:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
      await stripeService.handleWebhookEvent(event);
      res.json({ received: true });
    } catch (err) {
      console.error("[Stripe Webhook] Process error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

app.use(express.json());

// Generated invoice PDFs ko publicly serve karna (production mein S3 URL use karein)
app.use("/generated-invoices", express.static(path.join(__dirname, "generated-invoices")));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "AI Dental SaaS backend is running" });
});

app.use("/api/signup", signupRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/clinic-info", clinicInfoRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctor-auth", doctorAuthRoutes);
app.use("/api/doctor-portal", doctorPortalRoutes);

startReminderScheduler();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running at: http://localhost:${PORT}`);
});

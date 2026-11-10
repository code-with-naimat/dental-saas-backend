const nodemailer = require("nodemailer");
const twilio = require("twilio");
const Clinic = require("../models/master/Clinic");
const { getTenantConnection } = require("../config/tenantDb");
const getTenantModels = require("../models/tenant/getTenantModels");

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

/**
 * Ek clinic ke "completed" appointments check karta hai jinke liye
 * abhi tak review request nahi bheji gayi, aur unhe link bhejta hai.
 */
async function processReviewRequestsForClinic(clinic) {
  const connection = getTenantConnection(clinic.clinicId);
  const { Appointment, Review } = getTenantModels(connection);

  const completed = await Appointment.find({ status: "completed" }).populate("patientId");

  for (const appointment of completed) {
    const existing = await Review.findOne({ appointmentId: appointment._id });
    if (existing) continue; // pehle se review record (request bheji ja chuki) hai

    const patient = appointment.patientId;
    const reviewLink = `https://${clinic.subdomain}.yourapp.com/review?appointmentId=${appointment._id}`;
    const message = `${clinic.name} mein aapki visit kaisi rahi? Apna feedback yahan dein: ${reviewLink}`;

    try {
      if (patient.phone && twilioClient) {
        await twilioClient.messages.create({
          to: patient.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: message,
        });
      }
      if (patient.email && process.env.EMAIL_USER) {
        await mailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: patient.email,
          subject: "Apna Feedback Dein",
          text: message,
        });
      }

      // Placeholder review record bana dete hain "request sent" track karne ke liye
      await Review.create({
        patientId: patient._id,
        appointmentId: appointment._id,
        linkSentAt: new Date(),
      });
    } catch (err) {
      console.error(`[ReviewRequest] Error (${clinic.name}):`, err.message);
    }
  }
}

async function processAllReviewRequests() {
  const clinics = await Clinic.find({ status: { $in: ["active", "trial"] } });
  for (const clinic of clinics) {
    await processReviewRequestsForClinic(clinic);
  }
}

module.exports = { processAllReviewRequests };

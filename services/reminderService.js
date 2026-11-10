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
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendSms(to, body) {
  if (!twilioClient) return console.warn("[Reminder] Twilio configured nahi hai, SMS skip");
  await twilioClient.messages.create({ to, from: process.env.TWILIO_PHONE_NUMBER, body });
}

async function sendWhatsapp(to, body) {
  if (!twilioClient) return console.warn("[Reminder] Twilio configured nahi hai, WhatsApp skip");
  await twilioClient.messages.create({
    to: `whatsapp:${to}`,
    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
    body,
  });
}

async function sendEmail(to, subject, body) {
  if (!process.env.EMAIL_USER) return console.warn("[Reminder] Email configured nahi hai, skip");
  await mailTransporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text: body });
}

/**
 * Ek clinic ke liye: agle 24 ghanton mein jitne appointments hain,
 * un sab ke liye (agar reminder pehle na bheja gaya ho) reminder bhejta hai.
 */
async function processRemindersForClinic(clinic) {
  const connection = getTenantConnection(clinic.clinicId);
  const { Appointment, Reminder } = getTenantModels(connection);

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await Appointment.find({
    dateTime: { $gte: now, $lte: in24h },
    status: "booked",
  }).populate("patientId");

  for (const appointment of upcoming) {
    const alreadySent = await Reminder.findOne({
      appointmentId: appointment._id,
      status: "sent",
    });
    if (alreadySent) continue;

    const patient = appointment.patientId;
    const message = `Yaad dahani: ${clinic.name} mein aapka appointment ${appointment.dateTime.toLocaleString()} ko hai.`;

    try {
      if (patient.phone) {
        await sendSms(patient.phone, message);
        await sendWhatsapp(patient.phone, message);
      }
      if (patient.email) {
        await sendEmail(patient.email, "Appointment Reminder", message);
      }

      await Reminder.create({
        appointmentId: appointment._id,
        type: "sms",
        sentAt: new Date(),
        status: "sent",
      });
    } catch (err) {
      console.error(`[Reminder] Bhejne mein error (${clinic.name}):`, err.message);
      await Reminder.create({
        appointmentId: appointment._id,
        type: "sms",
        status: "failed",
      });
    }
  }
}

/**
 * Saari active clinics ke liye reminders process karta hai.
 * Isay cron job se periodically (e.g. har 30 min) call karna hai.
 */
async function processAllReminders() {
  const clinics = await Clinic.find({ status: { $in: ["active", "trial"] } });
  for (const clinic of clinics) {
    await processRemindersForClinic(clinic);
  }
}

module.exports = { processAllReminders };

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const INVOICE_DIR = path.join(__dirname, "..", "generated-invoices");
if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true });

/**
 * Appointment complete hone par invoice PDF banata hai aur Invoice record
 * create/update karta hai. Local disk par save karta hai — production mein
 * ye S3/Cloud storage par upload hona chahiye, filhal local path use ho raha hai.
 *
 * @param {Object} models - tenant models
 * @param {Object} clinic - clinic doc (master DB)
 * @param {string} appointmentId
 * @param {number} amount
 */
async function generateInvoice(models, clinic, appointmentId, amount) {
  const { Appointment, Invoice } = models;

  const appointment = await Appointment.findById(appointmentId)
    .populate("patientId")
    .populate("doctorId");

  if (!appointment) throw new Error("Appointment nahi mila");

  const fileName = `invoice_${appointmentId}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text(clinic.name, { align: "center" });
  doc.fontSize(10).text("Invoice", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(12).text(`Invoice Date: ${new Date().toLocaleDateString()}`);
  doc.text(`Patient: ${appointment.patientId.name}`);
  doc.text(`Phone: ${appointment.patientId.phone}`);
  doc.text(`Doctor: ${appointment.doctorId.name}`);
  doc.text(`Appointment Date: ${appointment.dateTime.toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(14).text(`Total Amount: PKR ${amount}`, { underline: true });
  doc.moveDown(2);
  doc.fontSize(10).text("Shukriya! - " + clinic.name, { align: "center" });

  doc.end();

  // pdfkit stream likhne mein thora time leta hai, isliye finish ka wait karte hain
  await new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });

  const invoice = await Invoice.findOneAndUpdate(
    { appointmentId },
    {
      appointmentId,
      amount,
      status: "unpaid",
      pdfUrl: `/generated-invoices/${fileName}`,
    },
    { upsert: true, new: true }
  );

  return invoice;
}

module.exports = { generateInvoice };

const {
  patientSchema,
  doctorSchema,
  appointmentSchema,
  invoiceSchema,
  reminderSchema,
  reviewSchema,
} = require("./schemas");

/**
 * Diye gaye clinic connection par saare tenant models "compile" kar ke
 * ek object mein return karta hai. Isay har request mein clinic ke
 * connection ke sath call karna hai (getTenantConnection se connection le kar).
 *
 * Mongoose khud handle karta hai ke agar model already us connection
 * par compile ho chuka hai to error na de (connection.models cache).
 *
 * @param {mongoose.Connection} connection
 */
function getTenantModels(connection) {
  return {
    Patient: connection.models.Patient || connection.model("Patient", patientSchema),
    Doctor: connection.models.Doctor || connection.model("Doctor", doctorSchema),
    Appointment: connection.models.Appointment || connection.model("Appointment", appointmentSchema),
    Invoice: connection.models.Invoice || connection.model("Invoice", invoiceSchema),
    Reminder: connection.models.Reminder || connection.model("Reminder", reminderSchema),
    Review: connection.models.Review || connection.model("Review", reviewSchema),
  };
}

module.exports = getTenantModels;

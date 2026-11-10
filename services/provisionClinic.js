const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const Clinic = require("../models/master/Clinic");
const Admin = require("../models/master/Admin");
const Subscription = require("../models/master/Subscription");
const { getTenantConnection } = require("../config/tenantDb");
const getTenantModels = require("../models/tenant/getTenantModels");

/**
 * Naya clinic sign up karta hai:
 * 1. Master DB mein Clinic + Admin + Subscription record banata hai
 * 2. Clinic ki apni tenant DB connect/create karta hai (models compile karke)
 *    Mongo khud DB tab tak physically nahi banata jab tak pehla document insert na ho —
 *    isliye hum ek "seed" doctor entry bhi bana dete hain taake DB turant exist kare.
 *
 * @param {Object} data - { clinicName, subdomain, ownerEmail, ownerPassword, planType, price }
 */
async function provisionClinic(data) {
  const { clinicName, subdomain, ownerEmail, ownerPassword, planType = "basic", price } = data;

  const existing = await Clinic.findOne({ subdomain });
  if (existing) {
    throw new Error("Ye subdomain pehle se le liya gaya hai");
  }

  const clinicId = uuidv4().split("-")[0]; // short unique id, DB naam ke liye

  // 1. Clinic record (master DB)
  const clinic = await Clinic.create({
    clinicId,
    name: clinicName,
    subdomain,
    ownerEmail,
    status: "trial",
  });

  // 2. Admin record (master DB)
  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const admin = await Admin.create({
    clinicId,
    name: clinicName + " Owner",
    email: ownerEmail,
    passwordHash,
    role: "clinic_admin",
  });

  // 3. Subscription record (master DB)
  const subscription = await Subscription.create({
    clinicId,
    planType,
    price,
    status: "trialing",
  });

  // 4. Tenant DB ko "create" karna (seed doctor daal kar taake DB actually ban jaye)
  const connection = getTenantConnection(clinicId);
  const { Doctor } = getTenantModels(connection);
  await Doctor.create({
    name: "Dr. " + clinicName,
    specialty: "General Dentistry",
    workingHours: "Mon-Sat 10am-6pm",
  });

  return { clinic, admin, subscription };
}

module.exports = provisionClinic;

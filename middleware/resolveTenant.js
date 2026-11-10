const Clinic = require("../models/master/Clinic");
const { getTenantConnection } = require("../config/tenantDb");
const getTenantModels = require("../models/tenant/getTenantModels");

/**
 * Ye middleware har request pe chalega:
 * 1. Request se clinic identify karega (subdomain ya header se)
 * 2. Master DB se clinic ka record nikalega
 * 3. Us clinic ki apni DB se connect karega
 * 4. req.tenant mein clinic info + models attach kar dega
 *
 * Frontend/Postman se clinic identify karne ke 2 tareeqe:
 *  - Header: "x-clinic-id: smilecare"
 *  - Ya subdomain: smilecare.yourapp.com (production mein)
 */
async function resolveTenant(req, res, next) {
  try {
    const subdomain =
      req.headers["x-clinic-id"] || req.hostname.split(".")[0];

    if (!subdomain) {
      return res.status(400).json({ error: "Clinic identify nahi ho saka (subdomain/header missing)" });
    }

    const clinic = await Clinic.findOne({ subdomain });

    if (!clinic) {
      return res.status(404).json({ error: "Clinic nahi mili" });
    }

    if (clinic.status === "suspended" || clinic.status === "cancelled") {
      return res.status(403).json({ error: "Ye clinic account active nahi hai" });
    }

    const connection = getTenantConnection(clinic.clinicId);
    const models = getTenantModels(connection);

    req.tenant = {
      clinic,
      models,
    };

    next();
  } catch (err) {
    console.error("[resolveTenant] Error:", err.message);
    res.status(500).json({ error: "Tenant resolve karte waqt error aayi" });
  }
}

module.exports = resolveTenant;

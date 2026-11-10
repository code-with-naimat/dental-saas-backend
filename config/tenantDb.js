const mongoose = require("mongoose");

// Har clinic ki apni database hoti hai. Ye file un connections ko
// on-demand banata hai aur cache karta hai (baar baar reconnect na ho).

const connectionCache = {};

/**
 * Ek specific clinic ke liye DB connection deta hai.
 * Agar connection pehle se cached hai to wahi return karta hai,
 * warna naya connection bana kar cache mein daal deta hai.
 *
 * @param {string} clinicId - unique clinic identifier (DB naam banane ke liye use hoga)
 * @returns {mongoose.Connection}
 */
function getTenantConnection(clinicId) {
  if (!clinicId) {
    throw new Error("clinicId is required to get tenant DB connection");
  }

  if (connectionCache[clinicId]) {
    return connectionCache[clinicId];
  }

  const dbName = `dental_clinic_${clinicId}`;
  const uri = `${process.env.TENANT_DB_BASE_URI}/${dbName}`;

  const connection = mongoose.createConnection(uri);

  connection.on("connected", () => {
    console.log(`[TenantDB] Connected: ${dbName}`);
  });

  connection.on("error", (err) => {
    console.error(`[TenantDB] Error (${dbName}):`, err.message);
  });

  connectionCache[clinicId] = connection;
  return connection;
}

/**
 * Connection ko cache se hata deta hai (rarely needed — e.g. clinic delete hone par)
 */
async function closeTenantConnection(clinicId) {
  if (connectionCache[clinicId]) {
    await connectionCache[clinicId].close();
    delete connectionCache[clinicId];
  }
}

module.exports = { getTenantConnection, closeTenantConnection };

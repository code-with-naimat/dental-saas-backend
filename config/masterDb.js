const mongoose = require("mongoose");

// Master DB rakhta hai: clinics, admins, subscriptions (control + billing data)
const masterConnection = mongoose.createConnection(process.env.MASTER_DB_URI);

masterConnection.on("connected", () => {
  console.log("[MasterDB] Connected successfully");
});

masterConnection.on("error", (err) => {
  console.error("[MasterDB] Connection error:", err.message);
});

module.exports = masterConnection;

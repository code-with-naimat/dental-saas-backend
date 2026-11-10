const express = require("express");
const router = express.Router();
const provisionClinic = require("../services/provisionClinic");

// POST /api/signup
// Body: { clinicName, subdomain, ownerEmail, ownerPassword, planType, price }
router.post("/", async (req, res) => {
  try {
    const result = await provisionClinic(req.body);
    res.status(201).json({
      message: "Clinic successfully register ho gayi",
      clinicId: result.clinic.clinicId,
      subdomain: result.clinic.subdomain,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

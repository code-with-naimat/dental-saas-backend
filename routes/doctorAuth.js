const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const resolveTenant = require("../middleware/resolveTenant");

router.use(resolveTenant);

// POST /api/doctor-auth/set-password
// Admin isay use kar ke doctor ka login set/reset karta hai
// Body: { doctorId, email, password }
router.post("/set-password", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    const { doctorId, email, password } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { email, passwordHash },
      { new: true }
    );

    if (!doctor) return res.status(404).json({ error: "Doctor nahi mila" });
    res.json({ message: "Doctor login set ho gaya", doctorId: doctor._id, email: doctor.email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/doctor-auth/login
// Body: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    const { email, password } = req.body;

    const doctor = await Doctor.findOne({ email });
    if (!doctor || !doctor.passwordHash) {
      return res.status(401).json({ error: "Email ya password ghalat hai" });
    }

    const valid = await bcrypt.compare(password, doctor.passwordHash);
    if (!valid) return res.status(401).json({ error: "Email ya password ghalat hai" });

    const token = jwt.sign(
      { doctorId: doctor._id, clinicId: req.tenant.clinic.clinicId, role: "doctor" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      doctor: { id: doctor._id, name: doctor.name, email: doctor.email },
      clinic: { name: req.tenant.clinic.name, subdomain: req.tenant.clinic.subdomain },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

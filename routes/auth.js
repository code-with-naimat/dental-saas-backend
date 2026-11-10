const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/master/Admin");
const Clinic = require("../models/master/Clinic");

// POST /api/auth/login
// Body: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: "Email ya password ghalat hai" });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: "Email ya password ghalat hai" });

    const clinic = await Clinic.findOne({ clinicId: admin.clinicId });

    const token = jwt.sign(
      { adminId: admin._id, clinicId: admin.clinicId, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      admin: { name: admin.name, email: admin.email, role: admin.role },
      clinic: { name: clinic.name, subdomain: clinic.subdomain },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

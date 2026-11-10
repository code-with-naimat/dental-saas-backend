const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");
const authenticateDoctor = require("../middleware/authenticateDoctor");

router.use(resolveTenant);
router.use(authenticateDoctor);

// GET /api/doctor-portal/me -> apni profile dekhna
router.get("/me", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    const doctor = await Doctor.findById(req.doctorAuth.doctorId).select("-passwordHash");
    if (!doctor) return res.status(404).json({ error: "Profile nahi mili" });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/doctor-portal/me -> sirf apni working hours / specialty edit kar sakta hai
// Body: { workingHours, specialty }
router.put("/me", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    const { workingHours, specialty } = req.body; // Note: name/email khud edit nahi kar sakta

    const doctor = await Doctor.findByIdAndUpdate(
      req.doctorAuth.doctorId,
      { workingHours, specialty },
      { new: true }
    ).select("-passwordHash");

    res.json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/doctor-portal/appointments -> sirf apne appointments (kisi aur doctor ke nahi)
router.get("/appointments", async (req, res) => {
  try {
    const { Appointment } = req.tenant.models;
    const appointments = await Appointment.find({ doctorId: req.doctorAuth.doctorId })
      .populate("patientId")
      .sort({ dateTime: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

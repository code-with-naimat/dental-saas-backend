const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");

router.use(resolveTenant);

// GET /api/doctors
router.get("/", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors
// Body: { name, specialty, workingHours }
router.post("/", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    const doctor = await Doctor.create(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/doctors/:id
router.put("/:id", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doctor) return res.status(404).json({ error: "Doctor nahi mila" });
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/doctors/:id
router.delete("/:id", async (req, res) => {
  try {
    const { Doctor } = req.tenant.models;
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: "Doctor delete ho gaya" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");

router.use(resolveTenant);

// GET /api/patients
router.get("/", async (req, res) => {
  try {
    const { Patient } = req.tenant.models;
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients
// Body: { name, phone, email, historyNotes }
router.post("/", async (req, res) => {
  try {
    const { Patient } = req.tenant.models;
    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/patients/:id
router.put("/:id", async (req, res) => {
  try {
    const { Patient } = req.tenant.models;
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) return res.status(404).json({ error: "Patient nahi mila" });
    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/patients/:id
router.delete("/:id", async (req, res) => {
  try {
    const { Patient } = req.tenant.models;
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ message: "Patient delete ho gaya" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

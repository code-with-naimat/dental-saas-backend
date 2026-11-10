const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");

// Har route se pehle resolveTenant chalega taake pata chale kis clinic ki request hai
router.use(resolveTenant);

// GET /api/appointments -> is clinic ke saare appointments
router.get("/", async (req, res) => {
  try {
    const { Appointment } = req.tenant.models;
    const appointments = await Appointment.find()
      .populate("patientId")
      .populate("doctorId")
      .sort({ dateTime: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments -> naya appointment book karna
// Body: { patientId, doctorId, dateTime, source }
router.post("/", async (req, res) => {
  try {
    const { Appointment, Doctor } = req.tenant.models;
    const { patientId, doctorId, dateTime, source } = req.body;

    // Basic clash check: same doctor, same time pe already koi booking to nahi
    const clash = await Appointment.findOne({ doctorId, dateTime, status: "booked" });
    if (clash) {
      return res.status(409).json({ error: "Ye slot pehle se book hai" });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      dateTime,
      source: source || "manual",
    });

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appointments/:id (Appointment reschedule/update karne ke liye)
router.put("/:id", async (req, res) => {
  try {
    const { Appointment } = req.tenant.models;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Yeh updated data return karega
    );
    
    if (!appointment) {
      return res.status(404).json({ error: "Appointment nahi mili" });
    }
    
    res.status(200).json(appointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/appointments/:id (Appointment cancel/delete karne ke liye)
router.delete("/:id", async (req, res) => {
  try {
    const { Appointment } = req.tenant.models;
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: "Appointment nahi mili" });
    }
    
    res.status(200).json({ message: "Appointment delete ho gayi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

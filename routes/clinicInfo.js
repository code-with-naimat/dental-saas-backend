const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");

router.use(resolveTenant);

// GET /api/clinic-info -> public website ke liye clinic ki basic info
router.get("/", async (req, res) => {
  const { Doctor } = req.tenant.models;
  const doctors = await Doctor.find();

  res.json({
    name: req.tenant.clinic.name,
    subdomain: req.tenant.clinic.subdomain,
    doctors: doctors.map((d) => ({ name: d.name, specialty: d.specialty, workingHours: d.workingHours })),
  });
});
const Clinic = require("../models/master/Clinic"); // Path check kar lein

// PUT /api/clinic-info -> Clinic ki details update karna
router.put("/", async (req, res) => {
  try {
    const updatedClinic = await Clinic.findByIdAndUpdate(
      req.tenant.clinic._id, 
      req.body, 
      { new: true }
    );
    res.json(updatedClinic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;

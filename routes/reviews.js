const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");

router.use(resolveTenant);

// GET /api/reviews -> dashboard ke liye saare reviews
router.get("/", async (req, res) => {
  try {
    const { Review } = req.tenant.models;
    const reviews = await Review.find({ rating: { $exists: true } })
      .populate("patientId")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/submit -> patient link khol kar rating/comment submit karta hai
// Body: { appointmentId, rating, comment }
router.post("/submit", async (req, res) => {
  try {
    const { Review } = req.tenant.models;
    const { appointmentId, rating, comment } = req.body;

    const review = await Review.findOneAndUpdate(
      { appointmentId },
      { rating, comment },
      { new: true, upsert: true }
    );

    if (!review) {
      return res.status(404).json({ error: "Review request nahi mili is appointment ke liye" });
    }

    res.json({ message: "Shukriya! Aapka feedback mil gaya", review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

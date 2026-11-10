const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");
const { generateInvoice } = require("../services/invoiceService");

router.use(resolveTenant);

// POST /api/invoices/generate
// Body: { appointmentId, amount }
router.post("/generate", async (req, res) => {
  try {
    const { appointmentId, amount } = req.body;
    const invoice = await generateInvoice(
      req.tenant.models,
      req.tenant.clinic,
      appointmentId,
      amount
    );
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/invoices -> is clinic ke saare invoices
router.get("/", async (req, res) => {
  try {
    const { Invoice } = req.tenant.models;
    const invoices = await Invoice.find().populate({
      path: "appointmentId",
      populate: ["patientId", "doctorId"],
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/invoices/:id (Invoice update karne ke liye, jaise status change karna)
router.put("/:id", async (req, res) => {
  try {
    const { Invoice } = req.tenant.models;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Yeh updated data return karega
    );
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice nahi mili" });
    }
    
    res.status(200).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id (Invoice delete karne ke liye)
router.delete("/:id", async (req, res) => {
  try {
    const { Invoice } = req.tenant.models;
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice nahi mili" });
    }
    
    res.status(200).json({ message: "Invoice delete ho gayi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

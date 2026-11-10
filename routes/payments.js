const express = require("express");
const router = express.Router();
const Subscription = require("../models/master/Subscription");
const Clinic = require("../models/master/Clinic");
const { getPlan } = require("../config/plans");

const stripeService = require("../services/stripeService");
const jazzcashService = require("../services/jazzcashService");
const easypaisaService = require("../services/easypaisaService");

/**
 * ---------- STRIPE (International) ----------
 */

// POST /api/payments/stripe/checkout
// Body: { clinicId, planKey }  planKey: "starter" | "growth" | "practice_pro"
router.post("/stripe/checkout", async (req, res) => {
  try {
    const { clinicId, planKey } = req.body;
    const url = await stripeService.createCheckoutSession(clinicId, planKey);
    res.json({ checkoutUrl: url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ---------- JAZZCASH (Local) ----------
 */

// POST /api/payments/jazzcash/initiate
// Body: { clinicId, planKey }  planKey: "starter" | "growth" | "clinic_pro"
router.post("/jazzcash/initiate", async (req, res) => {
  try {
    const { clinicId, planKey } = req.body;
    const result = await jazzcashService.initiatePayment(clinicId, planKey);
    // Frontend isay use kar ke ek auto-submit HTML form banayega jo
    // result.checkoutUrl par result.fields POST karega
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// JazzCash payment complete hone ke baad yahan POST karta hai
router.post("/jazzcash/callback", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const valid = jazzcashService.verifyCallback(req.body);
    if (!valid) return res.status(400).send("Invalid hash — request tampered ho sakti hai");

    const { pp_ResponseCode, pp_BillReference, ppmpf_1, pp_TxnRefNo } = req.body;
    const clinicId = pp_BillReference;
    const planKey = ppmpf_1;

    if (pp_ResponseCode === "000") {
      const plan = getPlan("local", planKey);
      await Subscription.findOneAndUpdate(
        { clinicId },
        {
          planType: planKey === "clinic_pro" ? "premium" : planKey === "growth" ? "pro" : "basic",
          price: plan.price,
          currency: "PKR",
          status: "active",
          paymentGateway: "jazzcash",
          lastTransactionRef: pp_TxnRefNo,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        { upsert: true }
      );
      await Clinic.findOneAndUpdate({ clinicId }, { status: "active" });
      res.redirect(`${process.env.APP_BASE_URL}/dashboard/?payment=success`);
    } else {
      res.redirect(`${process.env.APP_BASE_URL}/dashboard/?payment=failed`);
    }
  } catch (err) {
    console.error("[JazzCash Callback] Error:", err.message);
    res.status(500).send("Server error");
  }
});

/**
 * ---------- EASYPAISA (Local) ----------
 */

// POST /api/payments/easypaisa/initiate
router.post("/easypaisa/initiate", async (req, res) => {
  try {
    const { clinicId, planKey } = req.body;
    const result = await easypaisaService.initiatePayment(clinicId, planKey);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/easypaisa/callback", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const valid = easypaisaService.verifyCallback(req.body);
    if (!valid) return res.status(400).send("Invalid hash — request tampered ho sakti hai");

    const { status, billReference, customField, orderRefNum } = req.body;
    const clinicId = billReference;
    const planKey = customField;

    if (status === "0000" || status === "SUCCESS") {
      const plan = getPlan("local", planKey);
      await Subscription.findOneAndUpdate(
        { clinicId },
        {
          planType: planKey === "clinic_pro" ? "premium" : planKey === "growth" ? "pro" : "basic",
          price: plan.price,
          currency: "PKR",
          status: "active",
          paymentGateway: "easypaisa",
          lastTransactionRef: orderRefNum,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        { upsert: true }
      );
      await Clinic.findOneAndUpdate({ clinicId }, { status: "active" });
      res.redirect(`${process.env.APP_BASE_URL}/dashboard/?payment=success`);
    } else {
      res.redirect(`${process.env.APP_BASE_URL}/dashboard/?payment=failed`);
    }
  } catch (err) {
    console.error("[EasyPaisa Callback] Error:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;

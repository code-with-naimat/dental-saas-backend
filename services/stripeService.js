const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getPlan } = require("../config/plans");
const Subscription = require("../models/master/Subscription");
const Clinic = require("../models/master/Clinic");

/**
 * Ek clinic ke liye Stripe Checkout session banata hai (subscription mode).
 * Frontend/dashboard is se mile URL par patient/admin ko redirect kar dega.
 *
 * @param {string} clinicId
 * @param {string} planKey - "starter" | "growth" | "practice_pro"
 */
async function createCheckoutSession(clinicId, planKey) {
  const clinic = await Clinic.findOne({ clinicId });
  if (!clinic) throw new Error("Clinic nahi mili");

  const plan = getPlan("international", planKey);

  // Stripe mein price dynamically create kar rahe hain (production mein Stripe
  // Dashboard se pehle se bane hue Price IDs use karna behtar hai — .env mein daal kar)
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: clinic.ownerEmail,
    line_items: [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: { name: `AI Dental SaaS — ${plan.name}` },
          unit_amount: plan.price * 100, // Stripe cents mein leta hai
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_BASE_URL}/dashboard/?payment=success`,
    cancel_url: `${process.env.APP_BASE_URL}/dashboard/?payment=cancelled`,
    metadata: { clinicId, planKey },
  });

  return session.url;
}

/**
 * Stripe webhook events handle karta hai (checkout complete, payment fail, cancel).
 * Isay routes/payments.js mein raw body ke sath call kiya jayega.
 */
async function handleWebhookEvent(event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { clinicId, planKey } = session.metadata;
      const plan = getPlan("international", planKey);

      await Subscription.findOneAndUpdate(
        { clinicId },
        {
          planType: planKey === "practice_pro" ? "premium" : planKey === "growth" ? "pro" : "basic",
          price: plan.price,
          currency: plan.currency,
          status: "active",
          paymentGateway: "stripe",
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        },
        { upsert: true }
      );
      await Clinic.findOneAndUpdate({ clinicId }, { status: "active" });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        { status: "past_due" }
      );
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        { status: "cancelled" }
      );
      break;
    }
  }
}

module.exports = { createCheckoutSession, handleWebhookEvent, stripe };

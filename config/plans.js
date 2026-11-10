// Dono markets (local Pakistan aur international) ke plans yahan define hain.
// Kahin bhi price change karna ho to sirf yahan karein.

const PLANS = {
  // Local Pakistan clinics (PKR, JazzCash/EasyPaisa se charge honge)
  local: {
    starter: { name: "Starter", price: 15000, currency: "PKR" },
    growth: { name: "Growth", price: 35000, currency: "PKR" },
    clinic_pro: { name: "Clinic Pro", price: 65000, currency: "PKR" },
  },
  // International clinics (USD, Stripe se charge honge)
  international: {
    starter: { name: "Starter", price: 99, currency: "USD" },
    growth: { name: "Growth", price: 199, currency: "USD" },
    practice_pro: { name: "Practice Pro", price: 399, currency: "USD" },
  },
};

function getPlan(market, planKey) {
  const plan = PLANS[market]?.[planKey];
  if (!plan) throw new Error(`Plan nahi mila: ${market}/${planKey}`);
  return plan;
}

module.exports = { PLANS, getPlan };

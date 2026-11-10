const crypto = require("crypto");
const { getPlan } = require("../config/plans");
const Clinic = require("../models/master/Clinic");

/**
 * JazzCash "Mobile Account" hosted checkout integration.
 * Docs: JazzCash Merchant Integration Guide (HMAC-SHA256 secured hash based redirect).
 *
 * Flow:
 * 1. Hum params banate hain aur secure hash calculate karte hain
 * 2. Dashboard/frontend un params ko ek auto-submit form ke zariye
 *    JazzCash ke checkout URL par POST karta hai
 * 3. Payment hone ke baad JazzCash humare pp_ReturnURL par callback bhejta hai
 */

function generateTxnRefNo(clinicId) {
  const timestamp = Date.now();
  return `T${clinicId}${timestamp}`.slice(0, 20);
}

function formatDateTime(date) {
  // JazzCash format: YYYYMMDDHHmmss
  return date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

/**
 * Secure hash banata hai: sorted params ko '&' se jodo, aage IntegritySalt lagao,
 * phir HMAC-SHA256 lagao (JazzCash ka required tareeqa).
 */
function generateSecureHash(params) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => params[k])
    .join("&");

  const stringToHash = `${process.env.JAZZCASH_INTEGRITY_SALT}&${sorted}`;
  return crypto
    .createHmac("sha256", process.env.JAZZCASH_INTEGRITY_SALT)
    .update(stringToHash)
    .digest("hex");
}

/**
 * Payment initiate karne ke liye saare params + secure hash bana kar deta hai.
 * Frontend inhe hidden form fields ke tor par JazzCash checkout URL par POST karega.
 *
 * @param {string} clinicId
 * @param {string} planKey - "starter" | "growth" | "clinic_pro"
 */
async function initiatePayment(clinicId, planKey) {
  const clinic = await Clinic.findOne({ clinicId });
  if (!clinic) throw new Error("Clinic nahi mili");

  const plan = getPlan("local", planKey);
  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 ghanta expiry

  const txnRefNo = generateTxnRefNo(clinicId);

  const params = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID,
    pp_Password: process.env.JAZZCASH_PASSWORD,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: String(plan.price * 100), // paisa mein (PKR * 100)
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: formatDateTime(now),
    pp_TxnExpiryDateTime: formatDateTime(expiry),
    pp_BillReference: clinicId,
    pp_Description: `AI Dental SaaS - ${plan.name} Plan`,
    pp_ReturnURL: `${process.env.APP_BASE_URL}/api/payments/jazzcash/callback`,
    pp_SubMerchantID: "",
    ppmpf_1: planKey, // custom field — callback mein plan identify karne ke liye
  };

  params.pp_SecureHash = generateSecureHash(params);

  return {
    checkoutUrl:
      process.env.JAZZCASH_ENV === "production"
        ? "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
        : "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/",
    fields: params,
  };
}

/**
 * JazzCash callback verify karta hai — response ka hash dobara calculate kar ke
 * match karte hain, taake koi fake/tampered request accept na ho.
 */
function verifyCallback(responseParams) {
  const { pp_SecureHash, ...rest } = responseParams;
  const expectedHash = generateSecureHash(rest);
  return expectedHash === pp_SecureHash;
}

module.exports = { initiatePayment, verifyCallback };

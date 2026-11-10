const crypto = require("crypto");
const { getPlan } = require("../config/plans");
const Clinic = require("../models/master/Clinic");

/**
 * EasyPaisa "Open API" hosted checkout integration.
 * Docs: Telenor Microfinance Bank EasyPaisa Merchant Integration Guide
 * (HMAC-SHA256 secured hash, similar pattern to JazzCash).
 */

function generateOrderRefNo(clinicId) {
  return `EP${clinicId}${Date.now()}`.slice(0, 20);
}

function generateHash(params) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return crypto
    .createHmac("sha256", process.env.EASYPAISA_HASH_KEY)
    .update(sorted)
    .digest("hex");
}

/**
 * @param {string} clinicId
 * @param {string} planKey - "starter" | "growth" | "clinic_pro"
 */
async function initiatePayment(clinicId, planKey) {
  const clinic = await Clinic.findOne({ clinicId });
  if (!clinic) throw new Error("Clinic nahi mili");

  const plan = getPlan("local", planKey);
  const orderRefNo = generateOrderRefNo(clinicId);

  const params = {
    storeId: process.env.EASYPAISA_STORE_ID,
    amount: plan.price,
    postBackURL: `${process.env.APP_BASE_URL}/api/payments/easypaisa/callback`,
    orderRefNum: orderRefNo,
    expiryDate: formatExpiry(),
    merchantHashedReq: "", // neeche fill hoga
    autoRedirect: "1",
    paymentMethod: "MA_PAYMENT_METHOD", // Mobile Account
    emailAddr: clinic.ownerEmail,
    bankIdentificationNumber: "",
    customerBankAccountNumber: "",
    billReference: clinicId,
    // custom field taake callback mein plan identify ho sake
    customField: planKey,
  };

  params.merchantHashedReq = generateHash(params);

  return {
    checkoutUrl:
      process.env.EASYPAISA_ENV === "production"
        ? "https://easypay.easypaisa.com.pk/easypay/Index.jsf"
        : "https://sandbox.easypaisa.com.pk/easypay/Index.jsf",
    fields: params,
  };
}

function formatExpiry() {
  const expiry = new Date(Date.now() + 60 * 60 * 1000);
  return expiry.toISOString().slice(0, 19).replace("T", " ");
}

function verifyCallback(responseParams) {
  const { merchantHashedReq, ...rest } = responseParams;
  const expectedHash = generateHash(rest);
  return expectedHash === merchantHashedReq;
}

module.exports = { initiatePayment, verifyCallback };

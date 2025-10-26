// services/mpesa.js
const axios = require("axios");
const qs = require("qs");

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_ENV,
  MPESA_STK_CALLBACK_URL
} = process.env;

const DARJA_BASE = MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) return cachedToken; // 60s buffer

  const url = `${DARJA_BASE}/oauth/v1/generate?grant_type=client_credentials`;
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  const res = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` }
  });
  cachedToken = res.data.access_token;
  tokenExpiry = now + (res.data.expires_in || 3600) * 1000;
  return cachedToken;
}

function getTimestamp() {
  const d = new Date();
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${M}${day}${h}${m}${s}`;
}

function getPassword(timestamp) {
  const pass = MPESA_SHORTCODE + MPESA_PASSKEY + timestamp;
  return Buffer.from(pass).toString("base64");
}

/**
 * requestStkPush({phone, amount, account})
 * returns response from Daraja (merchantRequestID, checkoutRequestID)
 */
async function requestStkPush({ phone, amount, account }) {
  const token = await getToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);

  const url = `${DARJA_BASE}/mpesa/stkpush/v1/processrequest`;
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,             // payer
    PartyB: MPESA_SHORTCODE,   // paybill shortcode
    PhoneNumber: phone,
    CallBackURL: MPESA_STK_CALLBACK_URL,
    AccountReference: account || "FixItOnline",
    TransactionDesc: `Payment for ${account || "order"}`
  };

  const res = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.data;
}

module.exports = { requestStkPush, getToken };

// controllers/publicController.js
const Submission = require("../models/Submission");
const Payment = require("../models/Payment");
const { requestStkPush } = require("../services/mpesa");
const { sendMail } = require("../services/email");

function normalizeKenyaPhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/[\s+()-]/g,"");
  if (/^0[17]\d{8}$/.test(s)) return "254" + s.slice(1);
  if (/^[7]\d{8}$/.test(s)) return "254" + s;
  if (/^2547\d{8}$/.test(s)) return s;
  return null;
}

async function submit(req, res) {
  try {
    const { name, phone, email, service, details, orderRef, source } = req.body;
    if (!name || !phone || !details || !orderRef) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }
    const normalizedPhone = normalizeKenyaPhone(phone);
    if (!normalizedPhone) return res.status(400).json({ success: false, message: "Invalid phone" });

    const submission = await Submission.create({
      name, phone: normalizedPhone, email, service, details, orderRef, status: "Pending"
    });

    // optional: send email to admin
    try {
      await sendMail({
        to: process.env.SMTP_USER,
        subject: `New submission: ${orderRef}`,
        text: `New submission from ${name} (${normalizedPhone}) - ${details}`
      });
    } catch (e) {
      console.warn("Email send failed", e.message);
    }

    res.json({ success: true, submission });
  } catch (err) {
    console.error("submit error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function mpesaStk(req, res) {
  try {
    const { phone: rawPhone, amount, account } = req.body;
    if (!rawPhone || !amount) return res.status(400).json({ success: false, message: "phone and amount required" });
    const phone = normalizeKenyaPhone(rawPhone);
    if (!phone) return res.status(400).json({ success: false, message: "Invalid phone" });

    // create payment record
    const payment = await Payment.create({
      orderRef: account || `order-${Date.now()}`,
      phone,
      amount,
      status: "Pending"
    });

    const darajaRes = await requestStkPush({ phone, amount, account: payment.orderRef });

    // darajaRes will have MerchantRequestID, CheckoutRequestID
    payment.mpesaMerchantRequestID = darajaRes.MerchantRequestID;
    payment.mpesaCheckoutRequestID = darajaRes.CheckoutRequestID;
    await payment.save();

    return res.json({ success: true, data: darajaRes, payment });
  } catch (err) {
    console.error("mpesaStk error", err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: "STK push failed" });
  }
}

/**
 * STK callback from Daraja:
 * handle result and update Payment & Submission (if orderRef linked)
 */
async function mpesaStkCallback(req, res) {
  // Daraja expects a 200/JSON response quickly
  res.json({ ResultCode: 0, ResultDesc: "Received" });

  try {
    const body = req.body;
    // sample path: body.Body.stkCallback
    const cb = (body && body.Body && body.Body.stkCallback) || null;
    if (!cb) {
      console.warn("unexpected callback body", body);
      return;
    }

    const merchantRequestID = cb.MerchantRequestID;
    const checkoutRequestID = cb.CheckoutRequestID;
    const resultCode = cb.ResultCode;
    const resultDesc = cb.ResultDesc;
    const callbackMetadata = cb.CallbackMetadata || null;

    // find payment record by checkoutRequestID or merchantRequestID
    const Payment = require("../models/Payment");
    const Submission = require("../models/Submission");

    const payment = await Payment.findOne({
      $or: [{ mpesaCheckoutRequestID: checkoutRequestID }, { mpesaMerchantRequestID: merchantRequestID }]
    });

    const update = {
      resultCode,
      resultDesc,
      callbackData: cb,
      status: resultCode === 0 ? "Success" : "Failed"
    };

    if (callbackMetadata && callbackMetadata.Item) {
      // extract MpesaReceiptNumber, Amount, PhoneNumber, TransactionDate
      const items = callbackMetadata.Item.reduce((acc, it) => {
        acc[it.Name] = it.Value;
        return acc;
      }, {});
      update.transactionId = items.MpesaReceiptNumber || items.TransactionID || items.TransactionReceipt || items.ReceiptNumber;
      update.amount = items.Amount || update.amount;
      update.phone = items.PhoneNumber || update.phone;
      update.transactionDate = items.TransactionDate || update.transactionDate;
    }

    if (payment) {
      Object.assign(payment, update);
      await payment.save();

      // If there's a submission that uses same orderRef, mark status Processing/Completed
      if (payment.orderRef) {
        const submission = await Submission.findOne({ orderRef: payment.orderRef });
        if (submission) {
          submission.status = update.status === "Success" ? "Processing" : "Pending";
          await submission.save();

          // send email to user about payment result (if email present)
          if (submission.email) {
            try {
              const { sendMail } = require("../services/email");
              await sendMail({
                to: submission.email,
                subject: `Payment ${update.status} - ${submission.orderRef}`,
                text: `Hello ${submission.name}, your payment status: ${update.status}. Ref: ${payment.transactionId || 'N/A'}`
              });
            } catch (e) {
              console.warn("email send fail", e.message);
            }
          }
        }
      }
    } else {
      console.warn("Payment record not found for checkoutRequestID", checkoutRequestID);
    }
  } catch (err) {
    console.error("Error processing stk callback", err);
  }
}

module.exports = { submit, mpesaStk, mpesaStkCallback };

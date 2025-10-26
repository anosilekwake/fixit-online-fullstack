// controllers/adminController.js
const Submission = require("../models/Submission");

/**
 * Basic admin controllers for the admin UI:
 * - list, update (PUT), delete
 */

async function listSubmissions(req, res) {
  try {
    const submissions = await Submission.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, submissions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function updateSubmission(req, res) {
  try {
    const id = req.params.id;
    const body = req.body;
    const allowed = ["name","email","details","status"];
    const patch = {};
    allowed.forEach((k) => { if (body[k] !== undefined) patch[k] = body[k]; });
    patch.updatedAt = new Date();

    const sub = await Submission.findByIdAndUpdate(id, patch, { new: true });
    if (!sub) return res.status(404).json({ success: false, message: "Not found" });

    // optional: send email on status change
    if (body.status && body.status === "Completed" && sub.email) {
      try {
        const { sendMail } = require("../services/email");
        await sendMail({
          to: sub.email,
          subject: `Your request is complete — ${sub.orderRef}`,
          text: `Hello ${sub.name},\n\nYour request (${sub.orderRef}) is complete. Thank you for using FixIt Online.`
        });
      } catch (e) { console.warn("email failed", e.message); }
    }

    return res.json({ success: true, submission: sub });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function deleteSubmission(req, res) {
  try {
    const id = req.params.id;
    await Submission.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { listSubmissions, updateSubmission, deleteSubmission };

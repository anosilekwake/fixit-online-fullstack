// controllers/adminController.js
import { find, findByIdAndUpdate, findByIdAndDelete } from "../models/Submission";

/**
 * Admin functionalities:
 * 1. List all submissions (including phone numbers + all client data)
 * 2. Update submission fields (name, email, phone, status, details, etc.)
 * 3. Delete a submission
 */

//
// 1️⃣ LIST SUBMISSIONS
//
async function listSubmissions(req, res) {
  try {
    const submissions = await find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      submissions,
    });
  } catch (err) {
    console.error("LIST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

//
// 2️⃣ UPDATE SUBMISSION
//
async function updateSubmission(req, res) {
  try {
    const id = req.params.id;
    const body = req.body;

    // Allowed fields admin can safely update
    const allowed = [
      "name",
      "email",
      "phone",
      "details",
      "service",
      "status",
      "notes",
    ];

    const patch = {};

    allowed.forEach((key) => {
      if (body[key] !== undefined) patch[key] = body[key];
    });

    patch.updatedAt = new Date();

    const updated = await findByIdAndUpdate(id, patch, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Optional notification email when completed
    if (body.status && body.status === "Completed" && updated.email) {
      try {
        const { sendMail } = require("../services/email");
        await sendMail({
          to: updated.email,
          subject: `Your FixIt Online Request Is Completed — ${updated.orderRef}`,
          text: `Hello ${updated.name},\n\nYour request (${updated.orderRef}) has been completed.\n\nThank you for choosing FixIt Online!`,
        });
      } catch (e) {
        console.warn("Email sending failed:", e.message);
      }
    }

    return res.json({
      success: true,
      submission: updated,
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

//
// 3️⃣ DELETE SUBMISSION
//
async function deleteSubmission(req, res) {
  try {
    const id = req.params.id;

    const deleted = await findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    return res.json({
      success: true,
      message: "Submission deleted successfully",
    });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default {
  listSubmissions,
  updateSubmission,
  deleteSubmission,
};

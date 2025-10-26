// backend/routes/admin.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Submission from "../models/Submission.js";
import AdminUser from "../models/AdminUser.js";
import { sendMail } from "../services/email.js";

const router = express.Router();

/**
 * Middleware: Verify JWT token and admin role
 */
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/**
 * POST /api/admin/login
 * Authenticate admin and return JWT
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    const admin = await AdminUser.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /api/admin/submissions
 * Fetch all submissions (latest first)
 */
router.get("/submissions", verifyAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ createdAt: -1 });
    res.json({ success: true, submissions });
  } catch (err) {
    console.error("❌ Error fetching submissions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * PUT /api/admin/submissions/:id
 * Update a submission (status/details)
 */
router.put("/submissions/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const submission = await Submission.findByIdAndUpdate(id, updates, { new: true });
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    // If status is completed and user has email → notify
    if (updates.status === "Completed" && submission.email) {
      try {
        await sendMail({
          to: submission.email,
          subject: `Your request ${submission.orderRef} is completed`,
          text: `Hello ${submission.name},\n\nYour request (${submission.orderRef}) has been completed.\n\nThank you,\nFixIt Online`
        });
      } catch (e) {
        console.warn("⚠️ Email failed:", e.message);
      }
    }

    res.json({ success: true, submission });
  } catch (err) {
    console.error("❌ Error updating submission:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * DELETE /api/admin/submissions/:id
 * Delete a submission
 */
router.delete("/submissions/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findByIdAndDelete(id);

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    res.json({ success: true, message: "Submission deleted" });
  } catch (err) {
    console.error("❌ Error deleting submission:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;

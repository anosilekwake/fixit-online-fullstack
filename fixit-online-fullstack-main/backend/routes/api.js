// routes/api.js
import express from 'express';
import Submission from '../models/Submission.js';
import requireAdmin from '../middleware/requireAdmin.js';
import crypto from 'crypto';

const router = express.Router();

// Public: receive form submission
router.post('/submit', async (req, res) => {
  try {
    const { name, phone, email, service, details, source } = req.body;
    if (!name || !phone || !details) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const orderRef = `FI-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

    const sub = await Submission.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      service: service || 'Other',
      details: details.trim(),
      orderRef,
      source: source || 'landing-page'
    });

    // OPTIONAL: trigger WhatsApp or notification here (queue job)
    return res.json({ success: true, data: sub });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Protected: get all submissions (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const rows = await Submission.find().sort({ createdAt: -1 }).limit(1000);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Protected: optionally delete a submission
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Submission.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

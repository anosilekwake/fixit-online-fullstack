// backend/services/email.js
import nodemailer from "nodemailer";

// create transporter (configure with your SMTP / Gmail / Mailtrap credentials)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false, // true if using port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ sendMail function
export async function sendMail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"FixIt Online" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    throw err;
  }
}

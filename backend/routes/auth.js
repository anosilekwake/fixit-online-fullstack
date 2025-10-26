import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /api/auth/admin-login
router.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  // For now: hardcoded credentials
  if (username === "lekwaleamos@gmail.com" && password === "lgm3wvk3") {
    const token = jwt.sign(
      { isAdmin: true, username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

export default router;

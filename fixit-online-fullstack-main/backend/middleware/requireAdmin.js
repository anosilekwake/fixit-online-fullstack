// middleware/requireAdmin.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export default function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Missing token' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'admin') {
      req.admin = decoded;
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
}

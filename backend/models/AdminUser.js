// backend/models/AdminUser.js
import mongoose from "mongoose";

const adminUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean, default: true ,
    },
  },
  { timestamps: true }
);

// ✅ Export as default
const AdminUser = mongoose.model("AdminUser", adminUserSchema);
export default AdminUser;

import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    service: {
      type: String,
      required: false,
      trim: true,
    },

    details: {
      type: String,
      required: false,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;

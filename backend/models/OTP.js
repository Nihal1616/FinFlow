const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional for signup verification
    },
    code: { type: String, required: true }, // 6-digit code
    channel: { type: String, enum: ["email", "sms"], required: true },
    target: { type: String, required: true }, // email or phone number
    purpose: {
      type: String,
      enum: ["signup", "login", "transaction"],
      required: true,
    },
    isVerified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OTP", otpSchema);

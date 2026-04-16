const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    code: { type: String, required: true },
    channel: { type: String, enum: ["email", "sms"], required: true },
    target: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["signup", "login", "transaction", "forgot-pin"],
      required: true,
    },
    isVerified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OTP", otpSchema);

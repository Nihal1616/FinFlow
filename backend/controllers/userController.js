const User = require("../models/User");
const Wallet = require("../models/Wallet");
const { createAndSendOTP, verifyOTP } = require("../services/otpService");

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    const balance = req.isDecoySession
      ? req.user.decoyBalance
      : (wallet?.balance ?? 0);
    res.json({
      success: true,
      user: req.user,
      wallet: { ...wallet?.toObject(), balance },
      isDecoySession: req.isDecoySession,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/search?q=
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Query must be at least 2 characters",
        });
    }
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ],
    })
      .select("name email phone")
      .limit(10);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/upi-pin
exports.setUpiPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const pinStr = String(pin).trim();
    if (!pinStr || !/^\d{4,6}$/.test(pinStr)) {
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4-6 digits" });
    }
    const user = await User.findById(req.user._id);
    user.upiPin = pinStr;
    await user.save();
    res.json({ success: true, message: "UPI PIN updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/decoy-pin  — set or update decoy PIN
exports.setDecoyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const pinStr = String(pin).trim();
    if (!pinStr || !/^\d{4,6}$/.test(pinStr)) {
      return res
        .status(400)
        .json({ success: false, message: "Decoy PIN must be 4-6 digits" });
    }
    // Ensure decoy PIN ≠ real PIN
    if (req.user.upiPin) {
      const sameAsReal = await req.user.compareUpiPin(pinStr);
      if (sameAsReal) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Decoy PIN must differ from your UPI PIN",
          });
      }
    }
    const user = await User.findById(req.user._id);
    user.decoyPin = pinStr;
    await user.save();
    res.json({ success: true, message: "Decoy PIN set successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/decoy-balance  — set fake balance shown in decoy mode
exports.setDecoyBalance = async (req, res) => {
  try {
    const { balance } = req.body;
    if (typeof balance !== "number" || balance < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid balance" });
    }
    await User.findByIdAndUpdate(req.user._id, { decoyBalance: balance });
    res.json({ success: true, message: "Decoy balance updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/forgot-pin/request  — send OTP to reset PIN
exports.forgotPinRequest = async (req, res) => {
  try {
    const otpData = await createAndSendOTP(
      req.user._id,
      "email",
      req.user.email,
      "forgot-pin",
    );
    res.json({ success: true, message: "OTP sent to your email", otpData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/forgot-pin/reset  — verify OTP and set new PIN
exports.forgotPinReset = async (req, res) => {
  try {
    const { otpCode, newPin } = req.body;
    const pinStr = String(newPin).trim();
    if (!pinStr || !/^\d{4,6}$/.test(pinStr)) {
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4-6 digits" });
    }

    await verifyOTP(req.user._id, otpCode, "forgot-pin");

    const user = await User.findById(req.user._id);
    user.upiPin = pinStr;
    await user.save();

    res.json({ success: true, message: "PIN reset successfully" });
  } catch (err) {
    res
      .status(400)
      .json({ success: false, message: err.message || "PIN reset failed" });
  }
};

// POST /api/users/forgot-decoy-pin/request  — send OTP to reset decoy PIN
exports.forgotDecoyPinRequest = async (req, res) => {
  try {
    const otpData = await createAndSendOTP(
      req.user._id,
      "email",
      req.user.email,
      "forgot-decoy-pin",
    );
    res.json({ success: true, message: "OTP sent to your email", otpData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/forgot-decoy-pin/reset  — verify OTP and set new decoy PIN
exports.forgotDecoyPinReset = async (req, res) => {
  try {
    const { otpCode, newDecoyPin } = req.body;
    const pinStr = String(newDecoyPin).trim();
    if (!pinStr || !/^\d{4,6}$/.test(pinStr)) {
      return res
        .status(400)
        .json({ success: false, message: "Decoy PIN must be 4-6 digits" });
    }

    await verifyOTP(req.user._id, otpCode, "forgot-decoy-pin");

    const user = await User.findById(req.user._id);
    user.decoyPin = pinStr;
    await user.save();

    res.json({ success: true, message: "Decoy PIN reset successfully" });
  } catch (err) {
    res
      .status(400)
      .json({
        success: false,
        message: err.message || "Decoy PIN reset failed",
      });
  }
};

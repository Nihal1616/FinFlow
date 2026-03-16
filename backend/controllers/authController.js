const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      const field = existing.email === email ? "Email" : "Phone";
      return res
        .status(409)
        .json({ success: false, message: `${field} already registered` });
    }

    const user = await User.create({ name, email, phone, password });

    // Auto-create wallet
    await Wallet.create({ userId: user._id, balance: 0 });

    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    if (err.code === 11000) {
      const dupKey =
        Object.keys(err.keyPattern || err.keyValue || {})[0] || "field";
      const label = dupKey.charAt(0).toUpperCase() + dupKey.slice(1);
      return res
        .status(409)
        .json({ success: false, message: `${label} already registered` });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ success: true, user: req.user });
};

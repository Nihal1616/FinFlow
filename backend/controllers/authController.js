const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const { createAndSendOTP, verifyOTP } = require("../services/otpService");

const pendingRegistrations = new Map();

const signToken = (userId, extra = {}) =>
  jwt.sign({ userId, ...extra }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const serializeUser = (user) => {
  const base =
    user && typeof user.toJSON === "function" ? user.toJSON() : { ...user };
  return {
    ...base,
    hasUpiPin: Boolean(user?.upiPin),
    hasDecoyPin: Boolean(user?.decoyPin),
  };
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await User.findOne({
      $or: [{ email }, { phone }],
      isVerified: true,
    });
    if (existing) {
      const field = existing.email === email ? "Email" : "Phone";
      return res
        .status(409)
        .json({ success: false, message: `${field} already registered` });
    }

    const pendingKey = `${email}-${phone}`;
    if (pendingRegistrations.has(pendingKey)) {
      return res.status(409).json({
        success: false,
        message:
          "Registration already in progress. Please check your email for OTP.",
      });
    }

    const registrationId = Date.now().toString();
    pendingRegistrations.set(registrationId, {
      name,
      email,
      phone,
      password,
      createdAt: new Date(),
    });

    const otpData = await createAndSendOTP(null, "email", email, "signup");

    for (const [key, data] of pendingRegistrations.entries()) {
      if (Date.now() - data.createdAt.getTime() > 10 * 60 * 1000) {
        pendingRegistrations.delete(key);
      }
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to email. Please verify to complete registration.",
      registrationId,
      otpData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/verify-signup-otp
exports.verifySignupOTP = async (req, res) => {
  try {
    const { registrationId, otpCode } = req.body;
    if (!registrationId || !otpCode) {
      return res.status(400).json({
        success: false,
        message: "Missing registrationId or OTP code",
      });
    }

    const registrationData = pendingRegistrations.get(registrationId);
    if (!registrationData) {
      return res.status(400).json({
        success: false,
        message: "Registration session expired. Please register again.",
      });
    }

    await verifyOTP(null, otpCode, "signup", registrationData.email);

    const user = await User.create({
      name: registrationData.name,
      email: registrationData.email,
      phone: registrationData.phone,
      password: registrationData.password,
      isVerified: true,
    });

    await Wallet.create({ userId: user._id, balance: 0 });
    pendingRegistrations.delete(registrationId);

    const token = signToken(user._id);
    res.json({
      success: true,
      message: "Registration completed successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        hasUpiPin: false,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "OTP verification failed",
    });
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
        .json({ success: false, message: "Incorrect email/phone or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Account not verified. Please complete registration first.",
      });
    }

    const channel = identifier.includes("@") ? "email" : "sms";
    const target = channel === "email" ? user.email : user.phone;
    const otpData = await createAndSendOTP(user._id, channel, target, "login");

    res.json({
      success: true,
      message: "OTP sent for verification",
      userId: user._id,
      otpData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/verify-login-otp
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { userId, otpCode } = req.body;
    if (!userId || !otpCode) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or OTP code" });
    }

    await verifyOTP(userId, otpCode, "login");
    const user = await User.findById(userId);
    const token = signToken(user._id);
    res.json({ success: true, token, user: serializeUser(user) });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "OTP verification failed",
    });
  }
};

// POST /api/auth/decoy-login — login with decoy PIN to get a decoy-session token
exports.decoyLogin = async (req, res) => {
  try {
    const { identifier, decoyPin } = req.body;
    if (!identifier || !decoyPin) {
      return res
        .status(400)
        .json({ success: false, message: "Missing identifier or decoyPin" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (!user.decoyPin) {
      return res
        .status(400)
        .json({ success: false, message: "Decoy wallet not configured" });
    }

    const isValid = await user.compareDecoyPin(String(decoyPin).trim());
    if (!isValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid decoy PIN" });
    }

    // Issue a JWT flagged as decoy session
    const token = signToken(user._id, { isDecoySession: true });

    res.json({
      success: true,
      token,
      isDecoySession: true,
      user: serializeUser(user),
      decoyBalance: user.decoyBalance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({
    success: true,
    user: serializeUser(req.user),
    isDecoySession: req.isDecoySession,
  });
};

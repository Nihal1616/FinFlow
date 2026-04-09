const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const { createAndSendOTP, verifyOTP } = require("../services/otpService");

// Temporary storage for pending registrations (in production, use Redis or database)
const pendingRegistrations = new Map();

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists and is verified
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

    // Check if there's already a pending registration for this email/phone
    const pendingKey = `${email}-${phone}`;
    if (pendingRegistrations.has(pendingKey)) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Registration already in progress. Please check your email for OTP.",
        });
    }

    // Store registration data temporarily
    const registrationId = Date.now().toString();
    pendingRegistrations.set(registrationId, {
      name,
      email,
      phone,
      password,
      createdAt: new Date(),
    });

    // Generate and send OTP for email verification
    const otpData = await createAndSendOTP(null, "email", email, "signup");

    // Clean up old pending registrations (older than 10 minutes)
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing registrationId or OTP code",
        });
    }

    // Get pending registration data
    const registrationData = pendingRegistrations.get(registrationId);
    if (!registrationData) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Registration session expired. Please register again.",
        });
    }

    // Verify OTP (pass null as userId since user doesn't exist yet)
    await verifyOTP(null, otpCode, "signup", registrationData.email);

    // Create the user account now that OTP is verified
    const user = await User.create({
      name: registrationData.name,
      email: registrationData.email,
      phone: registrationData.phone,
      password: registrationData.password,
      isVerified: true,
    });

    // Create wallet for the user
    await Wallet.create({ userId: user._id, balance: 0 });

    // Remove from pending registrations
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

    // Check if user is verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Account not verified. Please complete registration first.",
        });
    }

    // Generate and send OTP for login verification
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

    res.json({ success: true, token, user });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "OTP verification failed",
    });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ success: true, user: req.user });
};

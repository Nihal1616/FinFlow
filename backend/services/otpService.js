const OTP = require("../models/OTP");
const nodemailer = require("nodemailer");

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email or SMS
const sendOTP = async (channel, target, code) => {
  if (channel === "email") {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: target,
        subject: "FinFlow - Your Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
              <h2 style="color: #333; margin-bottom: 10px;">FinFlow</h2>
              <p style="color: #666; margin-bottom: 20px;">Your secure digital payment platform</p>
            </div>

            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; margin-top: 20px; text-align: center; border: 1px solid #e9ecef;">
              <h3 style="color: #333; margin-bottom: 20px;">Verification Code</h3>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px;">${code}</span>
              </div>
              <p style="color: #666; margin-top: 20px;">
                This code will expire in <strong>3 minutes</strong>.<br>
                Please do not share this code with anyone.
              </p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>If you didn't request this code, please ignore this email.</p>
              <p>© 2024 FinFlow. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SENT] OTP sent to: ${target}`);
    } catch (error) {
      console.error(
        `[EMAIL ERROR] Failed to send OTP to ${target}:`,
        error.message,
      );
      console.error(`[EMAIL ERROR] Full error:`, error);
      throw new Error("Failed to send email OTP");
    }
  } else if (channel === "sms") {
    // For SMS, you would integrate with services like Twilio, AWS SNS, etc.
    console.log(
      `[SMS OTP] To: ${target}, Code: ${code} (SMS integration needed)`,
    );
  }
};

// Create and send OTP
exports.createAndSendOTP = async (userId, channel, target, purpose) => {
  try {
    // Delete any existing unverified OTPs for this target and purpose
    const deleteCriteria = userId
      ? { userId, purpose, isVerified: false }
      : { target, purpose, isVerified: false };
    await OTP.deleteMany(deleteCriteria);

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    const otp = await OTP.create({
      userId, // Can be null for signup
      code,
      channel,
      target,
      purpose,
      expiresAt,
    });

    // Send OTP
    await sendOTP(channel, target, code);

    return {
      otpId: otp._id,
      maskedTarget: maskTarget(target, channel),
      channel,
      expiresIn: 180, // seconds (3 minutes)
      // Include OTP code in response for testing (remove in production)
      testOtp: code,
    };
  } catch (err) {
    throw new Error(`Failed to create OTP: ${err.message}`);
  }
};

// Verify OTP
exports.verifyOTP = async (userId, otpCode, purpose, email = null) => {
  try {
    // For signup verification, search by email instead of userId
    const searchCriteria = userId
      ? { userId, purpose, isVerified: false, expiresAt: { $gt: new Date() } }
      : {
          target: email,
          purpose,
          isVerified: false,
          expiresAt: { $gt: new Date() },
        };

    const otp = await OTP.findOne(searchCriteria);

    if (!otp) {
      throw new Error("OTP expired or not found");
    }

    if (otp.attempts >= 5) {
      throw new Error("Too many failed attempts. Request a new OTP.");
    }

    if (otp.code !== otpCode) {
      otp.attempts += 1;
      await otp.save();
      throw new Error("Invalid OTP code");
    }

    otp.isVerified = true;
    await otp.save();

    return true;
  } catch (err) {
    throw err;
  }
};

// Mask target for display
const maskTarget = (target, channel) => {
  if (channel === "email") {
    const [local, domain] = target.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  } else if (channel === "sms") {
    return `****${target.slice(-4)}`;
  }
  return target;
};

exports.maskTarget = maskTarget;

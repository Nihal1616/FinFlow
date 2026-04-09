const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    upiPin: { type: String, required: false }, // 4-6 digit PIN, hashed
    isVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ["pending", "complete"],
      default: "pending",
    },
    avatar: { type: String, default: "" },
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Hash UPI PIN before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("upiPin") || !this.upiPin) return next();
  this.upiPin = await bcrypt.hash(this.upiPin, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Compare UPI PIN
userSchema.methods.compareUpiPin = function (plain) {
  if (!this.upiPin) return false;
  const pinStr = String(plain).trim();
  return bcrypt.compare(pinStr, this.upiPin);
};

// Omit password and upiPin from JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.upiPin;
  return obj;
};

module.exports = mongoose.model("User", userSchema);

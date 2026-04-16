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
    upiPin: { type: String, required: false },

    // ── Decoy Wallet Fields ──────────────────────────────────────────────
    decoyPin: { type: String, required: false },
    decoyBalance: { type: Number, default: 1250.75 },

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

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("upiPin") || !this.upiPin) return next();
  this.upiPin = await bcrypt.hash(this.upiPin, 12);
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("decoyPin") || !this.decoyPin) return next();
  this.decoyPin = await bcrypt.hash(this.decoyPin, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.compareUpiPin = function (plain) {
  if (!this.upiPin) return Promise.resolve(false);
  return bcrypt.compare(String(plain).trim(), this.upiPin);
};

userSchema.methods.compareDecoyPin = function (plain) {
  if (!this.decoyPin) return Promise.resolve(false);
  return bcrypt.compare(String(plain).trim(), this.decoyPin);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.upiPin;
  delete obj.decoyPin;
  return obj;
};

module.exports = mongoose.model("User", userSchema);

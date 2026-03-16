const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:    { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    isVerified: { type: Boolean, default: false },
    kycStatus:  { type: String, enum: ['pending', 'complete'], default: 'pending' },
    avatar:   { type: String, default: '' },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Omit password from JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

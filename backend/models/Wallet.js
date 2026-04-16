const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    currency:{ type: String, default: 'INR' },
    isActive:{ type: Boolean, default: true },
    dailyLimit:   { type: Number, default: 25000 },
    monthlyLimit: { type: Number, default: 200000 },
  },
  { timestamps: true }
);

// Ensure balance is never negative
walletSchema.methods.debit = async function (amount) {
  if (this.balance < amount) throw new Error('Insufficient balance');
  this.balance = parseFloat((this.balance - amount).toFixed(2));
  return this.save();
};

walletSchema.methods.credit = async function (amount) {
  this.balance = parseFloat((this.balance + amount).toFixed(2));
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);

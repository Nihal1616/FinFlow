const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      default: () =>
        "TXN" + uuidv4().replace(/-/g, "").toUpperCase().slice(0, 12),
      unique: true,
    },
    type: {
      type: String,
      enum: ["transfer", "credit", "debit"],
      default: "transfer",
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    note: { type: String, maxlength: 200, default: "" },
    isFraudSuspected: { type: Boolean, default: false },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

transactionSchema.index({ senderId: 1, createdAt: -1 });
transactionSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);

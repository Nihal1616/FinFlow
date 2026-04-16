const mongoose = require("mongoose");

const splitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    share: { type: Number, required: true, min: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    totalAmount: { type: Number, required: true, min: 1 },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    splitType: { type: String, enum: ["equal", "custom"], default: "equal" },
    splits: [splitSchema],
    currency: { type: String, default: "INR" },
    note: { type: String, maxlength: 300, default: "" },
    isSettled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);

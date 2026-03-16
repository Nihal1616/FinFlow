const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

// GET /api/wallet/balance
exports.getBalance = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user._id, balance: 0 });
      console.log(`[Wallet] Auto-created wallet for user ${req.user._id}`);
    }
    res.json({
      success: true,
      balance: wallet.balance,
      currency: wallet.currency,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/add-money
exports.addMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, method = "UPI" } = req.body;
    if (amount > 100000) {
      return res
        .status(400)
        .json({ success: false, message: "Maximum ₹1,00,000 per top-up" });
    }

    let wallet = await Wallet.findOne({ userId: req.user._id }).session(
      session,
    );
    if (!wallet) {
      wallet = await Wallet.create([{ userId: req.user._id, balance: 0 }], {
        session,
      });
      wallet = wallet[0];
    }

    await wallet.credit(amount);

    const tx = await Transaction.create(
      [
        {
          type: "credit",
          receiverId: req.user._id,
          amount,
          status: "success",
          note: `Wallet top-up via ${method}`,
          metadata: { method },
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res.json({ success: true, balance: wallet.balance, transaction: tx[0] });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

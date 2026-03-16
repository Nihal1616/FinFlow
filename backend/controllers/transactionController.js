const mongoose = require("mongoose");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const FRAUD_THRESHOLD = parseInt(process.env.FRAUD_THRESHOLD) || 10000;

// POST /api/transactions/send
exports.sendMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { identifier, amount, note } = req.body;

    // Find receiver
    const receiver = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!receiver) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }
    if (receiver._id.equals(req.user._id)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot send money to yourself" });
    }

    // Fetch wallets and auto-create missing ones
    let senderWallet = await Wallet.findOne({ userId: req.user._id }).session(
      session,
    );
    if (!senderWallet) {
      senderWallet = await Wallet.create(
        [{ userId: req.user._id, balance: 0 }],
        { session },
      );
      senderWallet = senderWallet[0];
    }

    let receiverWallet = await Wallet.findOne({ userId: receiver._id }).session(
      session,
    );
    if (!receiverWallet) {
      receiverWallet = await Wallet.create(
        [{ userId: receiver._id, balance: 0 }],
        { session },
      );
      receiverWallet = receiverWallet[0];
    }

    // Check balance
    if (senderWallet.balance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    // Fraud detection
    const isFraud = amount >= FRAUD_THRESHOLD;

    // Atomic debit/credit
    await senderWallet.debit(amount);
    await receiverWallet.credit(amount);

    // Create transaction record
    const [tx] = await Transaction.create(
      [
        {
          type: "transfer",
          senderId: req.user._id,
          receiverId: receiver._id,
          amount,
          status: "success",
          note: note || "Transfer",
          isFraudSuspected: isFraud,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // Real-time notification via Socket.io
    const { io, connectedUsers } = req.app.locals;
    const receiverSocketId = connectedUsers.get(receiver._id.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("payment_received", {
        from: req.user.name,
        amount,
        transactionId: tx.transactionId,
        timestamp: tx.createdAt,
      });
    }

    // Fraud alert to sender
    if (isFraud) {
      const senderSocketId = connectedUsers.get(req.user._id.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("fraud_alert", {
          message: `Large transaction of ₹${amount} flagged for review`,
          transactionId: tx.transactionId,
        });
      }
    }

    res.json({
      success: true,
      transaction: tx,
      senderBalance: senderWallet.balance,
      fraudAlert: isFraud,
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// GET /api/transactions/history
exports.getHistory = async (req, res) => {
  try {
    const { type, page = 1, limit = 20, from, to } = req.query;
    const userId = req.user._id;

    let filter = { $or: [{ senderId: userId }, { receiverId: userId }] };

    if (type === "sent") filter = { senderId: userId };
    if (type === "received") filter = { receiverId: userId };

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("senderId", "name email phone")
        .populate("receiverId", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/transactions/:id
exports.getOne = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ transactionId: req.params.id })
      .populate("senderId", "name email phone")
      .populate("receiverId", "name email phone");
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

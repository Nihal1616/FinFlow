const mongoose = require("mongoose");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { createAndSendOTP, verifyOTP } = require("../services/otpService");
const { analyzeIntent } = require("../utils/intentAnalyzer");

const FRAUD_THRESHOLD = parseInt(process.env.FRAUD_THRESHOLD) || 10000;
const HIGH_VALUE_THRESHOLD = 5000;

// POST /api/transactions/request-otp
exports.requestTransactionOTP = async (req, res) => {
  try {
    const { amount } = req.body;

    if (amount < HIGH_VALUE_THRESHOLD) {
      return res.status(400).json({
        success: false,
        message: `OTP only required for transactions >= ₹${HIGH_VALUE_THRESHOLD}`,
      });
    }

    const channel = "sms";
    const otpData = await createAndSendOTP(
      req.user._id,
      channel,
      req.user.phone,
      "transaction",
    );

    res.json({
      success: true,
      message: "OTP sent to your registered phone",
      otpData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/transactions/analyze
exports.analyzeTransaction = async (req, res) => {
  try {
    const { amount, recipientIdentifier } = req.body;

    // Find recipient
    const recipient = await User.findOne({
      $or: [{ email: recipientIdentifier }, { phone: recipientIdentifier }],
    });

    // Fetch sender's recent history (last 20 transactions)
    const history = await Transaction.find({ senderId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const analysis = analyzeIntent({
      amount,
      recipientId: recipient ? recipient._id.toString() : null,
      time: new Date(),
      history,
      senderId: req.user._id.toString(),
    });

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/transactions/send
exports.sendMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { identifier, amount, note, pin, transactionOtp } = req.body;

    // ── Decoy session guard ──────────────────────────────────────────────
    if (req.isDecoySession) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Real transfers are disabled in decoy mode.",
      });
    }

    // ── Intent analysis ─────────────────────────────────────────────────
    const recipient = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    const history = await Transaction.find({ senderId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const intentResult = analyzeIntent({
      amount,
      recipientId: recipient ? recipient._id.toString() : null,
      time: new Date(),
      history,
      senderId: req.user._id.toString(),
    });

    // Block if high risk
    if (intentResult.action === "block") {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        blocked: true,
        riskScore: intentResult.riskScore,
        reasons: intentResult.reasons,
        message: "Transaction blocked due to high fraud risk.",
      });
    }

    // OTP required for medium risk or high value
    const needsOtp =
      intentResult.action === "otp" || amount >= HIGH_VALUE_THRESHOLD;

    if (needsOtp) {
      if (!transactionOtp) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          requiresOtp: true,
          riskScore: intentResult.riskScore,
          reasons: intentResult.reasons,
          message: "OTP required for this transaction",
        });
      }

      try {
        await verifyOTP(req.user._id, transactionOtp, "transaction");
      } catch (err) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid transaction OTP",
        });
      }
    }

    // ── PIN verification ─────────────────────────────────────────────────
    const pinStr = String(pin).trim();

    if (!req.user.upiPin) {
      return res.status(400).json({
        success: false,
        message: "UPI PIN not set. Please set your PIN in Profile settings first.",
      });
    }

    if (!pinStr || pinStr.length < 4 || pinStr.length > 6 || !/^\d+$/.test(pinStr)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PIN format. PIN must be 4-6 digits.",
      });
    }

    const isPinValid = await req.user.compareUpiPin(pinStr);
    if (!isPinValid) {
      return res.status(400).json({ success: false, message: "Invalid UPI PIN" });
    }

    // ── Find receiver ────────────────────────────────────────────────────
    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }
    if (recipient._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: "Cannot send money to yourself" });
    }

    // ── Fetch wallets ────────────────────────────────────────────────────
    let senderWallet = await Wallet.findOne({ userId: req.user._id }).session(session);
    if (!senderWallet) {
      senderWallet = (await Wallet.create([{ userId: req.user._id, balance: 0 }], { session }))[0];
    }

    let receiverWallet = await Wallet.findOne({ userId: recipient._id }).session(session);
    if (!receiverWallet) {
      receiverWallet = (await Wallet.create([{ userId: recipient._id, balance: 0 }], { session }))[0];
    }

    if (senderWallet.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const isFraud = amount >= FRAUD_THRESHOLD;

    await senderWallet.debit(amount);
    await receiverWallet.credit(amount);

    const [tx] = await Transaction.create(
      [
        {
          type: "transfer",
          senderId: req.user._id,
          receiverId: recipient._id,
          amount,
          status: "success",
          note: note || "Transfer",
          isFraudSuspected: isFraud,
          metadata: {
            riskScore: intentResult.riskScore,
            riskReasons: intentResult.reasons,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // Real-time notifications
    const { io, connectedUsers } = req.app.locals;
    const receiverSocketId = connectedUsers.get(recipient._id.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("payment_received", {
        from: req.user.name,
        amount,
        transactionId: tx.transactionId,
        timestamp: tx.createdAt,
      });
    }

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
      riskScore: intentResult.riskScore,
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

    // In decoy mode, return empty or fake transactions
    if (req.isDecoySession) {
      return res.json({
        success: true,
        transactions: generateDecoyTransactions(req.user),
        pagination: { page: 1, limit: 20, total: 5, pages: 1 },
      });
    }

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
    if (req.isDecoySession) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    const tx = await Transaction.findOne({ transactionId: req.params.id })
      .populate("senderId", "name email phone")
      .populate("receiverId", "name email phone");
    if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Generate fake decoy transactions for display
function generateDecoyTransactions(user) {
  const fakeNames = ["Priya Sharma", "Rahul Verma", "Amit Singh", "Neha Gupta", "Rohan Mehta"];
  return [
    {
      transactionId: "TXN000DECOY01",
      type: "transfer",
      senderId: { name: user.name, email: user.email },
      receiverId: { name: fakeNames[0] },
      amount: 500,
      status: "success",
      note: "Dinner",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      transactionId: "TXN000DECOY02",
      type: "credit",
      senderId: { name: fakeNames[1] },
      receiverId: { name: user.name, email: user.email },
      amount: 250,
      status: "success",
      note: "Shared groceries",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      transactionId: "TXN000DECOY03",
      type: "transfer",
      senderId: { name: user.name, email: user.email },
      receiverId: { name: fakeNames[2] },
      amount: 100,
      status: "success",
      note: "Coffee",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

const mongoose = require("mongoose");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// POST /api/split/groups
exports.createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const allMemberIds = [
      ...new Set([req.user._id.toString(), ...(memberIds || [])]),
    ];
    const members = allMemberIds.map((userId) => ({ userId }));
    const group = await Group.create({
      name,
      description,
      createdBy: req.user._id,
      members,
    });
    await group.populate("members.userId", "name email phone");
    res.status(201).json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/split/groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      "members.userId": req.user._id,
      isActive: true,
    })
      .populate("members.userId", "name email phone")
      .populate("createdBy", "name email")
      .sort({ updatedAt: -1 });
    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/split/groups/:groupId
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members.userId", "name email phone")
      .populate("createdBy", "name email");
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    const isMember = group.members.some((m) =>
      m.userId._id.equals(req.user._id),
    );
    if (!isMember)
      return res
        .status(403)
        .json({ success: false, message: "Not a group member" });

    const expenses = await Expense.find({ groupId: group._id })
      .populate("paidBy", "name email")
      .populate("splits.userId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, group, expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/split/groups/:groupId/expenses
exports.addExpense = async (req, res) => {
  try {
    const { title, totalAmount, splitType, customSplits, note } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    const isMember = group.members.some((m) => m.userId.equals(req.user._id));
    if (!isMember)
      return res
        .status(403)
        .json({ success: false, message: "Not a group member" });

    let splits;
    if (splitType === "custom") {
      if (!Array.isArray(customSplits) || customSplits.length === 0) {
        const share = parseFloat(
          (totalAmount / group.members.length).toFixed(2),
        );
        splits = group.members.map((m) => ({ userId: m.userId, share }));
      } else {
        splits = customSplits;
      }
    } else {
      const share = parseFloat((totalAmount / group.members.length).toFixed(2));
      splits = group.members.map((m) => ({ userId: m.userId, share }));
    }

    // Mark paidBy member as already paid
    splits = splits.map((s) => ({
      ...s,
      isPaid: s.userId.toString() === req.user._id.toString(),
      paidAt:
        s.userId.toString() === req.user._id.toString()
          ? new Date()
          : undefined,
    }));

    const expense = await Expense.create({
      groupId: group._id,
      title,
      totalAmount,
      paidBy: req.user._id,
      splitType: splitType || "equal",
      splits,
      note,
    });

    await expense.populate("paidBy", "name email");
    await expense.populate("splits.userId", "name email");

    res.status(201).json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/split/expenses/:expenseId/settle
exports.settleExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { pin } = req.body;

    // Verify PIN
    const pinStr = String(pin).trim();
    if (!req.user.upiPin) {
      return res
        .status(400)
        .json({ success: false, message: "UPI PIN not set" });
    }
    const isPinValid = await req.user.compareUpiPin(pinStr);
    if (!isPinValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid UPI PIN" });
    }

    const expense = await Expense.findById(req.params.expenseId).session(
      session,
    );
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    const mySplit = expense.splits.find((s) => s.userId.equals(req.user._id));
    if (!mySplit)
      return res
        .status(403)
        .json({ success: false, message: "You are not part of this expense" });
    if (mySplit.isPaid)
      return res
        .status(400)
        .json({ success: false, message: "Already settled" });

    // Deduct from payer's wallet, credit to expense creator
    let payerWallet = await Wallet.findOne({ userId: req.user._id }).session(
      session,
    );
    if (!payerWallet || payerWallet.balance < mySplit.share) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    let receiverWallet = await Wallet.findOne({
      userId: expense.paidBy,
    }).session(session);
    if (!receiverWallet) {
      receiverWallet = (
        await Wallet.create([{ userId: expense.paidBy, balance: 0 }], {
          session,
        })
      )[0];
    }

    await payerWallet.debit(mySplit.share);
    await receiverWallet.credit(mySplit.share);

    // Record transaction
    await Transaction.create(
      [
        {
          type: "transfer",
          senderId: req.user._id,
          receiverId: expense.paidBy,
          amount: mySplit.share,
          status: "success",
          note: `Split settlement: ${expense.title}`,
          metadata: { expenseId: expense._id },
        },
      ],
      { session },
    );

    // Mark this split as paid
    mySplit.isPaid = true;
    mySplit.paidAt = new Date();

    // Check if all splits paid
    const allPaid = expense.splits.every(
      (s) => s.isPaid || s.userId.equals(req.user._id),
    );
    if (allPaid) expense.isSettled = true;

    await expense.save({ session });
    await session.commitTransaction();

    res.json({ success: true, message: "Settlement successful", expense });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// GET /api/split/balances — summary of what you owe / are owed
exports.getBalances = async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({
      "splits.userId": userId,
    }).populate("paidBy", "name email");

    let youOwe = 0;
    let youAreOwed = 0;
    const details = [];

    for (const expense of expenses) {
      if (expense.paidBy._id.equals(userId)) {
        // You paid — sum unpaid splits from others
        const unpaid = expense.splits.filter(
          (s) => !s.userId.equals(userId) && !s.isPaid,
        );
        const owedToYou = unpaid.reduce((sum, s) => sum + s.share, 0);
        youAreOwed += owedToYou;
        if (owedToYou > 0) {
          details.push({
            type: "owed_to_you",
            expense: expense.title,
            amount: owedToYou,
          });
        }
      } else {
        const mySplit = expense.splits.find((s) => s.userId.equals(userId));
        if (mySplit && !mySplit.isPaid) {
          youOwe += mySplit.share;
          details.push({
            type: "you_owe",
            expense: expense.title,
            amount: mySplit.share,
            to: expense.paidBy.name,
          });
        }
      }
    }

    res.json({
      success: true,
      summary: {
        youOwe: parseFloat(youOwe.toFixed(2)),
        youAreOwed: parseFloat(youAreOwed.toFixed(2)),
        net: parseFloat((youAreOwed - youOwe).toFixed(2)),
      },
      details,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const User = require('../models/User');
const Wallet = require('../models/Wallet');

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    res.json({ success: true, user: req.user, wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/search?q=
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
    }
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { name:  { $regex: q, $options: 'i' } },
      ],
    }).select('name email phone').limit(10);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

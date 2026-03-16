/**
 * seed.js — Run once to populate demo users and wallets
 * Usage: cd backend && node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const Wallet   = require('./models/Wallet');
const Transaction = require('./models/Transaction');

const USERS = [
  { name: 'Priya Kapoor',  email: 'priya@finflow.app',  phone: '+91 98765 10001', password: 'demo1234', balance: 12450.50 },
  { name: 'Rahul Mehta',   email: 'rahul@finflow.app',  phone: '+91 98765 10002', password: 'demo1234', balance: 8200.00 },
  { name: 'Ananya Singh',  email: 'ananya@finflow.app', phone: '+91 98765 10003', password: 'demo1234', balance: 3700.75 },
  { name: 'Dev Patel',     email: 'dev@finflow.app',    phone: '+91 98765 10004', password: 'demo1234', balance: 25000.00 },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[Seed] Connected to MongoDB');

  // Clear existing
  await Promise.all([User.deleteMany({}), Wallet.deleteMany({}), Transaction.deleteMany({})]);
  console.log('[Seed] Cleared existing data');

  const createdUsers = [];
  for (const u of USERS) {
    const { balance, ...userData } = u;
    const user   = await User.create(userData);
    await Wallet.create({ userId: user._id, balance });
    createdUsers.push(user);
    console.log(`[Seed] Created user: ${user.name} (${user.email})`);
  }

  // Seed some transactions between users
  const [priya, rahul, ananya, dev] = createdUsers;
  const txSeed = [
    { senderId: rahul._id, receiverId: priya._id, amount: 500,  note: 'Lunch split' },
    { senderId: priya._id, receiverId: ananya._id, amount: 1200, note: 'Movie tickets' },
    { senderId: dev._id,   receiverId: priya._id, amount: 3000, note: 'Rent share' },
    { senderId: priya._id, receiverId: rahul._id, amount: 250,  note: 'Coffee' },
  ];
  for (const tx of txSeed) {
    await Transaction.create({ ...tx, type: 'transfer', status: 'success' });
  }
  console.log('[Seed] Created sample transactions');

  await mongoose.disconnect();
  console.log('[Seed] Done! ✓');
}

seed().catch(err => { console.error('[Seed] Error:', err); process.exit(1); });

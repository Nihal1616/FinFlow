# FinFlow – Secure Digital Wallet

A full-stack digital wallet application with advanced security features.

## Features

### Core
- Register / Login with OTP verification (Email/SMS)
- Wallet balance, top-up, and transfers
- Real-time notifications via Socket.io
- Transaction history with filters
- QR Pay

### ✨ New Features Integrated

#### 1. 🔐 Secure Transaction PIN (UPI PIN)
Every user sets a 4-6 digit PIN, hashed with bcrypt, required for all transfers.
- **Set PIN:** Profile → Security → Set UPI PIN
- **Forgot PIN:** Profile → Forgot PIN? → receive OTP via email → reset

#### 2. 🧠 Context-Aware Smart Payments Engine
Every transaction is analyzed before processing:
- Checks: high amount, odd hours (12am–5am), new recipient, velocity (3+ txns/30 min), amount deviation
- **Low risk** → proceeds directly
- **Medium risk** → shows ⚠️ warning, requires OTP from phone
- **High risk** → transaction blocked with reason list

#### 3. 🎭 Decoy Wallet
Protect your real balance under duress:
- Set a separate Decoy PIN in Profile → Decoy Wallet
- Set a fake balance to display
- When logged in with the Decoy PIN, all wallet data shows fake figures, transfers are disabled, and only fake transactions appear
- Real balance is **never** exposed in decoy mode

#### 4. 💸 Split Expenses
Split bills with groups of friends:
- Create groups, add members
- Add expenses with equal or custom splits
- Track "You owe" / "You are owed" summary
- Settle individual splits using UPI PIN (deducts from wallet)

#### 5. 📧 Forgot PIN (Email Recovery)
- Request OTP to registered email
- Verify OTP and set new PIN — no need for the old PIN

---

## Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18, Vite, TailwindCSS, Axios, Socket.io-client |
| Backend  | Node.js, Express, MongoDB (Mongoose), Socket.io     |
| Auth     | JWT, bcrypt, OTP (email via Nodemailer)             |
| Security | Rate limiting, Joi validation, bcrypt PIN hashing   |

---

## Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- Gmail account (for OTP emails)

### 1. Clone & Install

```bash
npm install        # installs concurrently at root
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/finflow
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Nodemailer (Gmail)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Optional
FRAUD_THRESHOLD=10000
```

> For Gmail, use an **App Password** (not your account password):
> Google Account → Security → 2-Step Verification → App Passwords

### 3. Run

```bash
# From project root — runs backend + frontend concurrently
npm run dev
```

Or separately:
```bash
cd backend && npm run dev    # http://localhost:5000
cd frontend && npm run dev   # http://localhost:5173
```

---

## API Reference (New Endpoints)

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/decoy-login` | Login with decoy PIN, returns decoy-session JWT |

### Users
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/users/upi-pin` | Set / change UPI PIN |
| PUT | `/api/users/decoy-pin` | Set decoy PIN |
| PUT | `/api/users/decoy-balance` | Set decoy wallet balance |
| POST | `/api/users/forgot-pin/request` | Send OTP to email |
| POST | `/api/users/forgot-pin/reset` | Verify OTP + reset PIN |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions/analyze` | Analyze risk before sending |
| POST | `/api/transactions/send` | Send money (requires PIN, risk check) |

### Split Expenses
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/split/groups` | Create a group |
| GET | `/api/split/groups` | List your groups |
| GET | `/api/split/groups/:id` | Group detail + expenses |
| POST | `/api/split/groups/:id/expenses` | Add expense |
| POST | `/api/split/expenses/:id/settle` | Settle your share (PIN required) |
| GET | `/api/split/balances` | Net balance summary |

---

## Demo Scenarios

### Split ₹900 among 3 users (₹300 each)
1. Go to **Split Expenses** → Create Group with 2 friends
2. Add Expense: "Dinner" ₹900, Equal Split
3. Each member sees ₹300 under their split
4. Click **Settle** → enter UPI PIN → confirmed

### Suspicious transaction → OTP triggered
1. Send Money at an unusual hour (12am–5am) or to a new recipient
2. Risk warning popup appears with reasons listed
3. Request OTP → enter OTP → proceed

### High-risk → blocked
1. Send ₹15,000 to a brand-new recipient at 2am
2. Transaction is blocked — popup shows "🚫 Transaction Blocked"

### Login with decoy PIN → fake wallet
1. Profile → Decoy Wallet → set Decoy PIN + Decoy Balance
2. Log out
3. Login normally → after OTP, on the dashboard, use `POST /api/auth/decoy-login` with `{ userId, decoyPin }`
4. Decoy token is issued → wallet shows fake balance, transfers disabled

### Forgot PIN → email OTP → reset
1. Profile → Forgot PIN? → "Send Reset OTP to Email"
2. Check email for 6-digit OTP
3. Enter OTP + new PIN → confirmed

---

## Project Structure

```
finflow/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # login, register, decoy-login
│   │   ├── transactionController.js # send money, risk analysis
│   │   ├── userController.js       # PIN management, forgot-pin, decoy
│   │   ├── walletController.js     # balance (decoy-aware)
│   │   └── splitController.js      # ✨ NEW: groups, expenses, settle
│   ├── middlewares/
│   │   ├── auth.js                 # JWT + decoy session flag
│   │   └── validate.js
│   ├── models/
│   │   ├── User.js                 # + decoyPin, decoyBalance fields
│   │   ├── OTP.js                  # + forgot-pin purpose
│   │   ├── Group.js                # ✨ NEW
│   │   └── Expense.js              # ✨ NEW
│   ├── routes/
│   │   ├── auth.js, users.js, transactions.js, wallet.js
│   │   └── split.js                # ✨ NEW
│   └── utils/
│       └── intentAnalyzer.js       # ✨ NEW: smart payments engine
└── frontend/src/
    ├── pages/
    │   ├── SplitExpenses.jsx        # ✨ NEW
    │   ├── SendMoney.jsx            # + risk warning modal
    │   ├── Profile.jsx              # + forgot-pin, decoy wallet settings
    │   ├── Wallet.jsx               # + decoy mode display
    │   └── Dashboard.jsx            # + decoy banner
    └── context/
        └── AuthContext.jsx          # + isDecoySession flag
```

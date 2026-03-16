# FinFlow – Secure Digital Payment Platform

> A production-grade full-stack digital payments app built with Node.js, Express, MongoDB, React, Tailwind CSS, and Socket.io.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [API Reference](#api-reference)
5. [Environment Variables](#environment-variables)
6. [Security Features](#security-features)
7. [Real-Time Features](#real-time-features)
8. [Deployment](#deployment)

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally on port 27017 (or a MongoDB Atlas URI)
- npm ≥ 9

```bash
# 1. Clone and enter project
git clone <your-repo> finflow && cd finflow

# 2. Install root + all dependencies
npm run install:all

# 3. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and set MONGODB_URI, JWT_SECRET, etc.

# 4. Start both servers (hot-reload enabled)
npm run dev
# Backend  → http://localhost:5000
# Frontend → http://localhost:5173
```

---

## Project Structure

```
finflow/
├── package.json                     ← root: runs both servers via concurrently
│
├── backend/
│   ├── server.js                    ← Express + Socket.io bootstrap
│   ├── .env                         ← environment config (never commit!)
│   ├── models/
│   │   ├── User.js                  ← bcrypt hashing, toJSON strips password
│   │   ├── Wallet.js                ← debit/credit methods, balance guard
│   │   └── Transaction.js           ← UUID IDs, indexed for fast queries
│   ├── controllers/
│   │   ├── authController.js        ← register, login, JWT signing
│   │   ├── walletController.js      ← balance, add-money (atomic session)
│   │   ├── transactionController.js ← send (atomic), history, fraud detect
│   │   └── userController.js        ← profile, user search
│   ├── routes/
│   │   ├── auth.js                  ← POST /register, POST /login, GET /me
│   │   ├── wallet.js                ← GET /balance, POST /add-money
│   │   ├── transactions.js          ← POST /send, GET /history, GET /:id
│   │   └── users.js                 ← GET /profile, GET /search
│   └── middlewares/
│       ├── auth.js                  ← JWT verification middleware
│       └── validate.js              ← Joi schema validation wrapper
│
└── frontend/
    ├── index.html
    ├── vite.config.js               ← dev proxy to backend
    ├── tailwind.config.js
    └── src/
        ├── main.jsx                 ← ReactDOM root, providers
        ├── App.jsx                  ← React Router routes
        ├── index.css                ← CSS variables + Tailwind
        ├── context/
        │   ├── AuthContext.jsx      ← JWT storage, user state, refreshUser
        │   └── NotificationContext.jsx ← toast system + Socket.io listener
        ├── services/
        │   └── api.js               ← Axios instance, token interceptor, 401 redirect
        ├── components/
        │   ├── DashboardLayout.jsx  ← sidebar + topbar shell
        │   ├── NotificationToast.jsx← floating toast stack
        │   └── ui.jsx               ← Card, Button, Badge, WalletCard, TransactionItem…
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── SendMoney.jsx
            ├── Wallet.jsx
            ├── TransactionHistory.jsx
            ├── QRPay.jsx
            └── Profile.jsx
```

---

## Architecture

```
Browser (React + Socket.io client)
         │
         │  REST (Axios / JSON)
         ▼
Express REST API  ◄──── JWT Middleware ◄──── All protected routes
         │
         │  Mongoose ODM
         ▼
MongoDB (Users · Wallets · Transactions)
         │
         │  Socket.io
         ▼
Real-time event bus → payment_received | fraud_alert
```

### Key design decisions

| Concern | Solution |
|---|---|
| Atomic transfers | `mongoose.startSession()` + session transactions — debit and credit never partially succeed |
| Password security | `bcrypt` with 12 salt rounds; `password` field excluded from all JSON output via `toJSON()` |
| Token auth | JWT signed with `HS256`, 7-day expiry; verified on every protected route |
| Input validation | Joi schemas on every POST route; errors returned as human-readable strings |
| Fraud detection | Transactions ≥ `FRAUD_THRESHOLD` (default ₹10,000) are flagged and trigger a Socket.io alert |
| Rate limiting | `express-rate-limit`: 200 req/15 min globally, 20 req/15 min on auth routes |
| Real-time | Socket.io room-per-user pattern; `connectedUsers` map kept in `app.locals` |

---

## API Reference

All protected endpoints require: `Authorization: Bearer <token>`

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{name, email, phone, password}` | Create user + wallet |
| POST | `/api/auth/login` | `{identifier, password}` | Returns JWT + user |
| GET  | `/api/auth/me` | — | Current user profile |

### Wallet

| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET  | `/api/wallet/balance` | — | `{balance, currency}` |
| POST | `/api/wallet/add-money` | `{amount, method}` | Credit wallet (simulated) |

### Transactions

| Method | Endpoint | Body / Query | Description |
|---|---|---|---|
| POST | `/api/transactions/send` | `{identifier, amount, note}` | Atomic transfer |
| GET  | `/api/transactions/history` | `?type=sent\|received&page=1&limit=20&from=&to=` | Paginated history |
| GET  | `/api/transactions/:id` | — | Single transaction by `transactionId` |

### Users

| Method | Endpoint | Query | Description |
|---|---|---|---|
| GET | `/api/users/profile` | — | Profile + wallet |
| GET | `/api/users/search` | `?q=<query>` | Find users by name/email/phone |

### Example request: Send money

```bash
curl -X POST http://localhost:5000/api/transactions/send \
  -H "Authorization: Bearer <your_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "rahul@finflow.app", "amount": 500, "note": "Lunch split"}'
```

Response:
```json
{
  "success": true,
  "transaction": {
    "transactionId": "TXNABC123",
    "senderId": "...",
    "receiverId": "...",
    "amount": 500,
    "status": "success",
    "note": "Lunch split",
    "isFraudSuspected": false,
    "createdAt": "2024-12-01T10:00:00Z"
  },
  "senderBalance": 11950.50,
  "fraudAlert": false
}
```

---

## Environment Variables

```env
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finflow
JWT_SECRET=change_this_to_a_long_random_string_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
FRAUD_THRESHOLD=10000
```

---

## Security Features

- **bcrypt** password hashing (12 salt rounds)
- **JWT** authentication on all protected routes
- **Joi** input validation — rejects malformed/missing fields
- **MongoDB sessions** — atomic debit+credit with automatic rollback on failure
- **Rate limiting** — brute-force protection on auth routes
- **Fraud detection** — large transactions flagged and alerted in real time
- **CORS** configured to allow only the frontend origin
- **No password in responses** — `toJSON()` strips it from User model

---

## Real-Time Features (Socket.io)

When a transfer succeeds, the backend:
1. Looks up the receiver's socket ID from `app.locals.connectedUsers`
2. Emits `payment_received` with `{ from, amount, transactionId }`
3. The frontend `NotificationContext` catches this and shows a toast

Events:
| Event | Direction | Payload |
|---|---|---|
| `register` | Client → Server | `userId` |
| `payment_received` | Server → Client | `{from, amount, transactionId, timestamp}` |
| `fraud_alert` | Server → Client | `{message, transactionId}` |

---

## Deployment

### Backend (Railway / Render / Fly.io)

```bash
# Set environment variables in your platform dashboard, then:
cd backend
npm start
```

### Frontend (Vercel / Netlify)

```bash
cd frontend
npm run build
# dist/ folder is ready to deploy

# Update vite.config.js proxy target to your production backend URL
# or set VITE_API_URL env variable and update src/services/api.js baseURL
```

### MongoDB Atlas (Production)
Replace `MONGODB_URI` with your Atlas connection string:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/finflow?retryWrites=true&w=majority
```

---

## Demo Users (seed data — optional)

Run this to seed 4 demo users with pre-funded wallets:

```bash
cd backend
node seed.js
```

| Name | Email | Phone | Password | Balance |
|---|---|---|---|---|
| Priya Kapoor | priya@finflow.app | +91 98765 10001 | demo1234 | ₹12,450 |
| Rahul Mehta | rahul@finflow.app | +91 98765 10002 | demo1234 | ₹8,200 |
| Ananya Singh | ananya@finflow.app | +91 98765 10003 | demo1234 | ₹3,700 |
| Dev Patel | dev@finflow.app | +91 98765 10004 | demo1234 | ₹25,000 |

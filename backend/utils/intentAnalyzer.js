/**
 * Context-Aware Smart Payments Engine
 * Analyzes transaction intent and assigns risk scores
 */

const HIGH_AMOUNT_THRESHOLD = parseInt(process.env.FRAUD_THRESHOLD) || 10000;
const MEDIUM_AMOUNT_THRESHOLD = 5000;
const ODD_HOURS_START = 0;   // midnight
const ODD_HOURS_END = 5;     // 5am

/**
 * Analyze transaction intent and return risk assessment
 * @param {Object} params
 * @param {number}   params.amount      - Transaction amount
 * @param {string}   params.recipientId - Recipient user ID (string)
 * @param {Date}     params.time        - Transaction timestamp
 * @param {Array}    params.history     - Recent transactions of sender [{amount, receiverId, createdAt}]
 * @param {string}   params.senderId    - Sender user ID
 * @returns {{ riskScore: 'low'|'medium'|'high', action: 'allow'|'otp'|'block', reasons: string[] }}
 */
exports.analyzeIntent = function ({ amount, recipientId, time = new Date(), history = [], senderId }) {
  const reasons = [];
  let riskPoints = 0;

  // 1. High amount check
  if (amount >= HIGH_AMOUNT_THRESHOLD) {
    riskPoints += 3;
    reasons.push(`High transaction amount: ₹${amount}`);
  } else if (amount >= MEDIUM_AMOUNT_THRESHOLD) {
    riskPoints += 1;
    reasons.push(`Moderate transaction amount: ₹${amount}`);
  }

  // 2. Odd hours check
  const hour = new Date(time).getHours();
  if (hour >= ODD_HOURS_START && hour < ODD_HOURS_END) {
    riskPoints += 2;
    reasons.push(`Transaction attempted during unusual hours (${hour}:00)`);
  }

  // 3. New recipient check — never transacted before
  if (history && history.length > 0) {
    const sentToRecipient = history.filter(
      (tx) => tx.receiverId && tx.receiverId.toString() === recipientId
    );
    if (sentToRecipient.length === 0) {
      riskPoints += 1;
      reasons.push("First time transacting with this recipient");
    }
  } else {
    // No history at all — treat as new user pattern
    riskPoints += 1;
    reasons.push("No prior transaction history");
  }

  // 4. Velocity check — many transactions in a short window
  if (history && history.length >= 5) {
    const recentWindow = Date.now() - 30 * 60 * 1000; // last 30 minutes
    const recentCount = history.filter(
      (tx) => new Date(tx.createdAt).getTime() > recentWindow
    ).length;
    if (recentCount >= 3) {
      riskPoints += 2;
      reasons.push(`${recentCount} transactions in the last 30 minutes`);
    }
  }

  // 5. Large deviation from average spending
  if (history && history.length >= 3) {
    const avg = history.reduce((sum, tx) => sum + tx.amount, 0) / history.length;
    if (amount > avg * 3) {
      riskPoints += 2;
      reasons.push(`Amount is ${Math.round(amount / avg)}x your average transaction`);
    }
  }

  // Determine risk level and action
  let riskScore, action;

  if (riskPoints >= 5) {
    riskScore = "high";
    action = "block";
  } else if (riskPoints >= 2) {
    riskScore = "medium";
    action = "otp";
  } else {
    riskScore = "low";
    action = "allow";
  }

  return { riskScore, action, reasons };
};

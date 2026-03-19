import { useState, useEffect } from "react";
import api from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import {
  Card,
  WalletCard,
  SectionTitle,
  FormGroup,
  Button,
  Divider,
  ProgressBar,
} from "../components/ui";
import "./Wallet.css";

const QUICK = [500, 1000, 2000, 5000];

export default function Wallet() {
  const { addToast } = useNotifications();
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState({ added: 0, sent: 0, received: 0 });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const [wRes, txRes] = await Promise.all([
      api.get("/wallet/balance"),
      api.get("/transactions/history?limit=100"),
    ]);
    setWallet(wRes.data);
    const txs = txRes.data.transactions;
    const added = txs
      .filter((t) => t.type === "credit")
      .reduce((a, t) => a + t.amount, 0);
    const sent = txs
      .filter((t) => t.type === "transfer" && t.senderId)
      .reduce((a, t) => a + t.amount, 0);
    const received = txs
      .filter((t) => t.type === "transfer" && t.receiverId)
      .reduce((a, t) => a + t.amount, 0);
    setStats({ added, sent, received });
  };

  useEffect(() => {
    fetchData().catch(console.error);
  }, []);

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      addToast("Enter a valid amount", "error");
      return;
    }
    if (amt > 100000) {
      addToast("Max ₹1,00,000 per top-up", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/wallet/add-money", {
        amount: amt,
        method,
      });
      setWallet((w) => ({ ...w, balance: data.balance }));
      addToast(
        `₹${amt.toLocaleString("en-IN")} added to your wallet!`,
        "success",
      );
      setAmount("");
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to add money", "error");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const bal = wallet?.balance || 0;
  const net = stats.received - stats.sent + stats.added;

  return (
    <div className="animate-fade-in">
      <h1 className="wallet-title">Wallet</h1>
      <p className="wallet-subtitle">Manage your digital wallet</p>

      <div className="wallet-container">
        {/* Wallet Balance Card */}
        <div >
          <WalletCard balance={bal}>
            <div className="wallet-id">
              WALLET ID: FF-{(wallet && "WALLET") || "------"}
            </div>
          </WalletCard>
        </div>

        {/* Add Money Card */}
        <Card>
          <SectionTitle>Add Money</SectionTitle>
          <div className="wallet-quick-amounts">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q.toString())}
                className={`wallet-quick-amount-btn ${amount === q.toString() ? "active" : ""}`}
              >
                ₹{q.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
          <FormGroup label="Custom amount (₹)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={1}
              max={100000}
            />
          </FormGroup>
          <FormGroup label="Payment method">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="UPI">UPI (Simulated)</option>
              <option value="NetBanking">Net Banking (Simulated)</option>
              <option value="Card">Debit / Credit Card (Simulated)</option>
            </select>
          </FormGroup>
          <Button
            variant="success"
            full
            loading={loading}
            onClick={handleAdd}
            className="wallet-add-btn"
          >
            + Add Money to Wallet
          </Button>
        </Card>

        {/* Wallet Stats Card */}
        <Card>
          <SectionTitle>Wallet Stats</SectionTitle>
          <div className="wallet-stats">
            {[
              ["Total Added", fmt(stats.added), "var(--green)"],
              ["Total Sent", fmt(stats.sent), "var(--red)"],
              ["Total Received", fmt(stats.received), "var(--blue)"],
            ].map(([l, v, c]) => (
              <div key={l} className="wallet-stat-item">
                <span className="wallet-stat-label">{l}</span>
                <span style={{ fontWeight: 600, color: c }}>{v}</span>
              </div>
            ))}
            <Divider />
            <div className="wallet-net-flow">
              <span style={{ fontWeight: 600 }}>Net Flow</span>
              <span
                className={`wallet-net-flow-value ${net >= 0 ? "wallet-net-flow-positive" : "wallet-net-flow-negative"}`}
              >
                {net >= 0 ? "+" : "-"}
                {fmt(Math.abs(net))}
              </span>
            </div>
          </div>
        </Card>

        {/* Account Limits Card */}
        <Card>
          <SectionTitle>Account Limits</SectionTitle>
          {[
            {
              label: "Wallet Balance",
              max: 100000,
              val: bal,
              color: "var(--accent)",
            },
            {
              label: "Daily Send Limit",
              max: 25000,
              val: 7500,
              color: "var(--green)",
            },
            {
              label: "Monthly Limit",
              max: 200000,
              val: 30000,
              color: "var(--blue)",
            },
          ].map(({ label, max, val, color }) => (
            <div key={label} className="wallet-limits-item">
              <div className="wallet-limits-header">
                <span className="wallet-limits-label">{label}</span>
                <span className="wallet-limits-value">
                  ₹{val.toLocaleString("en-IN")} / ₹
                  {max.toLocaleString("en-IN")}
                </span>
              </div>
              <ProgressBar value={(val / max) * 100} color={color} />
            </div>
          ))}
        </Card>

        {/* Security Card */}
        <Card>
          <SectionTitle>Security</SectionTitle>
          <div className="wallet-security">
            {[
              "256-bit AES Encryption",
              "2FA Protected",
              "RBI Regulated",
              "Fraud Detection Active",
              "₹5L Insurance Cover",
            ].map((s) => (
              <div key={s} className="wallet-security-item">
                <span className="wallet-security-check">✓</span>
                <span className="wallet-security-text">{s}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

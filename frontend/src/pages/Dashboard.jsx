import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import api from "../services/api";
import {
  Card,
  StatCard,
  WalletCard,
  SectionTitle,
  TransactionItem,
  Button,
} from "../components/ui";
import "./Dashboard.css";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { user, isDecoySession } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState([]);
  const [stats, setStats] = useState({ sent: 0, received: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/wallet/balance"),
      api.get("/transactions/history?limit=5"),
    ])
      .then(([walletRes, txRes]) => {
        setBalance(walletRes.data.balance);
        const all = txRes.data.transactions;
        setTxs(all);
        const sent = all
          .filter((t) => t.senderId?._id === user?._id)
          .reduce((a, t) => a + t.amount, 0);
        const received = all
          .filter((t) => t.receiverId?._id === user?._id)
          .reduce((a, t) => a + t.amount, 0);
        setStats({ sent, received, total: txRes.data.pagination.total });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const fmt = (n) =>
    "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  if (loading)
    return <div className="dashboard-loading">Loading dashboard...</div>;

  return (
    <div className="animate-fade-in">
      {isDecoySession && (
        <div style={{ background: "rgba(255,179,71,0.08)", border: "1px solid rgba(255,179,71,0.3)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem", fontSize: "0.85rem", color: "var(--amber)", display: "flex", alignItems: "center", gap: 8 }}>
          🎭 <strong>Decoy Mode Active</strong> — You are viewing a limited, simulated wallet view.
        </div>
      )}
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            {greeting()}, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="dashboard-subtitle">Here's your financial overview</p>
        </div>
        <Button onClick={() => navigate("/app/send")}>↗ Send Money</Button>
      </div>

      {/* Wallet card */}
      <div className="dashboard-wallet-container">
        <WalletCard balance={balance}>
          <div className="dashboard-wallet-buttons">
            <button
              className="dashboard-add-money-btn"
              onClick={() => navigate("/app/wallet")}
            >
              + Add Money
            </button>
            <button
              className="dashboard-send-btn"
              onClick={() => navigate("/app/send")}
            >
              Send ↗
            </button>
          </div>
        </WalletCard>
      </div>

      {/* Stats grid */}
      <div className="dashboard-stats-grid">
        <StatCard
          label="Sent (All time)"
          value={fmt(stats.sent)}
          color="var(--red)"
        />
        <StatCard
          label="Received (All time)"
          value={fmt(stats.received)}
          color="var(--green)"
        />
        <StatCard
          label="Transactions"
          value={stats.total}
          color="var(--accent2)"
        />
        <StatCard label="Fees Saved" value="₹0.00" color="var(--amber)" />
      </div>

      {/* Quick Actions - First for mobile users */}
      <Card className="dashboard-quick-actions-card">
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="dashboard-quick-actions-grid">
          {[
            {
              icon: "↗",
              label: "Send",
              path: "/app/send",
              color: "rgba(108,99,255,0.15)",
              tc: "var(--accent2)",
            },
            {
              icon: "+",
              label: "Add",
              path: "/app/wallet",
              color: "rgba(34,211,160,0.15)",
              tc: "var(--green)",
            },
            {
              icon: "▦",
              label: "QR",
              path: "/app/qr",
              color: "rgba(255,179,71,0.15)",
              tc: "var(--amber)",
            },
            {
              icon: "≡",
              label: "History",
              path: "/app/history",
              color: "rgba(79,195,247,0.15)",
              tc: "var(--blue)",
            },
          ].map(({ icon, label, path, color, tc }) => (
            <button
              key={label}
              className="dashboard-quick-action-btn"
              onClick={() => navigate(path)}
              style={{ background: color }}
            >
              <span
                className="dashboard-quick-action-icon"
                style={{ color: tc }}
              >
                {icon}
              </span>
              <span
                className="dashboard-quick-action-label"
                style={{ color: tc }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Weekly Activity - Second */}
      <Card className="dashboard-weekly-card">
        <SectionTitle>Weekly Activity</SectionTitle>
        <div className="dashboard-weekly-chart">
          {[20, 60, 40, 80, 30, 90, 50].map((h, i) => (
            <div
              key={i}
              className="dashboard-weekly-bar"
              style={{ height: h + "%" }}
            />
          ))}
        </div>
        <div className="dashboard-weekly-days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className="dashboard-weekly-day">
              {d}
            </span>
          ))}
        </div>
      </Card>

      {/* Recent Activity - Third */}
      <Card>
        <SectionTitle
          action={
            <span
              className="dashboard-recent-action"
              onClick={() => navigate("/app/history")}
            >
              View all →
            </span>
          }
        >
          Recent Activity
        </SectionTitle>
        {txs.length === 0 ? (
          <div className="dashboard-recent-empty">No transactions yet</div>
        ) : (
          txs.map((t) => (
            <TransactionItem key={t._id} tx={t} currentUserId={user?._id} />
          ))
        )}
      </Card>
    </div>
  );
}

import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import {
  Card,
  FormGroup,
  Button,
  SectionTitle,
  Divider,
} from "../components/ui";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function SendMoney() {
  const location = useLocation();
  const { addToast } = useNotifications();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (location.state?.recipient) {
      setRecipient(location.state.recipient);
    }
  }, [location.state]);

  // Fetch balance once
  useEffect(() => {
    api
      .get("/wallet/balance")
      .then((r) => setBalance(r.data.balance))
      .catch(() => {});
  }, []);

  const searchUsers = useCallback(async (q) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const { data } = await api.get(
        `/users/search?q=${encodeURIComponent(q)}`,
      );
      setResults(data.users);
    } catch {
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const selectRecipient = (u) => {
    setRecipient(u);
    setResults([]);
    setQuery("");
  };
  const clearRecipient = () => setRecipient(null);

  const addKey = (k) => {
    setAmountStr((prev) => {
      if (k === "." && prev.includes(".")) return prev;
      if (prev === "0" && k !== ".") return k;
      const dec = prev.indexOf(".");
      if (dec >= 0 && prev.length - dec > 2) return prev;
      if (prev.length >= 9) return prev;
      return prev + k;
    });
  };
  const delKey = () => setAmountStr((prev) => prev.slice(0, -1));
  const setQuick = (v) => setAmountStr(v.toString());

  const amount = parseFloat(amountStr) || 0;
  const isFraud = amount >= 10000;

  const handleSend = async () => {
    if (!recipient) {
      addToast("Please select a recipient", "error");
      return;
    }
    if (!amount || amount <= 0) {
      addToast("Please enter a valid amount", "error");
      return;
    }
    if (balance !== null && amount > balance) {
      addToast("Insufficient wallet balance", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/transactions/send", {
        identifier: recipient.email,
        amount,
        note,
      });
      setBalance(data.senderBalance);
      addToast(
        `₹${amount.toLocaleString("en-IN")} sent to ${recipient.name}!`,
        "success",
      );
      if (data.fraudAlert)
        addToast("⚠ Large transaction flagged for review", "warning");
      setAmountStr("");
      setNote("");
      clearRecipient();
    } catch (err) {
      addToast(err.response?.data?.message || "Transfer failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Send Money</h1>
      <p
        style={{
          color: "var(--text2)",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
        }}
      >
        Transfer funds instantly to any FinFlow user
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          maxWidth: 900,
        }}
      >
        {/* Left column */}
        <div>
          {/* Recipient search */}
          <Card style={{ marginBottom: "1rem" }}>
            <SectionTitle>Find Recipient</SectionTitle>
            <FormGroup label="Search by name, email or phone">
              <input
                value={query}
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="Search user..."
              />
            </FormGroup>
            {searchLoading && (
              <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
                Searching...
              </div>
            )}
            {results.length > 0 && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  marginTop: 4,
                }}
              >
                {results.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => selectRecipient(u)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg4)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--accent3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      {u.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                        {u.name}
                      </div>
                      <div
                        style={{ fontSize: "0.75rem", color: "var(--text3)" }}
                      >
                        {u.email} · {u.phone}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recipient && (
              <div
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg,var(--accent),var(--green))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  {recipient.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{recipient.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                    {recipient.email}
                  </div>
                </div>
                <button
                  onClick={clearRecipient}
                  style={{
                    background: "none",
                    border: "1px solid var(--border2)",
                    borderRadius: 6,
                    color: "var(--text2)",
                    cursor: "pointer",
                    padding: "4px 10px",
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </Card>

          {/* Numpad */}
          <Card>
            <SectionTitle>Amount</SectionTitle>
            {isFraud && (
              <div
                style={{
                  background: "rgba(255,179,71,0.1)",
                  border: "1px solid rgba(255,179,71,0.4)",
                  borderRadius: 10,
                  padding: "0.8rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  color: "var(--amber)",
                }}
              >
                ⚠ Large transaction detected. This may trigger a security
                review.
              </div>
            )}
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "2.5rem",
                fontWeight: 800,
                textAlign: "center",
                padding: "0.75rem",
              }}
            >
              ₹{amount ? amount.toLocaleString("en-IN") : "0"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
                maxWidth: 280,
                margin: "0 auto 1.25rem",
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", "0", "⌫"].map((k) => (
                <button
                  key={k}
                  onClick={() => (k === "⌫" ? delKey() : addKey(k.toString()))}
                  style={{
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "0.9rem",
                    fontSize: "1.1rem",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--text)",
                    transition: "all 0.15s",
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <FormGroup label="Note (optional)">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
              />
            </FormGroup>
          </Card>
        </div>

        {/* Right column */}
        <div>
          <Card style={{ marginBottom: "1rem" }}>
            <SectionTitle>Summary</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["To", recipient?.name || "-"],
                ["Amount", fmt(amount)],
                ["Fee", <span style={{ color: "var(--green)" }}>FREE</span>],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: "0.9rem", color: "var(--text2)" }}>
                    {l}
                  </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    {v}
                  </span>
                </div>
              ))}
              <Divider />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600 }}>You Pay</span>
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  {fmt(amount)}
                </span>
              </div>
            </div>
            {balance !== null && (
              <div style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                    Your balance
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    {fmt(balance)}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--bg4)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width:
                        balance > 0
                          ? `${Math.max(0, Math.min(100, ((balance - amount) / balance) * 100))}%`
                          : "0%",
                      background:
                        "linear-gradient(90deg,var(--accent),var(--accent2))",
                      borderRadius: 3,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: "1rem" }}>
            <SectionTitle>Quick Amounts</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setQuick(a)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border2)",
                    borderRadius: 8,
                    padding: "6px 14px",
                    color: "var(--text2)",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontFamily: "DM Sans, sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  ₹{a.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          </Card>

          <Button
            variant="primary"
            full
            loading={loading}
            onClick={handleSend}
            style={{
              padding: "1rem",
              fontSize: "1rem",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
            }}
          >
            ↗ Send Money
          </Button>
        </div>
      </div>
    </div>
  );
}

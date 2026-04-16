import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import { Card, FormGroup, Button, SectionTitle, Divider } from "../components/ui";
import "./SendMoney.css";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function SendMoney() {
  const location = useLocation();
  const { addToast } = useNotifications();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");

  // Risk analysis state
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [riskWarningAck, setRiskWarningAck] = useState(false);
  const [showRiskWarning, setShowRiskWarning] = useState(false);
  const [transactionOtp, setTransactionOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (location.state?.recipient) setRecipient(location.state.recipient);
  }, [location.state]);

  useEffect(() => {
    api.get("/wallet/balance").then((r) => setBalance(r.data.balance)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showPinModal) return;
    const handleKeyPress = (e) => {
      if (/^\d$/.test(e.key)) { e.preventDefault(); addPinKey(e.key); }
      else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); delPinKey(); }
      else if (e.key === "Enter") { e.preventDefault(); handleSend(); }
      else if (e.key === "Escape") { closePinModal(); }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showPinModal, pin, loading]);

  const searchUsers = useCallback(async (q) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearchLoading(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(data.users);
    } catch { setResults([]); } finally { setSearchLoading(false); }
  }, []);

  const selectRecipient = (u) => { setRecipient(u); setResults([]); setQuery(""); setRiskAnalysis(null); setRiskWarningAck(false); };
  const clearRecipient = () => { setRecipient(null); setRiskAnalysis(null); setRiskWarningAck(false); };

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

  // Analyze risk before opening PIN modal
  const openPinModal = async () => {
    if (!recipient) { addToast("Please select a recipient", "error"); return; }
    if (!amount || amount <= 0) { addToast("Please enter a valid amount", "error"); return; }
    if (balance !== null && amount > balance) { addToast("Insufficient wallet balance", "error"); return; }

    // Analyze intent
    try {
      const { data } = await api.post("/transactions/analyze", {
        amount,
        recipientIdentifier: recipient.email,
      });
      const analysis = data.analysis;
      setRiskAnalysis(analysis);

      if (analysis.action === "block") {
        setShowRiskWarning(true);
        return;
      }
      if (analysis.action === "otp" && !riskWarningAck) {
        setShowRiskWarning(true);
        return;
      }
    } catch {
      // If analysis fails, proceed normally
    }

    setPin(""); setPinError(""); setShowPinModal(true);
  };

  const handleRiskAcknowledge = async () => {
    if (riskAnalysis?.action === "block") { setShowRiskWarning(false); return; }
    // Request OTP for medium risk
    if (riskAnalysis?.action === "otp" && !otpSent) {
      try {
        await api.post("/transactions/request-otp", { amount });
        setOtpSent(true);
        addToast("OTP sent to your phone", "success");
      } catch (err) {
        addToast(err.response?.data?.message || "Failed to send OTP", "error");
      }
      return;
    }
    setRiskWarningAck(true);
    setShowRiskWarning(false);
    setPin(""); setPinError(""); setShowPinModal(true);
  };

  const closePinModal = () => { setShowPinModal(false); setPin(""); setPinError(""); };
  const addPinKey = (k) => { if (pin.length >= 6) return; setPin((prev) => prev + k); };
  const delPinKey = () => setPin((prev) => prev.slice(0, -1));

  const handleSend = async () => {
    const trimmedPin = pin.trim();
    if (!trimmedPin || trimmedPin.length < 4 || trimmedPin.length > 6 || !/^\d+$/.test(trimmedPin)) {
      setPinError("Enter a valid 4-6 digit UPI PIN."); return;
    }
    setLoading(true);
    try {
      const payload = { identifier: recipient.email, amount, note, pin: trimmedPin };
      if (transactionOtp) payload.transactionOtp = transactionOtp;

      const { data } = await api.post("/transactions/send", payload);
      setBalance(data.senderBalance);
      addToast(`₹${amount.toLocaleString("en-IN")} sent to ${recipient.name}!`, "success");
      if (data.fraudAlert) addToast("⚠ Large transaction flagged for review", "warning");
      setAmountStr(""); setNote(""); setPin(""); clearRecipient();
      closePinModal(); setOtpSent(false); setTransactionOtp("");
    } catch (err) {
      const msg = err.response?.data?.message || "Incorrect PIN or transfer failed.";
      if (err.response?.data?.requiresOtp) {
        setPinError("OTP required. Please go back and complete OTP verification.");
      } else {
        setPinError(msg); addToast(msg, "error");
      }
    } finally { setLoading(false); }
  };

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const riskColor = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)" };

  return (
    <div className="animate-fade-in send-money-page">
      <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Send Money</h1>
      <p style={{ color: "var(--text2)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Transfer funds instantly to any FinFlow user
      </p>

      <div className="send-money-grid">
        <div>
          {/* Recipient search */}
          <Card style={{ marginBottom: "1rem" }}>
            <SectionTitle>Find Recipient</SectionTitle>
            <FormGroup label="Search by name, email or phone">
              <input value={query} onChange={(e) => searchUsers(e.target.value)} placeholder="Search user..." />
            </FormGroup>
            {searchLoading && <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>Searching...</div>}
            {results.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
                {results.map((u) => (
                  <div key={u._id} onClick={() => selectRecipient(u)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.75rem 1rem", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                      {u.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{u.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{u.email} · {u.phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recipient && (
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem", display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--green))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem" }}>
                  {recipient.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{recipient.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{recipient.email}</div>
                </div>
                <button onClick={clearRecipient} style={{ background: "none", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text2)", cursor: "pointer", padding: "4px 10px" }}>×</button>
              </div>
            )}
          </Card>

          {/* Numpad */}
          <Card>
            <SectionTitle>Amount</SectionTitle>
            {isFraud && (
              <div style={{ background: "rgba(255,179,71,0.1)", border: "1px solid rgba(255,179,71,0.4)", borderRadius: 10, padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--amber)" }}>
                ⚠ Large transaction detected. This may trigger a security review.
              </div>
            )}
            <div className="amount-display">₹{amount ? amount.toLocaleString("en-IN") : "0"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, maxWidth: 280, margin: "0 auto 1.25rem" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", "0", "⌫"].map((k) => (
                <button key={k} onClick={() => (k === "⌫" ? delKey() : addKey(k.toString()))}
                  style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.9rem", fontSize: "1.1rem", fontFamily: "Syne, sans-serif", fontWeight: 600, cursor: "pointer", color: "var(--text)", transition: "all 0.15s" }}>
                  {k}
                </button>
              ))}
            </div>
            <FormGroup label="Note (optional)">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..." />
            </FormGroup>
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: "1rem" }}>
            <SectionTitle>Summary</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["To", recipient?.name || "-"], ["Amount", fmt(amount)], ["Fee", <span style={{ color: "var(--green)" }}>FREE</span>]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--text2)" }}>{l}</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <Divider />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>You Pay</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "Syne, sans-serif" }}>{fmt(amount)}</span>
              </div>
            </div>
            {balance !== null && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Your balance</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>{fmt(balance)}</span>
                </div>
                <div style={{ height: 6, background: "var(--bg4)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: balance > 0 ? `${Math.max(0, Math.min(100, ((balance - amount) / balance) * 100))}%` : "0%", background: "linear-gradient(90deg,var(--accent),var(--accent2))", borderRadius: 3, transition: "width 0.4s ease" }} />
                </div>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: "1rem" }}>
            <SectionTitle>Quick Amounts</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {QUICK_AMOUNTS.map((a) => (
                <button key={a} onClick={() => setQuick(a)}
                  style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: 8, padding: "6px 14px", color: "var(--text2)", cursor: "pointer", fontSize: "0.82rem", fontFamily: "DM Sans, sans-serif" }}>
                  ₹{a.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          </Card>

          {recipient && amount > 0 ? (
            <div className="send-button-container">
              <Button variant="primary" full loading={loading} onClick={openPinModal}
                style={{ padding: "1rem", fontSize: "1rem", fontFamily: "Syne, sans-serif", fontWeight: 700 }}>
                ↗ Send Money
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text2)", fontSize: "0.9rem", padding: "2rem 1rem" }}>
              Select a recipient and enter an amount to proceed with the payment.
            </div>
          )}
        </div>
      </div>

      {/* ── Risk Warning Modal ──────────────────────────────────────────── */}
      {showRiskWarning && riskAnalysis && (
        <div className="pin-modal-backdrop" onClick={() => setShowRiskWarning(false)}>
          <div className="pin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>
                {riskAnalysis.action === "block" ? "🚫" : "⚠️"}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: riskColor[riskAnalysis.riskScore] }}>
                {riskAnalysis.action === "block" ? "Transaction Blocked" : "Unusual Transaction Detected"}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text2)", marginTop: 6 }}>
                Risk Level: <strong style={{ color: riskColor[riskAnalysis.riskScore] }}>{riskAnalysis.riskScore.toUpperCase()}</strong>
              </div>
            </div>

            <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "1rem", marginBottom: 16 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginBottom: 8, fontWeight: 600 }}>Why we flagged this:</div>
              {riskAnalysis.reasons.map((r, i) => (
                <div key={i} style={{ fontSize: "0.83rem", color: "var(--text2)", marginBottom: 4, display: "flex", gap: 6 }}>
                  <span>•</span><span>{r}</span>
                </div>
              ))}
            </div>

            {riskAnalysis.action === "block" ? (
              <Button variant="outline" full onClick={() => setShowRiskWarning(false)}>Understood, Cancel</Button>
            ) : (
              <>
                {otpSent && (
                  <FormGroup label="Enter OTP sent to your phone">
                    <input type="text" value={transactionOtp} onChange={(e) => setTransactionOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" maxLength={6} />
                  </FormGroup>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Button variant="outline" full onClick={() => setShowRiskWarning(false)}>Cancel</Button>
                  <Button variant="primary" full onClick={handleRiskAcknowledge} loading={loading}>
                    {otpSent ? "Proceed with OTP" : "Send OTP & Continue"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PIN Modal ──────────────────────────────────────────────────── */}
      {showPinModal && (
        <div className="pin-modal-backdrop" onClick={closePinModal}>
          <div className="pin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>Enter UPI PIN</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text3)", marginTop: 4 }}>Confirm payment for {recipient?.name}</div>
              </div>
              <button onClick={closePinModal} style={{ background: "transparent", border: "none", fontSize: "1.35rem", cursor: "pointer", color: "var(--text2)" }}>×</button>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "var(--text2)", fontSize: "0.85rem" }}>Amount</span>
                <span style={{ fontWeight: 700 }}>{fmt(amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)", fontSize: "0.85rem" }}>To</span>
                <span style={{ fontWeight: 700 }}>{recipient?.name}</span>
              </div>
            </div>
            {otpSent && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginBottom: 4 }}>Transaction OTP</div>
                <input type="text" value={transactionOtp} onChange={(e) => setTransactionOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="OTP from phone" maxLength={6}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: "1rem", textAlign: "center", letterSpacing: 4 }} />
              </div>
            )}
            <div className="pin-dots">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="pin-dot">{pin[i] ? "•" : ""}</div>
              ))}
            </div>
            {pinError && <div className="pin-error">{pinError}</div>}
            <div className="pin-keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button key={digit} type="button" className="pin-key" onClick={() => addPinKey(digit.toString())}>{digit}</button>
              ))}
              <button type="button" className="pin-key" onClick={delPinKey} style={{ fontSize: "1.1rem" }}>⌫</button>
              <button type="button" className="pin-key" onClick={() => addPinKey("0")}>0</button>
              <button type="button" className="pin-key" disabled={loading} onClick={handleSend}
                style={{ gridColumn: "span 3", background: "var(--accent)", color: "#fff", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

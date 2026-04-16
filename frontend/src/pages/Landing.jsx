import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import "./Landing.css";
export default function Landing() {
  const navigate = useNavigate();
  const { token } = useAuth();
  useEffect(() => {
    if (token) navigate("/app/dashboard");
  }, [token]);

  return (
    <div className="landing-page">
      <div className="landing-card">
        <div className="landing-logo">
          <div className="landing-brand">FinFlow</div>
          <div className="landing-tag">Secure Digital Payments</div>
        </div>

        <div className="landing-hero">
          <div className="landing-title">The future of money movement</div>
          <p className="landing-description">
            Send, receive, and manage money instantly with bank-grade security.
            No fees, no friction — just fast, safe transfers.
          </p>
        </div>

        <div className="landing-actions">
          <button onClick={() => navigate("/register")} className="btn-primary">
            Create Free Account
          </button>
          <button onClick={() => navigate("/login")} className="btn-secondary">
            Sign In
          </button>
        </div>

        <div className="landing-divider" />

        <div className="landing-highlights">
          {[
            ["₹0", "Transfer Fees"],
            ["256-bit", "Encryption"],
            ["Instant", "Settlement"],
          ].map(([v, l]) => (
            <div className="highlight-card" key={l}>
              <div className="highlight-value">{v}</div>
              <div className="highlight-label">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

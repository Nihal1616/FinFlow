import { useState, useEffect } from "react";
import { Button } from "./ui";
import "../styles/OTPVerification.css";

export function OTPVerification({
  channel,
  maskedTarget,
  onSubmit,
  onResend,
  loading,
  error,
  expiresIn,
  testOtp,
}) {
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(expiresIn || 600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  const handleSubmit = () => {
    if (otp.length !== 6) {
      return;
    }
    onSubmit(otp);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="otp-verification">
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Verify {channel === "email" ? "Email" : "Phone"}
        </div>
        <div style={{ fontSize: "0.9rem", color: "var(--text2)" }}>
          Enter the 6-digit code sent to
        </div>
        <div
          style={{ fontSize: "0.9rem", fontWeight: 600, marginTop: "0.25rem" }}
        >
          {maskedTarget}
        </div>
        {testOtp && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--accent)",
              marginTop: "0.5rem",
              fontWeight: 600,
              backgroundColor: "var(--bg2)",
              padding: "0.5rem",
              borderRadius: "0.25rem",
              border: "1px solid var(--accent)",
            }}
          >
            Test OTP: {testOtp}
          </div>
        )}
      </div>

      <div className="otp-input-group">
        <input
          type="text"
          value={otp}
          onChange={handleOtpChange}
          placeholder="000000"
          maxLength={6}
          autoFocus
          style={{
            fontSize: "2rem",
            letterSpacing: "0.5rem",
            textAlign: "center",
            fontWeight: 600,
          }}
        />
      </div>

      {error && <div className="otp-error">{error}</div>}

      <Button
        variant="primary"
        full
        loading={loading}
        onClick={handleSubmit}
        disabled={otp.length !== 6}
        style={{ marginTop: "1.5rem" }}
      >
        Verify OTP
      </Button>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <div
          style={{
            fontSize: "0.85rem",
            color: "var(--text2)",
            marginBottom: "0.75rem",
          }}
        >
          Expires in:{" "}
          <span style={{ fontWeight: 600 }}>{formatTime(timeLeft)}</span>
        </div>
        {canResend ? (
          <button
            onClick={() => {
              onResend();
              setOtp("");
              setTimeLeft(expiresIn || 600);
              setCanResend(false);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Resend OTP
          </button>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "var(--text3)" }}>
            Resend available in {formatTime(timeLeft)}
          </div>
        )}
      </div>
    </div>
  );
}

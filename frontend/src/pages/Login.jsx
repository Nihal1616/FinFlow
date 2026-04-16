import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import { FormGroup, Button } from "../components/ui";
import { OTPVerification } from "../components/OTPVerification";
import "./Login.css";

export default function Login() {
  const [step, setStep] = useState("login"); // "login" or "otp"
  const [mode, setMode] = useState("password"); // "password" or "decoy"
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [decoyPin, setDecoyPin] = useState("");
  const [otpData, setOtpData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      addToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setUserId(data.userId);
      setOtpData(data.otpData);
      setStep("otp");
      addToast("OTP sent to your " + data.otpData.channel, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDecoyLoginSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !decoyPin) {
      addToast("Enter your email/phone and decoy PIN", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/decoy-login", {
        identifier: form.identifier,
        decoyPin,
      });
      login(data.token, data.user);
      addToast("Decoy mode active", "success");
      navigate("/app/dashboard");
    } catch (err) {
      addToast(err.response?.data?.message || "Decoy login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (otpCode) => {
    setOtpError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-login-otp", {
        userId,
        otpCode,
      });
      login(data.token, data.user);
      addToast("Welcome back, " + data.user.name + "!", "success");
      navigate("/app/dashboard");
    } catch (err) {
      setOtpError(err.response?.data?.message || "OTP verification failed");
      addToast(
        err.response?.data?.message || "OTP verification failed",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpResend = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setOtpData(data.otpData);
      setOtpError("");
      addToast("New OTP sent to your " + data.otpData.channel, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to resend OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">FinFlow</div>

        {step === "login" ? (
          <>
            <h2 className="login-heading">Welcome back</h2>
            <p className="login-subtitle">Sign in to your account securely</p>

            {mode === "password" ? (
              <form onSubmit={handleLoginSubmit} className="login-form">
                <FormGroup label="Email or Phone">
                  <input
                    value={form.identifier}
                    onChange={set("identifier")}
                    placeholder="you@example.com"
                  />
                </FormGroup>
                <FormGroup label="Password">
                  <input
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Your password"
                  />
                </FormGroup>
                <Button
                  variant="primary"
                  full
                  loading={loading}
                  className="login-btn"
                >
                  Sign In
                </Button>
              </form>
            ) : (
              <form onSubmit={handleDecoyLoginSubmit} className="login-form">
                <FormGroup label="Email or Phone">
                  <input
                    value={form.identifier}
                    onChange={set("identifier")}
                    placeholder="you@example.com"
                  />
                </FormGroup>
                <FormGroup label="Decoy PIN">
                  <input
                    type="password"
                    value={decoyPin}
                    onChange={(e) =>
                      setDecoyPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter decoy PIN"
                    maxLength={6}
                  />
                </FormGroup>
                <Button
                  variant="primary"
                  full
                  loading={loading}
                  className="login-btn"
                >
                  Enter Decoy Wallet
                </Button>
              </form>
            )}

            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setMode(mode === "password" ? "decoy" : "password")
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "0.95rem",
                }}
              >
                {mode === "password"
                  ? "Login with Decoy PIN instead"
                  : "Back to Password Login"}
              </button>
            </div>

            <p className="login-note">
              New to FinFlow?{" "}
              <Link to="/register" className="login-link">
                Create account
              </Link>
            </p>
            <p className="login-back">
              <Link to="/" className="login-back-link">
                ← Back to home
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="login-heading">Verify Identity</h2>
            <p className="login-subtitle" style={{ marginBottom: "2rem" }}>
              Enter the code we sent to complete your login
            </p>

            <OTPVerification
              channel={otpData?.channel || "email"}
              maskedTarget={otpData?.maskedTarget}
              onSubmit={handleOtpSubmit}
              onResend={handleOtpResend}
              loading={loading}
              error={otpError}
              expiresIn={otpData?.expiresIn}
              testOtp={otpData?.testOtp}
            />

            <p className="login-back" style={{ marginTop: "2rem" }}>
              <button
                onClick={() => {
                  setStep("login");
                  setOtpError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text2)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "0.9rem",
                }}
              >
                ← Back to login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import { FormGroup, Button } from "../components/ui";
import { OTPVerification } from "../components/OTPVerification";
import "./Register.css";

export default function Register() {
  const [step, setStep] = useState("register"); // "register" or "otp"
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otpData, setOtpData] = useState(null);
  const [registrationId, setRegistrationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, password } = form;
    if (!name || !email || !phone || !password) {
      addToast("All fields are required", "error");
      return;
    }
    if (password.length < 8) {
      addToast("Password must be at least 8 characters", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setRegistrationId(data.registrationId);
      setOtpData(data.otpData);
      setStep("otp");
      addToast("OTP sent to your email", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (otpCode) => {
    setOtpError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-signup-otp", {
        registrationId,
        otpCode,
      });
      login(data.token, data.user);
      addToast("Welcome to FinFlow! 🎉", "success");
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
      const { data } = await api.post("/auth/register", form);
      setOtpData(data.otpData);
      setOtpError("");
      addToast("New OTP sent to your email", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to resend OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo">FinFlow</div>

        {step === "register" ? (
          <>
            <h2 className="register-title">Create Account</h2>
            <p className="register-subtitle">
              Join millions managing money digitally
            </p>

            <form onSubmit={handleRegisterSubmit} className="register-form">
              <FormGroup label="Full Name">
                <input
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Aarav Sharma"
                />
              </FormGroup>
              <FormGroup label="Email Address">
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="aarav@example.com"
                />
              </FormGroup>
              <FormGroup label="Phone Number">
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                />
              </FormGroup>
              <FormGroup label="Password">
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min 8 characters"
                />
              </FormGroup>
              <Button
                variant="primary"
                full
                loading={loading}
                className="register-submit-btn"
              >
                Create Account
              </Button>
            </form>

            <p className="register-login-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
            <p className="register-back-link">
              <Link to="/">← Back to home</Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="register-title">Verify Email</h2>
            <p className="register-subtitle" style={{ marginBottom: "2rem" }}>
              We sent a verification code to complete your registration
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

            <p className="register-back-link" style={{ marginTop: "2rem" }}>
              <button
                onClick={() => {
                  setStep("register");
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
                ← Back to registration
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

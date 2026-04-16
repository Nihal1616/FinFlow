import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import api from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import {
  Card,
  SectionTitle,
  Badge,
  Divider,
  ProgressBar,
  FormGroup,
  Button,
} from "../components/ui";
import "./Profile.css";

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const { addToast } = useNotifications();
  const qrRef = useRef(null);
  const [upiPin, setUpiPin] = useState("");
  const [confirmUpiPin, setConfirmUpiPin] = useState("");
  const [decoyPin, setDecoyPin] = useState("");
  const [decoyBalance, setDecoyBalance] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [forgotStep, setForgotStep] = useState(0); // 0=idle, 1=otp-sent
  const [forgotDecoyStep, setForgotDecoyStep] = useState(0);
  const [forgotDecoyOtp, setForgotDecoyOtp] = useState("");
  const [newDecoyPin, setNewDecoyPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSetPinForm, setShowSetPinForm] = useState(!user?.hasUpiPin);
  const [showDecoyConfigForm, setShowDecoyConfigForm] = useState(
    !user?.hasDecoyPin,
  );

  const handleSetUpiPin = async () => {
    if (
      !upiPin ||
      upiPin.length < 4 ||
      upiPin.length > 6 ||
      !/^\d+$/.test(upiPin)
    ) {
      addToast("PIN must be 4-6 digits", "error");
      return;
    }
    if (upiPin !== confirmUpiPin) {
      addToast("PINs do not match", "error");
      return;
    }
    setLoading(true);
    try {
      await api.put("/users/upi-pin", { pin: upiPin });
      addToast("UPI PIN set successfully", "success");
      setUpiPin("");
      setConfirmUpiPin("");
      await refreshUser();
      setShowSetPinForm(false);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to set PIN", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDecoyPin = async () => {
    if (!decoyPin || decoyPin.length < 4) {
      addToast("Decoy PIN must be 4-6 digits", "error");
      return;
    }
    setLoading(true);
    try {
      await api.put("/users/decoy-pin", { pin: decoyPin });
      addToast("Decoy PIN set successfully", "success");
      setDecoyPin("");
      await refreshUser();
      setShowDecoyConfigForm(false);
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to set decoy PIN",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSetDecoyBalance = async () => {
    const val = parseFloat(decoyBalance);
    if (isNaN(val) || val < 0) {
      addToast("Enter a valid balance", "error");
      return;
    }
    setLoading(true);
    try {
      await api.put("/users/decoy-balance", { balance: val });
      addToast("Decoy balance updated", "success");
      setDecoyBalance("");
      await refreshUser();
      if (user?.hasDecoyPin) {
        setShowDecoyConfigForm(false);
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to update balance",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinRequest = async () => {
    setLoading(true);
    try {
      await api.post("/users/forgot-pin/request");
      addToast("OTP sent to your email", "success");
      setForgotStep(1);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinReset = async () => {
    if (!forgotOtp || !newPin) {
      addToast("Enter OTP and new PIN", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/users/forgot-pin/reset", { otpCode: forgotOtp, newPin });
      addToast("PIN reset successfully!", "success");
      setForgotStep(0);
      setForgotOtp("");
      setNewPin("");
      await refreshUser();
      setShowSetPinForm(false);
    } catch (err) {
      addToast(err.response?.data?.message || "Reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotDecoyPinRequest = async () => {
    setLoading(true);
    try {
      await api.post("/users/forgot-decoy-pin/request");
      addToast("OTP sent to your email", "success");
      setForgotDecoyStep(1);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotDecoyPinReset = async () => {
    if (!forgotDecoyOtp || !newDecoyPin) {
      addToast("Enter OTP and new decoy PIN", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/users/forgot-decoy-pin/reset", {
        otpCode: forgotDecoyOtp,
        newDecoyPin,
      });
      addToast("Decoy PIN reset successfully!", "success");
      setForgotDecoyStep(0);
      setForgotDecoyOtp("");
      setNewDecoyPin("");
      await refreshUser();
      setShowDecoyConfigForm(false);
    } catch (err) {
      addToast(err.response?.data?.message || "Reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !qrRef.current) return;
    const payload = JSON.stringify({
      identifier: user.email || user.phone || user._id,
      name: user.name,
    });
    QRCode.toCanvas(qrRef.current, payload, {
      width: 160,
      margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    setShowSetPinForm(!Boolean(user?.hasUpiPin));
  }, [user?.hasUpiPin]);

  useEffect(() => {
    setShowDecoyConfigForm(!Boolean(user?.hasDecoyPin));
  }, [user?.hasDecoyPin]);

  const fields = [
    ["Full Name", user?.name],
    ["Email", user?.email],
    ["Phone", user?.phone || "—"],
    [
      "Member Since",
      user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
    ],
    ["User ID", user?._id],
    ["KYC Status", null],
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="profile-title">Profile</h1>
      <p className="profile-subtitle">
        Manage your account details and preferences
      </p>

      <div className="profile-container">
        <Card>
          <div style={{ textAlign: "center", padding: "1rem 0 1.5rem" }}>
            <div className="profile-avatar">{initials(user?.name)}</div>
            <div className="profile-name">{user?.name}</div>
            <div className="profile-email">{user?.email}</div>
            <div className="profile-badge-container">
              <Badge type="success">Verified Account</Badge>
            </div>
            <div className="profile-qr-section">
              <div className="profile-qr-label">
                Your QR for receive payments
              </div>
              <div className="profile-qr-container">
                <canvas ref={qrRef} width={160} height={160} />
              </div>
            </div>
          </div>
          <Divider />
          <div className="profile-details-list">
            {fields.map(([label, value]) => (
              <div key={label} className="profile-detail-item">
                <span className="profile-detail-label">{label}</span>
                {label === "KYC Status" ? (
                  <Badge type="success">Complete</Badge>
                ) : (
                  <span
                    className={
                      label === "User ID"
                        ? "profile-detail-value-userid"
                        : "profile-detail-value"
                    }
                  >
                    {value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Account Limits</SectionTitle>
          {[
            {
              label: "Daily Send Limit",
              val: 7500,
              max: 25000,
              color: "var(--green)",
            },
            {
              label: "Monthly Send Limit",
              val: 30000,
              max: 200000,
              color: "var(--blue)",
            },
            {
              label: "Wallet Capacity",
              val: 12450,
              max: 100000,
              color: "var(--accent)",
            },
          ].map(({ label, val, max, color }) => (
            <div key={label} className="profile-limits-item">
              <div className="profile-limits-header">
                <span className="profile-limits-label">{label}</span>
                <span className="profile-limits-value">
                  ₹{val.toLocaleString("en-IN")} / ₹
                  {max.toLocaleString("en-IN")}
                </span>
              </div>
              <ProgressBar value={(val / max) * 100} color={color} />
            </div>
          ))}
        </Card>

        {/* Security — UPI PIN */}
        <Card>
          <SectionTitle>Security</SectionTitle>
          <div className="profile-security-list">
            {[
              "256-bit AES Encryption",
              "JWT Auth (7-day expiry)",
              "bcrypt Password Hashing",
              "Rate Limited APIs",
            ].map((s) => (
              <div key={s} className="profile-security-item">
                <span className="profile-security-check">✓</span>
                <span className="profile-security-text">{s}</span>
              </div>
            ))}
          </div>
          <Divider />
          {showSetPinForm ? (
            <>
              <SectionTitle>Set UPI PIN</SectionTitle>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text2)",
                  marginBottom: "1rem",
                }}
              >
                Set a 4-6 digit PIN required for all transactions.
              </p>
              <FormGroup label="New UPI PIN">
                <input
                  type="password"
                  value={upiPin}
                  onChange={(e) =>
                    setUpiPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 4-6 digit PIN"
                  maxLength={6}
                />
              </FormGroup>
              <FormGroup label="Confirm UPI PIN">
                <input
                  type="password"
                  value={confirmUpiPin}
                  onChange={(e) =>
                    setConfirmUpiPin(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="Confirm PIN"
                  maxLength={6}
                />
              </FormGroup>
              <Button
                variant="primary"
                onClick={handleSetUpiPin}
                loading={loading}
                style={{ marginTop: "0.5rem" }}
              >
                Set PIN
              </Button>
            </>
          ) : (
            <div
              style={{
                fontSize: "0.95rem",
                color: "var(--text2)",
                marginBottom: "1rem",
              }}
            >
              Your UPI PIN is already set. Use the Forgot PIN section below if
              you need to reset it.
            </div>
          )}

          <Divider />

          {/* Forgot PIN */}
          <SectionTitle>Forgot PIN?</SectionTitle>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text2)",
              marginBottom: "1rem",
            }}
          >
            Reset your UPI PIN via email OTP.
          </p>
          {forgotStep === 0 && (
            <Button
              variant="outline"
              onClick={handleForgotPinRequest}
              loading={loading}
            >
              Send Reset OTP to Email
            </Button>
          )}
          {forgotStep === 1 && (
            <>
              <FormGroup label="OTP from Email">
                <input
                  type="text"
                  value={forgotOtp}
                  onChange={(e) =>
                    setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit OTP"
                  maxLength={6}
                />
              </FormGroup>
              <FormGroup label="New PIN">
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="New 4-6 digit PIN"
                  maxLength={6}
                />
              </FormGroup>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="primary"
                  onClick={handleForgotPinReset}
                  loading={loading}
                >
                  Reset PIN
                </Button>
                <Button variant="outline" onClick={() => setForgotStep(0)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
          <Divider />
          <button onClick={logout} className="profile-signout-btn">
            Sign Out
          </button>
        </Card>

        {/* Decoy Wallet Settings */}
        <Card>
          <SectionTitle>🎭 Decoy Wallet</SectionTitle>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text2)",
              marginBottom: "1rem",
              lineHeight: 1.6,
            }}
          >
            Configure a decoy wallet that shows fake data when accessed with a
            separate PIN. Real balance and transactions are never exposed in
            decoy mode.
          </p>
          {showDecoyConfigForm ? (
            <>
              <FormGroup label="Decoy PIN (4-6 digits)">
                <input
                  type="password"
                  value={decoyPin}
                  onChange={(e) =>
                    setDecoyPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Set decoy PIN (must differ from UPI PIN)"
                  maxLength={6}
                />
              </FormGroup>
              <Button
                variant="outline"
                onClick={handleSetDecoyPin}
                loading={loading}
                style={{ marginBottom: "1rem" }}
              >
                Set Decoy PIN
              </Button>
              <FormGroup label="Decoy Balance (₹)">
                <input
                  type="number"
                  value={decoyBalance}
                  onChange={(e) => setDecoyBalance(e.target.value)}
                  placeholder="e.g. 1250.75"
                  min={0}
                />
              </FormGroup>
              <Button
                variant="outline"
                onClick={handleSetDecoyBalance}
                loading={loading}
              >
                Update Decoy Balance
              </Button>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text2)",
                  marginBottom: "1rem",
                }}
              >
                Your decoy wallet is configured. If you forgot your decoy PIN,
                reset it below.
              </div>
              {forgotDecoyStep === 0 && (
                <Button
                  variant="outline"
                  onClick={handleForgotDecoyPinRequest}
                  loading={loading}
                >
                  Forgot Decoy PIN?
                </Button>
              )}
              {forgotDecoyStep === 1 && (
                <>
                  <FormGroup label="OTP from Email">
                    <input
                      type="text"
                      value={forgotDecoyOtp}
                      onChange={(e) =>
                        setForgotDecoyOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="6-digit OTP"
                      maxLength={6}
                    />
                  </FormGroup>
                  <FormGroup label="New Decoy PIN">
                    <input
                      type="password"
                      value={newDecoyPin}
                      onChange={(e) =>
                        setNewDecoyPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="New 4-6 digit PIN"
                      maxLength={6}
                    />
                  </FormGroup>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      variant="primary"
                      onClick={handleForgotDecoyPinReset}
                      loading={loading}
                    >
                      Reset Decoy PIN
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setForgotDecoyStep(0)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "rgba(255,179,71,0.1)",
              borderRadius: 8,
              fontSize: "0.8rem",
              color: "var(--amber)",
            }}
          >
            ⚠️ Keep your decoy PIN secret from your real PIN. In decoy mode,
            transfers are disabled and only fake transactions appear.
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useAuth } from "../context/AuthContext";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Card,
  SectionTitle,
  Badge,
  Divider,
  ProgressBar,
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
  const { user, logout } = useAuth();
  const qrRef = useRef(null);

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
        {/* Account Details */}
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

        {/* Account Limits */}
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

        {/* Preferences */}
        <Card>
          <SectionTitle>Preferences</SectionTitle>
          <div className="profile-preferences-list">
            {[
              ["Payment Notifications", true],
              ["Fraud Alerts", true],
              ["Two-Factor Auth", true],
              ["Email Receipts", false],
              ["Marketing Emails", false],
            ].map(([label, on]) => (
              <div key={label} className="profile-preference-item">
                <span className="profile-preference-label">{label}</span>
                <div
                  className={`profile-toggle ${on ? "profile-toggle-on" : "profile-toggle-off"}`}
                >
                  <div className="profile-toggle-knob" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Security */}
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
          <button onClick={logout} className="profile-signout-btn">
            Sign Out
          </button>
        </Card>
      </div>
    </div>
  );
}

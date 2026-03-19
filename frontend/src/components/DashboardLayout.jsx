import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useState } from "react";

const NAV = [
  { to: "dashboard", icon: "⊞", label: "Dashboard" },
  { to: "send", icon: "↗", label: "Send Money" },
  { to: "wallet", icon: "◉", label: "Wallet" },
  { to: "history", icon: "≡", label: "Transactions" },
  { to: "qr", icon: "▦", label: "QR Pay" },
  { to: "profile", icon: "◎", label: "Profile" },
];

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { notifications, clearNotifications } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="dashboard-shell">
      {/* ── Sidebar ── */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <div className="dashboard-brand">FinFlow</div>
          <div className="dashboard-tag">Digital Payments</div>
        </div>

        <nav className="dashboard-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={`/app/${to}`}
              className={({ isActive }) =>
                isActive ? "dashboard-nav-link active" : "dashboard-nav-link"
              }
            >
              <span className="dashboard-nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-user">
          <div className="dashboard-user-info">
            <div className="dashboard-avatar">{initials(user?.name)}</div>
            <div className="dashboard-user-text">
              <div className="dashboard-user-name">{user?.name}</div>
              <div className="dashboard-user-email">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="dashboard-logout">
            Sign Out
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <div className="dashboard-brand-mobile">
            <div className="dashboard-brand-mobile-name">FinFlow</div>
            <div className="dashboard-brand-mobile-tag">Digital Payments</div>
          </div>
          <div className="dashboard-actions">
            <div className="notif-wrap">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="notif-btn"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="notif-badge">
                    {Math.min(notifications.length, 9)}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="notif-popover">
                  <div className="notif-header">
                    <span>Notifications</span>
                    <button
                      onClick={() => {
                        clearNotifications();
                        setNotifOpen(false);
                      }}
                      className="notif-clear"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="notif-item">
                          <div>{n.message}</div>
                          <div className="notif-time">
                            {new Date(n.time).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div
              onClick={() => navigate("/app/profile")}
              className="dashboard-avatar-small"
            >
              {initials(user?.name)}
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      <div className="dashboard-mobile-nav">
        {[
          { to: "dashboard", icon: "⊞", label: "Home" },
          { to: "qr", icon: "▦", label: "QR" },
          { to: "history", icon: "≡", label: "Txns" },
          { to: "wallet", icon: "◉", label: "Wallet" },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={`/app/${item.to}`}
            className={({ isActive }) =>
              isActive ? "mobile-nav-item active" : "mobile-nav-item"
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

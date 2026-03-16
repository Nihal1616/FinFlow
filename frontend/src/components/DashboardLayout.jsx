import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useState } from 'react';

const NAV = [
  { to: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { to: 'send',      icon: '↗', label: 'Send Money' },
  { to: 'wallet',    icon: '◉', label: 'Wallet' },
  { to: 'history',   icon: '≡', label: 'Transactions' },
  { to: 'qr',        icon: '▦', label: 'QR Pay' },
  { to: 'profile',   icon: '◎', label: 'Profile' },
];

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { notifications, clearNotifications } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, background: 'var(--card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 800,
            background: 'linear-gradient(135deg,#8b85ff,#22d3a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FinFlow
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            Digital Payments
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '1rem 0', flex: 1 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={`/app/${to}`}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.75rem 1.5rem', textDecoration: 'none',
                color: isActive ? 'var(--accent2)' : 'var(--text2)',
                background: isActive ? 'rgba(108,99,255,0.1)' : 'transparent',
                fontSize: '0.9rem', fontWeight: 500, position: 'relative',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all 0.2s',
              })}>
              <span style={{ width: 20, textAlign: 'center' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,var(--accent),var(--green))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8rem', fontFamily: 'Syne, sans-serif',
            }}>{initials(user?.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.4rem', background: 'transparent',
            border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)',
            cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif',
          }}>Sign Out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ marginLeft: 240, flex: 1, minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Topbar */}
        <div style={{
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', position: 'sticky', top: 0, zIndex: 50, gap: 12,
        }}>
          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setNotifOpen(o => !o); }}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '6px 12px', cursor: 'pointer', color: 'var(--text2)', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', gap: 6 }}>
              🔔
              {notifications.length > 0 && (
                <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10,
                  fontSize: '0.65rem', padding: '1px 6px', fontWeight: 700 }}>
                  {Math.min(notifications.length, 9)}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', width: 300,
                background: 'var(--card2)', border: '1px solid var(--border2)',
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden',
              }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notifications</span>
                  <button onClick={() => { clearNotifications(); setNotifOpen(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Clear all
                  </button>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.length === 0
                    ? <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.85rem' }}>No notifications</div>
                    : notifications.map(n => (
                      <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                        <div>{n.message}</div>
                        <div style={{ color: 'var(--text3)', fontSize: '0.72rem', marginTop: 2 }}>
                          {new Date(n.time).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div onClick={() => navigate('/app/profile')} style={{
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            background: 'linear-gradient(135deg,var(--accent),var(--green))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.75rem', fontFamily: 'Syne, sans-serif',
          }}>{initials(user?.name)}</div>
        </div>

        <div style={{ padding: '2rem' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

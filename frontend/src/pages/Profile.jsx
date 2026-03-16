import { useAuth } from '../context/AuthContext';
import { Card, SectionTitle, Badge, Divider, ProgressBar } from '../components/ui';

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Profile() {
  const { user, logout } = useAuth();

  const fields = [
    ['Full Name',     user?.name],
    ['Email',         user?.email],
    ['Phone',         user?.phone || '—'],
    ['Member Since',  user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
    ['User ID',       user?._id],
    ['KYC Status',    null],
  ];

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Profile</h1>
      <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Manage your account details and preferences</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: 840 }}>
        {/* Left: identity */}
        <Card>
          <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1rem',
              background: 'linear-gradient(135deg,var(--accent),var(--green))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.8rem', fontFamily: 'Syne, sans-serif',
            }}>{initials(user?.name)}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{user?.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text2)', marginTop: 4 }}>{user?.email}</div>
            <div style={{ marginTop: '0.75rem' }}><Badge type="success">Verified Account</Badge></div>
          </div>

          <Divider />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fields.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>{label}</span>
                {label === 'KYC Status'
                  ? <Badge type="success">Complete</Badge>
                  : <span style={{ fontSize: '0.85rem', fontWeight: 600, color: label === 'User ID' ? 'var(--text3)' : 'var(--text)',
                      fontFamily: label === 'User ID' ? 'monospace' : 'inherit', fontSize: label === 'User ID' ? '0.72rem' : '0.85rem' }}>
                      {value}
                    </span>
                }
              </div>
            ))}
          </div>
        </Card>

        {/* Right: limits + prefs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card>
            <SectionTitle>Account Limits</SectionTitle>
            {[
              { label: 'Daily Send Limit',   val: 7500,  max: 25000,  color: 'var(--green)' },
              { label: 'Monthly Send Limit', val: 30000, max: 200000, color: 'var(--blue)' },
              { label: 'Wallet Capacity',    val: 12450, max: 100000, color: 'var(--accent)' },
            ].map(({ label, val, max, color }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    ₹{val.toLocaleString('en-IN')} / ₹{max.toLocaleString('en-IN')}
                  </span>
                </div>
                <ProgressBar value={(val / max) * 100} color={color} />
              </div>
            ))}
          </Card>

          <Card>
            <SectionTitle>Preferences</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Payment Notifications', true],
                ['Fraud Alerts',          true],
                ['Two-Factor Auth',       true],
                ['Email Receipts',        false],
                ['Marketing Emails',      false],
              ].map(([label, on]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.87rem' }}>{label}</span>
                  <div style={{
                    width: 38, height: 22, borderRadius: 11, cursor: 'pointer',
                    background: on ? 'var(--green)' : 'var(--bg4)',
                    display: 'flex', alignItems: 'center',
                    padding: on ? '0 3px 0 17px' : '0 17px 0 3px',
                    transition: 'all 0.3s',
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Security</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
              {['256-bit AES Encryption', 'JWT Auth (7-day expiry)', 'bcrypt Password Hashing', 'Rate Limited APIs'].map(s => (
                <div key={s} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>✓</span>
                  <span style={{ fontSize: '0.85rem' }}>{s}</span>
                </div>
              ))}
            </div>
            <button onClick={logout} style={{
              width: '100%', padding: '0.65rem', background: 'rgba(255,87,87,0.15)',
              border: '1px solid rgba(255,87,87,0.3)', borderRadius: 8,
              color: 'var(--red)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500, fontSize: '0.9rem', transition: 'all 0.2s',
            }}>Sign Out</button>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { token } = useAuth();
  useEffect(() => { if (token) navigate('/app/dashboard'); }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 24, padding: '3rem', width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.8rem', fontWeight: 800,
            background: 'linear-gradient(135deg,#8b85ff,#22d3a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FinFlow
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
            Secure Digital Payments
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>
            The future of money movement
          </div>
          <p style={{ color: 'var(--text2)', lineHeight: 1.7, fontSize: '0.9rem' }}>
            Send, receive, and manage money instantly with bank-grade security. No fees, no friction — just fast, safe transfers.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => navigate('/register')} style={{
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
            padding: '1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>Create Free Account</button>
          <button onClick={() => navigate('/login')} style={{
            background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border2)',
            borderRadius: 10, padding: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>Sign In</button>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '2rem 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          {[['₹0', 'Transfer Fees'], ['256-bit', 'Encryption'], ['Instant', 'Settlement']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--accent2)', fontSize: '1.1rem' }}>{v}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

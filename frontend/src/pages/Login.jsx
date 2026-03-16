import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import { FormGroup, Button } from '../components/ui';

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) { addToast('Please fill in all fields', 'error'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      addToast('Welcome back, ' + data.user.name + '!', 'success');
      navigate('/app/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 420 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800,
          background: 'linear-gradient(135deg,#8b85ff,#22d3a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>
          FinFlow
        </div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Welcome back</h2>
        <p style={{ color: 'var(--text2)', marginBottom: '2rem', fontSize: '0.9rem' }}>Sign in to your account securely</p>

        <form onSubmit={handleSubmit}>
          <FormGroup label="Email or Phone">
            <input value={form.identifier} onChange={set('identifier')} placeholder="you@example.com" />
          </FormGroup>
          <FormGroup label="Password">
            <input type="password" value={form.password} onChange={set('password')} placeholder="Your password" />
          </FormGroup>
          <Button variant="primary" full loading={loading} style={{ marginTop: 8 }}>
            Sign In
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text2)' }}>
          New to FinFlow?{' '}
          <Link to="/register" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>Create account</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <Link to="/" style={{ color: 'var(--text3)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

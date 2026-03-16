import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import { FormGroup, Button } from '../components/ui';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, password } = form;
    if (!name || !email || !phone || !password) { addToast('All fields are required', 'error'); return; }
    if (password.length < 8) { addToast('Password must be at least 8 characters', 'error'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      addToast('Welcome to FinFlow, ' + data.user.name + '! 🎉', 'success');
      navigate('/app/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Registration failed', 'error');
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
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Create Account</h2>
        <p style={{ color: 'var(--text2)', marginBottom: '2rem', fontSize: '0.9rem' }}>Join millions managing money digitally</p>

        <form onSubmit={handleSubmit}>
          <FormGroup label="Full Name">
            <input value={form.name} onChange={set('name')} placeholder="Aarav Sharma" />
          </FormGroup>
          <FormGroup label="Email Address">
            <input type="email" value={form.email} onChange={set('email')} placeholder="aarav@example.com" />
          </FormGroup>
          <FormGroup label="Phone Number">
            <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </FormGroup>
          <FormGroup label="Password">
            <input type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" />
          </FormGroup>
          <Button variant="primary" full loading={loading} style={{ marginTop: 8 }}>
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>Sign in</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <Link to="/" style={{ color: 'var(--text3)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

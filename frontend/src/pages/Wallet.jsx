import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { Card, WalletCard, SectionTitle, FormGroup, Button, Divider, ProgressBar } from '../components/ui';

const QUICK = [500, 1000, 2000, 5000];

export default function Wallet() {
  const { addToast } = useNotifications();
  const [wallet, setWallet]   = useState(null);
  const [stats, setStats]     = useState({ added: 0, sent: 0, received: 0 });
  const [amount, setAmount]   = useState('');
  const [method, setMethod]   = useState('UPI');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const [wRes, txRes] = await Promise.all([
      api.get('/wallet/balance'),
      api.get('/transactions/history?limit=100'),
    ]);
    setWallet(wRes.data);
    const txs = txRes.data.transactions;
    const added    = txs.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
    const sent     = txs.filter(t => t.type === 'transfer' && t.senderId).reduce((a, t) => a + t.amount, 0);
    const received = txs.filter(t => t.type === 'transfer' && t.receiverId).reduce((a, t) => a + t.amount, 0);
    setStats({ added, sent, received });
  };

  useEffect(() => { fetchData().catch(console.error); }, []);

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { addToast('Enter a valid amount', 'error'); return; }
    if (amt > 100000)     { addToast('Max ₹1,00,000 per top-up', 'error'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/wallet/add-money', { amount: amt, method });
      setWallet(w => ({ ...w, balance: data.balance }));
      addToast(`₹${amt.toLocaleString('en-IN')} added to your wallet!`, 'success');
      setAmount('');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add money', 'error');
    } finally { setLoading(false); }
  };

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const bal = wallet?.balance || 0;
  const net = stats.received - stats.sent + stats.added;

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Wallet</h1>
      <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Manage your digital wallet</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: 860 }}>
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <WalletCard balance={bal}>
              <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne, sans-serif', letterSpacing: '0.08em' }}>
                WALLET ID: FF-{(wallet && 'WALLET') || '------'}
              </div>
            </WalletCard>
          </div>

          <Card>
            <SectionTitle>Add Money</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => setAmount(q.toString())} style={{
                  background: amount === q.toString() ? 'rgba(108,99,255,0.2)' : 'transparent',
                  border: `1px solid ${amount === q.toString() ? 'var(--accent)' : 'var(--border2)'}`,
                  borderRadius: 8, padding: '6px 14px', color: amount === q.toString() ? 'var(--accent2)' : 'var(--text2)',
                  cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s',
                }}>₹{q.toLocaleString('en-IN')}</button>
              ))}
            </div>
            <FormGroup label="Custom amount (₹)">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" min={1} max={100000} />
            </FormGroup>
            <FormGroup label="Payment method">
              <select value={method} onChange={e => setMethod(e.target.value)}>
                <option value="UPI">UPI (Simulated)</option>
                <option value="NetBanking">Net Banking (Simulated)</option>
                <option value="Card">Debit / Credit Card (Simulated)</option>
              </select>
            </FormGroup>
            <Button variant="success" full loading={loading} onClick={handleAdd} style={{ padding: '0.85rem' }}>
              + Add Money to Wallet
            </Button>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card>
            <SectionTitle>Wallet Stats</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Total Added',    fmt(stats.added),    'var(--green)'],
                ['Total Sent',     fmt(stats.sent),     'var(--red)'],
                ['Total Received', fmt(stats.received), 'var(--blue)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text2)' }}>{l}</span>
                  <span style={{ fontWeight: 600, color: c }}>{v}</span>
                </div>
              ))}
              <Divider />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Net Flow</span>
                <span style={{ fontWeight: 800, fontFamily: 'Syne, sans-serif', color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Account Limits</SectionTitle>
            {[
              { label: 'Wallet Balance', max: 100000, val: bal, color: 'var(--accent)' },
              { label: 'Daily Send Limit', max: 25000, val: 7500, color: 'var(--green)' },
              { label: 'Monthly Limit', max: 200000, val: 30000, color: 'var(--blue)' },
            ].map(({ label, max, val, color }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{label}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>₹{val.toLocaleString('en-IN')} / ₹{max.toLocaleString('en-IN')}</span>
                </div>
                <ProgressBar value={(val / max) * 100} color={color} />
              </div>
            ))}
          </Card>

          <Card>
            <SectionTitle>Security</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['256-bit AES Encryption', '2FA Protected', 'RBI Regulated', 'Fraud Detection Active', '₹5L Insurance Cover'].map(s => (
                <div key={s} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>✓</span>
                  <span style={{ fontSize: '0.87rem' }}>{s}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

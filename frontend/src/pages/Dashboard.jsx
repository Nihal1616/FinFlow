import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Card, StatCard, WalletCard, SectionTitle, TransactionItem, Button } from '../components/ui';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance]   = useState(0);
  const [txs, setTxs]           = useState([]);
  const [stats, setStats]       = useState({ sent: 0, received: 0, total: 0 });
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/wallet/balance'),
      api.get('/transactions/history?limit=5'),
    ]).then(([walletRes, txRes]) => {
      setBalance(walletRes.data.balance);
      const all = txRes.data.transactions;
      setTxs(all);
      const sent     = all.filter(t => t.senderId?._id === user?._id).reduce((a, t) => a + t.amount, 0);
      const received = all.filter(t => t.receiverId?._id === user?._id).reduce((a, t) => a + t.amount, 0);
      setStats({ sent, received, total: txRes.data.pagination.total });
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  if (loading) return <div style={{ color: 'var(--text3)', padding: '2rem' }}>Loading dashboard...</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0 }}>{greeting()}, {user?.name?.split(' ')[0]}!</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: '0.9rem' }}>Here's your financial overview</p>
        </div>
        <Button onClick={() => navigate('/app/send')}>↗ Send Money</Button>
      </div>

      {/* Wallet card */}
      <div style={{ marginBottom: '1.5rem' }}>
        <WalletCard balance={balance}>
          <div style={{ display: 'flex', gap: 10, marginTop: '1rem' }}>
            <button onClick={() => navigate('/app/wallet')} style={{
              background: '#1a9f7a', color: '#fff', border: 'none', borderRadius: 8,
              padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            }}>+ Add Money</button>
            <button onClick={() => navigate('/app/send')} style={{
              background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif',
            }}>Send ↗</button>
          </div>
        </WalletCard>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Sent (All time)"      value={fmt(stats.sent)}     color="var(--red)" />
        <StatCard label="Received (All time)"  value={fmt(stats.received)} color="var(--green)" />
        <StatCard label="Transactions"         value={stats.total}         color="var(--accent2)" />
        <StatCard label="Fees Saved"           value="₹0.00"               color="var(--amber)" />
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <SectionTitle action={
            <span onClick={() => navigate('/app/history')} style={{ fontSize: '0.8rem', color: 'var(--accent2)', cursor: 'pointer' }}>
              View all →
            </span>
          }>Recent Activity</SectionTitle>
          {txs.length === 0
            ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)', fontSize: '0.85rem' }}>No transactions yet</div>
            : txs.map(t => <TransactionItem key={t._id} tx={t} currentUserId={user?._id} />)
          }
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick actions */}
          <Card>
            <SectionTitle>Quick Actions</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: '↗', label: 'Send', path: '/app/send',    color: 'rgba(108,99,255,0.15)', tc: 'var(--accent2)' },
                { icon: '+', label: 'Add',  path: '/app/wallet',  color: 'rgba(34,211,160,0.15)', tc: 'var(--green)' },
                { icon: '▦', label: 'QR',   path: '/app/qr',      color: 'rgba(255,179,71,0.15)', tc: 'var(--amber)' },
                { icon: '≡', label: 'History', path: '/app/history', color: 'rgba(79,195,247,0.15)', tc: 'var(--blue)' },
              ].map(({ icon, label, path, color, tc }) => (
                <button key={label} onClick={() => navigate(path)} style={{
                  background: color, border: 'none', borderRadius: 12, padding: '1rem',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'opacity 0.2s',
                }}>
                  <span style={{ fontSize: '1.4rem', color: tc }}>{icon}</span>
                  <span style={{ fontSize: '0.8rem', color: tc, fontWeight: 500, fontFamily: 'Syne, sans-serif' }}>{label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Weekly chart */}
          <Card>
            <SectionTitle>Weekly Activity</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
              {[20, 60, 40, 80, 30, 90, 50].map((h, i) => (
                <div key={i} style={{ flex: 1, height: h + '%', background: 'var(--accent)', borderRadius: '4px 4px 0 0', opacity: 0.7 }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <span key={d} style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{d}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

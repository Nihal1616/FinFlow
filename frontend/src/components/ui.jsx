// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 20, padding: '1.5rem', ...style,
    }}>
      {children}
    </div>
  );
}

export function CardSm({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--card2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem', ...style,
    }}>
      {children}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', color }}>{value}</div>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  success: { background: 'rgba(34,211,160,0.15)', color: 'var(--green)' },
  danger:  { background: 'rgba(255,87,87,0.15)',   color: 'var(--red)' },
  warning: { background: 'rgba(255,179,71,0.15)',  color: 'var(--amber)' },
  info:    { background: 'rgba(79,195,247,0.15)',  color: 'var(--blue)' },
  purple:  { background: 'rgba(108,99,255,0.15)',  color: 'var(--accent2)' },
};
export function Badge({ type = 'info', children }) {
  return (
    <span style={{
      ...BADGE_STYLES[type],
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Syne, sans-serif',
    }}>
      {children}
    </span>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────
const BTN = {
  primary: { background: 'var(--accent)',  color: '#fff', border: 'none' },
  success: { background: 'var(--green2,#1a9f7a)', color: '#fff', border: 'none' },
  outline: { background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border2)' },
  danger:  { background: 'var(--red2,#cc3333)', color: '#fff', border: 'none' },
};
export function Button({ variant = 'primary', size = 'md', full, loading, children, ...props }) {
  const pad = size === 'sm' ? '0.4rem 0.9rem' : size === 'lg' ? '0.9rem 1.5rem' : '0.65rem 1.25rem';
  return (
    <button {...props} disabled={loading || props.disabled} style={{
      ...BTN[variant], borderRadius: 8, padding: pad,
      fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: size === 'sm' ? '0.8rem' : '0.9rem',
      cursor: 'pointer', width: full ? '100%' : undefined,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all 0.2s', opacity: (loading || props.disabled) ? 0.6 : 1,
      ...props.style,
    }}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}

// ── Form Elements ────────────────────────────────────────────────────────────
export function FormGroup({ label, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {label && <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>{label}</label>}
      {children}
    </div>
  );
}

// ── Section Title ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem' }}>{children}</div>
      {action}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, color = 'var(--accent)' }) {
  return (
    <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        borderRadius: 3, background: color, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
export function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />;
}

// ── Filter Tabs ───────────────────────────────────────────────────────────────
export function FilterTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: '1rem' }}>
      {tabs.map(tab => (
        <button key={tab.value} onClick={() => onChange(tab.value)} style={{
          padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontSize: '0.8rem', fontWeight: 500, fontFamily: 'Syne, sans-serif',
          background: active === tab.value ? 'var(--accent)' : 'transparent',
          color: active === tab.value ? '#fff' : 'var(--text2)',
          transition: 'all 0.2s',
        }}>{tab.label}</button>
      ))}
    </div>
  );
}

// ── Wallet Card ───────────────────────────────────────────────────────────────
export function WalletCard({ balance, children }) {
  return (
    <div className="wallet-gradient" style={{ borderRadius: 20, padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(108,99,255,0.1)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Syne, sans-serif' }}>
          Total Balance
        </div>
        <div style={{ fontSize: '2.8rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#fff', margin: '0.5rem 0' }}>
          <span style={{ fontSize: '1.4rem', opacity: 0.7 }}>₹</span>
          {Number(balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Transaction Item ──────────────────────────────────────────────────────────
export function TransactionItem({ tx, currentUserId }) {
  const isAdd    = tx.type === 'credit';
  const isSent   = !isAdd && tx.senderId?._id === currentUserId;
  const other    = isSent ? tx.receiverId : tx.senderId;
  const label    = isAdd ? 'Added to Wallet' : (isSent ? `To ${other?.name || 'Unknown'}` : `From ${other?.name || 'Unknown'}`);
  const amount   = `${isSent ? '-' : '+'}₹${Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const color    = isAdd || !isSent ? 'var(--green)' : 'var(--red)';
  const icon     = isAdd ? '+' : isSent ? '↗' : '↙';
  const iconBg   = isAdd || !isSent ? 'rgba(34,211,160,0.15)' : 'rgba(255,87,87,0.15)';
  const iconClr  = isAdd || !isSent ? 'var(--green)' : 'var(--red)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: iconBg, color: iconClr,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
          {new Date(tx.createdAt).toLocaleString('en-IN')}
          {tx.note ? ` · ${tx.note}` : ''}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 1 }}>ID: {tx.transactionId}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{amount}</div>
        <Badge type="success">{tx.status}</Badge>
      </div>
    </div>
  );
}

import { useNotifications } from '../context/NotificationContext';

const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
const COLORS = {
  success: 'var(--green)',
  error:   'var(--red)',
  info:    'var(--blue)',
  warning: 'var(--amber)',
};

export default function NotificationToast() {
  const { toasts, removeToast } = useNotifications();

  return (
    <div style={{
      position: 'fixed', top: '1rem', right: '1rem',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 340,
    }}>
      {toasts.map(toast => (
        <div key={toast.id} className="animate-slide-in" style={{
          background: 'var(--card2)', border: `1px solid var(--border2)`,
          borderLeft: `3px solid ${COLORS[toast.type] || COLORS.info}`,
          borderRadius: 12, padding: '0.9rem 1.1rem',
          display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem',
        }}>
          <span style={{ color: COLORS[toast.type], flexShrink: 0 }}>{ICONS[toast.type]}</span>
          <div style={{ flex: 1 }}>{toast.message}</div>
          <button onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0 }}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

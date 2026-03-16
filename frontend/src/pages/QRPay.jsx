import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import { Card, SectionTitle, Button } from '../components/ui';

function drawQR(canvas, userId, name) {
  const ctx = canvas.getContext('2d');
  const W = 200;
  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, W);

  const size = 10, margin = 20;
  const cell = Math.floor((W - margin * 2) / size);
  const seed = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  ctx.fillStyle = '#1a1a2e';
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const v = (seed * (i + 1) * (j + 3)) % 7;
      const inCorner = (i < 3 && j < 3) || (i < 3 && j >= size - 3) || (i >= size - 3 && j < 3);
      if (v > 3 || inCorner) {
        ctx.fillRect(margin + j * cell, margin + i * cell, cell - 1, cell - 1);
      }
    }
  }

  // Corner markers
  [[0, 0], [0, size - 3], [size - 3, 0]].forEach(([r, c]) => {
    const x = margin + c * cell, y = margin + r * cell, s = 3 * cell;
    ctx.fillStyle = '#6c63ff';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y + 4, s - 8, s - 8);
    ctx.fillStyle = '#6c63ff';
    ctx.fillRect(x + 8, y + 8, s - 16, s - 16);
  });

  // Center logo text
  ctx.fillStyle = '#6c63ff';
  ctx.font = 'bold 8px Syne, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FF', W / 2, W / 2 + 3);
}

export default function QRPay() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (canvasRef.current && user) {
      drawQR(canvasRef.current, user._id, user.name);
    }
    // Fetch other users for simulate scan
    api.get('/users/search?q=a').then(r => setUsers(r.data.users)).catch(() => {});
  }, [user]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'finflow-qr.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
    addToast('QR Code downloaded!', 'success');
  };

  const copyLink = () => {
    const link = `https://finflow.app/pay/${user?._id}`;
    navigator.clipboard?.writeText(link);
    addToast('Payment link copied to clipboard!', 'success');
  };

  const simulateScan = () => {
    if (users.length === 0) { addToast('No users available to scan', 'info'); return; }
    const random = users[Math.floor(Math.random() * users.length)];
    addToast(`Scanned ${random.name}'s QR code`, 'info');
    navigate('/app/send', { state: { recipient: random } });
  };

  const payLink = `https://finflow.app/pay/${user?._id}?name=${encodeURIComponent(user?.name || '')}`;

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>QR Pay</h1>
      <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Scan or share your QR code to receive payments instantly</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: 720 }}>
        {/* My QR */}
        <Card style={{ textAlign: 'center' }}>
          <SectionTitle>Your QR Code</SectionTitle>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1rem', display: 'inline-block', marginBottom: '1rem' }}>
            <canvas ref={canvasRef} width={200} height={200} />
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 2 }}>{user?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '1rem' }}>{user?.phone}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button variant="primary" size="sm" onClick={downloadQR}>↓ Download</Button>
            <Button variant="outline" size="sm" onClick={copyLink}>Share Link</Button>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Scan & Pay */}
          <Card>
            <SectionTitle>Scan & Pay</SectionTitle>
            <div onClick={simulateScan} style={{
              background: 'var(--bg3)', border: '2px dashed var(--border2)', borderRadius: 12,
              padding: '2.5rem 1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>▦</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text2)', fontWeight: 500 }}>Tap to simulate scan</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 4 }}>Demo — scans a random FinFlow user</div>
            </div>
          </Card>

          {/* Payment link */}
          <Card>
            <SectionTitle>Payment Link</SectionTitle>
            <div style={{
              background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text2)',
              wordBreak: 'break-all', marginBottom: '0.75rem', lineHeight: 1.5,
            }}>
              {payLink}
            </div>
            <Button variant="outline" size="sm" onClick={copyLink}>Copy Link</Button>
          </Card>

          {/* Tips */}
          <Card>
            <SectionTitle>How it works</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['1', 'Show your QR code to the payer'],
                ['2', 'They scan it with FinFlow app'],
                ['3', 'Enter amount & confirm payment'],
                ['4', 'Money credited instantly!'],
              ].map(([n, text]) => (
                <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(108,99,255,0.2)',
                    color: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>{n}</div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

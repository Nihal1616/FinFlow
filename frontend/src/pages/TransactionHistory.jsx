import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Card, FilterTabs, TransactionItem, Button } from '../components/ui';

const TABS = [
  { label: 'All',      value: 'all' },
  { label: 'Sent',     value: 'sent' },
  { label: 'Received', value: 'received' },
];

export default function TransactionHistory() {
  const { user } = useAuth();
  const [filter, setFilter]       = useState('all');
  const [txs, setTxs]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({});
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');

  const fetchTxs = useCallback(async (f = filter, p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (f !== 'all') params.set('type', f);
      if (from) params.set('from', from);
      if (to)   params.set('to', to);
      const { data } = await api.get(`/transactions/history?${params}`);
      setTxs(data.transactions);
      setPagination(data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter, page, from, to]);

  useEffect(() => { fetchTxs(filter, page); }, [filter, page]);

  const changeFilter = (f) => { setFilter(f); setPage(1); };
  const applyDates   = () => { setPage(1); fetchTxs(filter, 1); };
  const clearDates   = () => { setFrom(''); setTo(''); setPage(1); fetchTxs(filter, 1); };

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Transaction History</h1>
      <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>All your past transactions in one place</p>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <FilterTabs tabs={TABS} active={filter} onChange={changeFilter} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 3 }}>From</div>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ width: 150, padding: '6px 10px', fontSize: '0.82rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 3 }}>To</div>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ width: 150, padding: '6px 10px', fontSize: '0.82rem' }} />
          </div>
          <Button variant="outline" size="sm" onClick={applyDates} style={{ alignSelf: 'flex-end' }}>Apply</Button>
          {(from || to) && (
            <Button variant="outline" size="sm" onClick={clearDates} style={{ alignSelf: 'flex-end' }}>Clear</Button>
          )}
        </div>
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : txs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)', fontSize: '0.9rem' }}>
            No transactions found
          </div>
        ) : (
          txs.map(t => (
            <TransactionItem key={t._id} tx={t} currentUserId={user?._id} />
          ))
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</Button>
            <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--text2)' }}>
              Page {page} of {pagination.pages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>Next →</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

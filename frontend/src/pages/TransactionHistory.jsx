import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Card, FilterTabs, TransactionItem, Button } from "../components/ui";
import "./TransactionHistory.css";

const TABS = [
  { label: "All", value: "all" },
  { label: "Sent", value: "sent" },
  { label: "Received", value: "received" },
];

export default function TransactionHistory() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchTxs = useCallback(
    async (f = filter, p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: p, limit: 15 });
        if (f !== "all") params.set("type", f);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const { data } = await api.get(`/transactions/history?${params}`);
        setTxs(data.transactions);
        setPagination(data.pagination);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [filter, page, from, to],
  );

  useEffect(() => {
    fetchTxs(filter, page);
  }, [filter, page]);

  const changeFilter = (f) => {
    setFilter(f);
    setPage(1);
  };
  const applyDates = () => {
    setPage(1);
    fetchTxs(filter, 1);
  };
  const clearDates = () => {
    setFrom("");
    setTo("");
    setPage(1);
    fetchTxs(filter, 1);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="transaction-history-title">Transaction History</h1>
      <p className="transaction-history-subtitle">
        All your past transactions in one place
      </p>

      <div className="transaction-history-filters">
        <FilterTabs tabs={TABS} active={filter} onChange={changeFilter} />
        <div className="transaction-history-date-filters">
          <div>
            <div className="transaction-history-date-label">From</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="transaction-history-date-input"
            />
          </div>
          <div>
            <div className="transaction-history-date-label">To</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="transaction-history-date-input"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={applyDates}
            style={{ alignSelf: "flex-end" }}
          >
            Apply
          </Button>
          {(from || to) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearDates}
              style={{ alignSelf: "flex-end" }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="transaction-history-loading">
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : txs.length === 0 ? (
          <div className="transaction-history-empty">No transactions found</div>
        ) : (
          txs.map((t) => (
            <TransactionItem key={t._id} tx={t} currentUserId={user?._id} />
          ))
        )}

        {pagination.pages > 1 && (
          <div className="transaction-history-pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Prev
            </Button>
            <span className="transaction-history-page-info">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
            >
              Next →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

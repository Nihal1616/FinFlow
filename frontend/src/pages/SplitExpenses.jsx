import { useState, useEffect } from "react";
import api from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import { Card, Button, SectionTitle, Divider, Badge } from "../components/ui";
import "./SplitExpenses.css";

export default function SplitExpenses() {
  const { addToast } = useNotifications();
  const [view, setView] = useState("overview"); // overview | group | new-group | new-expense
  const [groups, setGroups] = useState([]);
  const [balances, setBalances] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  // New group form
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // New expense form
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [splitType, setSplitType] = useState("equal");

  // Settle PIN modal
  const [settleExpense, setSettleExpense] = useState(null);
  const [settlePin, setSettlePin] = useState("");
  const [settleLoading, setSettleLoading] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [grpRes, balRes] = await Promise.all([
        api.get("/split/groups"),
        api.get("/split/balances"),
      ]);
      setGroups(grpRes.data.groups);
      setBalances(balRes.data);
    } catch {
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroup = async (group) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/split/groups/${group._id}`);
      setSelectedGroup(data);
      setView("group");
    } catch {
      addToast("Failed to load group", "error");
    } finally {
      setLoading(false);
    }
  };

  const searchMembers = async (q) => {
    setMemberSearch(q);
    if (q.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    try {
      const { data } = await api.get(
        `/users/search?q=${encodeURIComponent(q)}`,
      );
      setMemberResults(
        data.users.filter((u) => !selectedMembers.find((m) => m._id === u._id)),
      );
    } catch {
      setMemberResults([]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      addToast("Enter a group name", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/split/groups", {
        name: groupName,
        description: groupDesc,
        memberIds: selectedMembers.map((m) => m._id),
      });
      addToast("Group created!", "success");
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
      setView("overview");
      fetchOverview();
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to create group",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!expenseTitle.trim() || !expenseAmount) {
      addToast("Enter title and amount", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/split/groups/${selectedGroup.group._id}/expenses`, {
        title: expenseTitle,
        totalAmount: parseFloat(expenseAmount),
        splitType,
      });
      addToast("Expense added!", "success");
      setExpenseTitle("");
      setExpenseAmount("");
      setSplitType("equal");
      setView("group");
      fetchGroup(selectedGroup.group);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to add expense", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!settlePin || settlePin.length < 4) {
      addToast("Enter your UPI PIN", "error");
      return;
    }
    setSettleLoading(true);
    try {
      await api.post(`/split/expenses/${settleExpense._id}/settle`, {
        pin: settlePin,
      });
      addToast("Settlement successful!", "success");
      setSettleExpense(null);
      setSettlePin("");
      fetchGroup(selectedGroup.group);
    } catch (err) {
      addToast(err.response?.data?.message || "Settlement failed", "error");
    } finally {
      setSettleLoading(false);
    }
  };

  const fmt = (n) =>
    "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  if (loading && !groups.length && !selectedGroup) {
    return (
      <div
        style={{ padding: "3rem", textAlign: "center", color: "var(--text2)" }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>
            Split Expenses
          </h1>
          <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
            Split bills with friends and settle up easily
          </p>
        </div>
        {view === "overview" && (
          <Button variant="primary" onClick={() => setView("new-group")}>
            + New Group
          </Button>
        )}
        {view !== "overview" && (
          <Button
            variant="outline"
            onClick={() => {
              setView("overview");
              setSelectedGroup(null);
              fetchOverview();
            }}
          >
            ← Back
          </Button>
        )}
      </div>

      {/* Overview */}
      {view === "overview" && (
        <>
          {balances && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                {
                  label: "You Owe",
                  val: balances.summary.youOwe,
                  color: "var(--red)",
                },
                {
                  label: "You're Owed",
                  val: balances.summary.youAreOwed,
                  color: "var(--green)",
                },
                {
                  label: "Net Balance",
                  val: balances.summary.net,
                  color:
                    balances.summary.net >= 0 ? "var(--green)" : "var(--red)",
                },
              ].map(({ label, val, color }) => (
                <Card key={label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text3)",
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      fontFamily: "Syne, sans-serif",
                      color,
                    }}
                  >
                    {fmt(Math.abs(val))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <SectionTitle>Your Groups</SectionTitle>
          {groups.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>👥</div>
              <div style={{ color: "var(--text2)", marginBottom: 16 }}>
                No groups yet. Create one to split expenses!
              </div>
              <Button variant="primary" onClick={() => setView("new-group")}>
                Create First Group
              </Button>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {groups.map((g) => (
                <Card
                  key={g._id}
                  style={{ cursor: "pointer" }}
                  onClick={() => fetchGroup(g)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background:
                            "linear-gradient(135deg,var(--accent),var(--accent2))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem",
                        }}
                      >
                        👥
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                          {g.name}
                        </div>
                        <div
                          style={{ fontSize: "0.78rem", color: "var(--text3)" }}
                        >
                          {g.members.length} members ·{" "}
                          {g.description || "No description"}
                        </div>
                      </div>
                    </div>
                    <span style={{ color: "var(--text3)", fontSize: "1.2rem" }}>
                      ›
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {balances?.details?.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: "1.5rem" }}>
                Pending Settlements
              </SectionTitle>
              {balances.details.map((d, i) => (
                <Card key={i} style={{ marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                        {d.expense}
                      </div>
                      <div
                        style={{ fontSize: "0.78rem", color: "var(--text3)" }}
                      >
                        {d.type === "you_owe"
                          ? `You owe ${d.to}`
                          : "Others owe you"}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color:
                          d.type === "you_owe" ? "var(--red)" : "var(--green)",
                        fontSize: "1rem",
                      }}
                    >
                      {d.type === "you_owe" ? "-" : "+"}
                      {fmt(d.amount)}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      {/* Group Detail */}
      {view === "group" && selectedGroup && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.3rem" }}>{selectedGroup.group.name}</h2>
            <Button variant="primary" onClick={() => setView("new-expense")}>
              + Add Expense
            </Button>
          </div>

          <Card style={{ marginBottom: "1rem" }}>
            <SectionTitle>Members</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selectedGroup.group.members.map((m) => (
                <div
                  key={m.userId._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--bg3)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--accent3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                    }}
                  >
                    {m.userId.name?.slice(0, 2).toUpperCase()}
                  </div>
                  {m.userId.name}
                </div>
              ))}
            </div>
          </Card>

          <SectionTitle>Expenses</SectionTitle>
          {selectedGroup.expenses.length === 0 ? (
            <Card
              style={{
                textAlign: "center",
                padding: "2rem 1rem",
                color: "var(--text2)",
              }}
            >
              No expenses yet.
            </Card>
          ) : (
            selectedGroup.expenses.map((exp) => {
              const myUserId = selectedGroup.group.members.find(
                (m) => selectedGroup.group.createdBy?._id === m.userId._id,
              )?.userId._id;
              const mySplit = exp.splits?.find((s) => s.userId && !s.isPaid);
              return (
                <Card key={exp._id} style={{ marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{exp.title}</div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text3)",
                          marginTop: 2,
                        }}
                      >
                        Paid by {exp.paidBy?.name} · {exp.splitType} split
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {exp.splits?.map((s, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: s.isPaid
                                ? "rgba(34,211,160,0.1)"
                                : "rgba(255,87,87,0.1)",
                              color: s.isPaid ? "var(--green)" : "var(--red)",
                            }}
                          >
                            {s.userId?.name || "?"}: {fmt(s.share)}{" "}
                            {s.isPaid ? "✓" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                        {fmt(exp.totalAmount)}
                      </div>
                      {exp.isSettled ? (
                        <Badge type="success">Settled</Badge>
                      ) : mySplit ? (
                        <Button
                          variant="primary"
                          size="sm"
                          style={{ marginTop: 8 }}
                          onClick={() => setSettleExpense(exp)}
                        >
                          Settle {fmt(mySplit.share)}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </>
      )}

      {/* New Group */}
      {view === "new-group" && (
        <Card>
          <SectionTitle>Create New Group</SectionTitle>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Group Name *
            </label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Goa Trip, Flat Expenses"
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--bg3)",
                color: "var(--text)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <input
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Optional description"
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--bg3)",
                color: "var(--text)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Add Members
            </label>
            <input
              value={memberSearch}
              onChange={(e) => searchMembers(e.target.value)}
              placeholder="Search by name or email"
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--bg3)",
                color: "var(--text)",
                fontSize: "0.9rem",
              }}
            />
            {memberResults.map((u) => (
              <div
                key={u._id}
                onClick={() => {
                  setSelectedMembers((prev) => [...prev, u]);
                  setMemberResults([]);
                  setMemberSearch("");
                }}
                style={{
                  padding: "0.6rem 1rem",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg4)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "var(--accent3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "var(--text3)" }}>
                    {u.email}
                  </div>
                </div>
              </div>
            ))}
            {selectedMembers.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {selectedMembers.map((m) => (
                  <div
                    key={m._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "var(--accent3)",
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: "0.82rem",
                    }}
                  >
                    {m.name}
                    <button
                      onClick={() =>
                        setSelectedMembers((prev) =>
                          prev.filter((x) => x._id !== m._id),
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text2)",
                        fontSize: "0.9rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onClick={createGroup}
            loading={loading}
            full
          >
            Create Group
          </Button>
        </Card>
      )}

      {/* New Expense */}
      {view === "new-expense" && selectedGroup && (
        <Card>
          <SectionTitle>Add Expense to {selectedGroup.group.name}</SectionTitle>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Title *
            </label>
            <input
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="e.g. Dinner at Barbeque Nation"
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--bg3)",
                color: "var(--text)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Total Amount (₹) *
            </label>
            <input
              type="number"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="e.g. 900"
              min={1}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--bg3)",
                color: "var(--text)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Split Type
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["equal", "custom"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    if (t === "custom") {
                      addToast(
                        "Custom split is not supported yet. Use equal split for now.",
                        "info",
                      );
                      return;
                    }
                    setSplitType(t);
                  }}
                  disabled={t === "custom"}
                  style={{
                    flex: 1,
                    padding: "0.6rem",
                    borderRadius: 8,
                    border: `1px solid ${splitType === t ? "var(--accent)" : "var(--border2)"}`,
                    background:
                      splitType === t ? "rgba(108,99,255,0.1)" : "transparent",
                    color: splitType === t ? "var(--accent)" : "var(--text2)",
                    cursor: t === "custom" ? "not-allowed" : "pointer",
                    fontWeight: splitType === t ? 600 : 400,
                    fontSize: "0.88rem",
                    opacity: t === "custom" ? 0.6 : 1,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)} Split
                </button>
              ))}
            </div>
          </div>
          {splitType === "custom" && (
            <div
              style={{
                background: "rgba(255, 193, 7, 0.1)",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "var(--text2)",
              }}
            >
              Custom split is not available yet. Please use equal split for now.
            </div>
          )}
          {expenseAmount && splitType === "equal" && (
            <div
              style={{
                background: "var(--bg3)",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "var(--text2)",
              }}
            >
              Each of {selectedGroup.group.members.length} members pays:{" "}
              <strong style={{ color: "var(--text)" }}>
                ₹
                {(
                  parseFloat(expenseAmount) / selectedGroup.group.members.length
                ).toFixed(2)}
              </strong>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={() => setView("group")} full>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={addExpense}
              loading={loading}
              full
            >
              Add Expense
            </Button>
          </div>
        </Card>
      )}

      {/* Settle PIN Modal */}
      {settleExpense && (
        <div
          className="pin-modal-backdrop"
          onClick={() => {
            setSettleExpense(null);
            setSettlePin("");
          }}
        >
          <div className="pin-modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 6 }}
            >
              Settle Expense
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                marginBottom: 16,
              }}
            >
              {settleExpense.title}
            </div>
            <div
              style={{
                background: "var(--bg3)",
                borderRadius: 10,
                padding: "1rem",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                Your share
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  fontFamily: "Syne, sans-serif",
                  color: "var(--accent)",
                }}
              >
                {fmt(settleExpense.splits?.find((s) => !s.isPaid)?.share || 0)}
              </div>
            </div>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Enter UPI PIN to confirm
            </label>
            <input
              type="password"
              value={settlePin}
              onChange={(e) =>
                setSettlePin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="4-6 digit PIN"
              maxLength={6}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--bg3)",
                color: "var(--text)",
                fontSize: "1.1rem",
                textAlign: "center",
                letterSpacing: 8,
                marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="outline"
                full
                onClick={() => {
                  setSettleExpense(null);
                  setSettlePin("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                full
                loading={settleLoading}
                onClick={handleSettle}
              >
                Confirm Settlement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

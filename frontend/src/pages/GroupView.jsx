import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { ArrowLeft, Plus, DollarSign, Send, MessageSquare, X } from 'lucide-react';

export default function GroupView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState({});
  const [historyLogs, setHistoryLogs] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('expenses'); // expenses, balances, history
  
  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState('EQUAL'); // EQUAL, PERCENTAGE, MANUAL
  const [manualShares, setManualShares] = useState({});
  
  // Settle Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');

  // Chat State
  const [activeExpenseChat, setActiveExpenseChat] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchGroupData();
    fetchBalances();
    fetchHistory();
    
    const newSocket = io('');
    setSocket(newSocket);
    
    newSocket.on('receive_message', (data) => {
      setChatMessages(prev => ({
        ...prev,
        [data.expenseId]: [...(prev[data.expenseId] || []), data]
      }));
    });

    return () => newSocket.close();
  }, [id]);

  const fetchGroupData = async () => {
    const res = await axios.get(`/api/groups/${id}`);
    setGroup(res.data);
  };

  const fetchBalances = async () => {
    const res = await axios.get(`/api/groups/${id}/balances`);
    setBalances(res.data);
  };

  const fetchHistory = async () => {
    const res = await axios.get(`/api/groups/${id}/history`);
    setHistoryLogs(res.data);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    let shares = [];
    const totalAmount = parseFloat(amount);
    
    if (splitType === 'EQUAL') {
      const splitAmount = totalAmount / group.members.length;
      shares = group.members.map(m => ({ user_id: m.id, amount_owed: splitAmount }));
    } else if (splitType === 'PERCENTAGE' || splitType === 'MANUAL') {
      // In manual, they enter the exact amount. In percentage, they enter percentage.
      let sum = 0;
      shares = group.members.map(m => {
        let amt = parseFloat(manualShares[m.id] || 0);
        if (splitType === 'PERCENTAGE') amt = (amt / 100) * totalAmount;
        sum += amt;
        return { user_id: m.id, amount_owed: amt };
      });
    }

    await axios.post('/api/expenses', {
      group_id: id,
      amount: totalAmount,
      currency,
      description,
      notes,
      expense_date: expenseDate,
      split_type: splitType,
      shares
    });

    setShowExpenseModal(false);
    setAmount(''); setDescription(''); setManualShares({}); setNotes(''); setCurrency('INR'); setExpenseDate(new Date().toISOString().split('T')[0]);
    fetchGroupData();
    fetchBalances();
    fetchHistory();
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    await axios.post('/api/settlements', {
      group_id: id,
      to_user: settleTo,
      amount: parseFloat(settleAmount)
    });
    setShowSettleModal(false);
    setSettleTo(''); setSettleAmount('');
    fetchBalances();
    fetchHistory();
  };

  const openChat = (expenseId) => {
    setActiveExpenseChat(expenseId);
    socket.emit('join_expense', expenseId);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msgData = {
      expenseId: activeExpenseChat,
      user: user.name,
      text: newMessage,
      timestamp: new Date()
    };
    socket.emit('send_message', msgData);
    setNewMessage('');
  };

  if (!group) return <div className="container">Loading...</div>;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <Link to="/dashboard" className="btn btn-outline" style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>{group.name}</h1>
          <p className="text-muted">{group.members.length} members</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-success" onClick={() => setShowSettleModal(true)}>
            <DollarSign size={18} /> Settle Debt
          </button>
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </header>

      <div className="flex gap-4" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)' }}>
        <button 
          className={`btn ${activeTab === 'expenses' ? '' : 'text-muted'}`} 
          style={{ background: 'transparent', borderBottom: activeTab === 'expenses' ? '2px solid var(--primary-color)' : 'none', borderRadius: 0 }}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
        <button 
          className={`btn ${activeTab === 'balances' ? '' : 'text-muted'}`} 
          style={{ background: 'transparent', borderBottom: activeTab === 'balances' ? '2px solid var(--primary-color)' : 'none', borderRadius: 0 }}
          onClick={() => setActiveTab('balances')}
        >
          Balances
        </button>
        <button 
          className={`btn ${activeTab === 'history' ? '' : 'text-muted'}`} 
          style={{ background: 'transparent', borderBottom: activeTab === 'history' ? '2px solid var(--primary-color)' : 'none', borderRadius: 0 }}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'expenses' && (
        <div className="flex gap-6">
          <div style={{ flex: 2 }}>
            {group.expenses.length === 0 ? (
              <div className="glass-card flex justify-center text-muted" style={{ padding: '3rem' }}>No expenses yet.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {group.expenses.map(exp => (
                  <div key={exp.id} className="glass-card flex justify-between items-center">
                    <div>
                      <h3 style={{ margin: 0 }}>{exp.description}</h3>
                      <p className="text-muted" style={{ fontSize: '0.875rem' }}>Paid by {exp.paid_by_name} on {new Date(exp.expense_date || exp.created_at).toLocaleDateString()}</p>
                      {exp.notes && <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem', fontStyle: 'italic' }}>"{exp.notes}"</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                          {exp.currency === 'USD' ? '$' : exp.currency === 'EUR' ? '€' : exp.currency === 'GBP' ? '£' : '₹'}
                          {parseFloat(exp.amount).toFixed(2)}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{exp.split_type}</div>
                      </div>
                      <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => openChat(exp.id)}>
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Chat Sidebar */}
          {activeExpenseChat && (
            <div className="glass-panel flex flex-col" style={{ flex: 1, height: '600px', position: 'relative' }}>
              <div className="flex justify-between items-center" style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
                <h3 style={{ margin: 0 }}>Expense Chat</h3>
                <button className="btn btn-outline" style={{ padding: '0.25rem', border: 'none' }} onClick={() => setActiveExpenseChat(null)}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(chatMessages[activeExpenseChat] || []).map((msg, i) => (
                  <div key={i} style={{ background: msg.user === user.name ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', alignSelf: msg.user === user.name ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{msg.user}</div>
                    <div>{msg.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  placeholder="Type a message..." 
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}><Send size={18} /></button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {group.members.map(m => {
            const bal = balances[m.id] || 0;
            return (
              <div key={m.id} className="glass-card flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{m.name}</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>{m.email}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={bal > 0 ? 'text-success' : bal < 0 ? 'text-danger' : 'text-muted'} style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {bal > 0 ? '+' : ''}{bal.toFixed(2)}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {bal > 0 ? 'Gets back' : bal < 0 ? 'Owes' : 'Settled'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex flex-col gap-4">
          {historyLogs.length === 0 ? (
            <div className="glass-card flex justify-center text-muted" style={{ padding: '3rem' }}>No activity logged yet.</div>
          ) : (
            historyLogs.map(log => (
              <div key={log.id} className="glass-card flex gap-4 items-center" style={{ padding: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {log.user_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1rem' }}>
                    <span style={{ fontWeight: 600 }}>{log.user_name}</span> {log.details}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ padding: 0, maxWidth: '600px' }}>
            
            {/* Header */}
            <div className="flex justify-between items-center" style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Add expense</h2>
              <button className="btn btn-outline" style={{ padding: '0.5rem', border: 'none' }} onClick={() => setShowExpenseModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} style={{ padding: '2rem' }}>
              
              <div style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
                <span className="text-muted">With you and: </span>
                <span style={{ fontWeight: 500 }}>{group.members.filter(m => m.id !== user.id).map(m => m.name).join(', ')}</span>
              </div>

              {/* Description Input */}
              <div className="flex items-center gap-4" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>
                </div>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ fontSize: '1.25rem', borderBottom: '2px solid var(--surface-border)', borderRadius: 0, padding: '0.5rem 0', background: 'transparent' }}
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Enter a description" 
                  required 
                />
              </div>

              {/* Amount Input */}
              <div className="flex items-center gap-4" style={{ marginBottom: '2rem' }}>
                <select 
                  className="form-control" 
                  style={{ width: 'auto', padding: '1rem', fontSize: '1.25rem', background: 'var(--surface-color)' }}
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)}
                >
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                </select>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  style={{ fontSize: '2rem', borderBottom: '2px solid var(--surface-border)', borderRadius: 0, padding: '0.5rem 0', background: 'transparent' }}
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="0.00" 
                  required 
                />
              </div>

              {/* Split Logic Text */}
              <div style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.1rem' }}>
                Paid by <span className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', display: 'inline-block' }}>you</span> and split <select className="form-control" style={{ width: 'auto', padding: '0.5rem', display: 'inline-block', appearance: 'auto', background: 'var(--surface-color)', marginLeft: '0.5rem' }} value={splitType} onChange={e => setSplitType(e.target.value)}>
                  <option value="EQUAL">equally</option>
                  <option value="PERCENTAGE">by percentage</option>
                  <option value="MANUAL">unequally</option>
                </select>
              </div>

              {splitType !== 'EQUAL' && (
                <div className="form-group glass-card" style={{ padding: '1rem', marginBottom: '2rem' }}>
                  <label className="form-label">Enter {splitType === 'PERCENTAGE' ? 'Percentages (%)' : 'Amounts'} per member</label>
                  {group.members.map(m => (
                    <div key={m.id} className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                      <span>{m.name}</span>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control" 
                        style={{ width: '100px', padding: '0.25rem 0.5rem' }}
                        value={manualShares[m.id] || ''}
                        onChange={e => setManualShares(prev => ({ ...prev, [m.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Extra Details */}
              <div className="flex gap-4 items-center" style={{ marginBottom: '2rem' }}>
                <div className="flex gap-2 items-center text-muted">
                  <input type="date" className="form-control" style={{ width: 'auto', padding: '0.5rem', fontSize: '0.875rem' }} value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                </div>
                <div className="flex gap-2 items-center text-muted flex-1">
                  <input type="text" className="form-control" style={{ padding: '0.5rem', fontSize: '0.875rem' }} placeholder="Add notes" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {showSettleModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: '2rem' }}>
            <h2>Record Payment</h2>
            <form onSubmit={handleSettle}>
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">I am paying to:</label>
                <select className="form-control" value={settleTo} onChange={e => setSettleTo(e.target.value)} required>
                  <option value="">Select a member...</option>
                  {group.members.filter(m => m.id !== user.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input type="number" step="0.01" className="form-control" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} required />
              </div>
              <div className="flex gap-4" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSettleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

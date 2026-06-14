const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware to authenticate
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// --- AUTH ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, contactNumber, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO Users (name, email, contact_number, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, contactNumber || null, hash]
    );
    res.status(201).json({ id: result.rows.insertId, name, email, contactNumber });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/search', authenticate, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);
    
    // Search by prefix on ID or contact_number
    const searchTerm = `${query}%`;
    const result = await db.query(
      'SELECT id, name, email, contact_number FROM Users WHERE CAST(id AS CHAR) LIKE ? OR contact_number LIKE ? LIMIT 10',
      [searchTerm, searchTerm]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- USERS ENDPOINTS ---
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, contact_number FROM Users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, contact_number FROM Users WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GROUPS ENDPOINTS ---
app.get('/api/groups', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT g.* FROM Groups_Table g 
       JOIN Group_Members gm ON g.id = gm.group_id 
       WHERE gm.user_id = ?`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', authenticate, async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const { name, members } = req.body;
    const [groupResult] = await connection.execute(
      'INSERT INTO Groups_Table (name, created_by) VALUES (?, ?)',
      [name, req.user.id]
    );
    const groupId = groupResult.insertId;

    const allMembers = Array.from(new Set([...members, req.user.id]));
    for (const userId of allMembers) {
      await connection.execute(
        'INSERT INTO Group_Members (group_id, user_id) VALUES (?, ?)',
        [groupId, userId]
      );
    }
    await connection.commit();
    res.status(201).json({ id: groupId, name, created_by: req.user.id });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/groups/:id', authenticate, async (req, res) => {
  try {
    const groupResult = await db.query('SELECT * FROM Groups_Table WHERE id = ?', [req.params.id]);
    const membersResult = await db.query(
      'SELECT u.id, u.name, u.email FROM Users u JOIN Group_Members gm ON u.id = gm.user_id WHERE gm.group_id = ?',
      [req.params.id]
    );
    const expensesResult = await db.query(
      'SELECT e.*, u.name as paid_by_name FROM Expenses e JOIN Users u ON e.paid_by = u.id WHERE e.group_id = ? ORDER BY e.created_at DESC',
      [req.params.id]
    );
    res.json({
      ...groupResult.rows[0],
      members: membersResult.rows,
      expenses: expensesResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:id', authenticate, async (req, res) => {
  try {
    // Only allow deletion if the user is the creator (or just a member for simplicity).
    // The foreign keys have ON DELETE CASCADE so it will clean up expenses, members, settlements.
    const result = await db.query('DELETE FROM Groups_Table WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPENSES ENDPOINTS ---
app.post('/api/expenses', authenticate, async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const { group_id, amount, currency, description, notes, split_type, expense_date, shares } = req.body;
    
    const [expenseResult] = await connection.execute(
      'INSERT INTO Expenses (group_id, paid_by, amount, currency, description, notes, split_type, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [group_id, req.user.id, amount, currency || 'INR', description, notes || null, split_type, expense_date || null]
    );
    const expenseId = expenseResult.insertId;

    for (const share of shares) {
      await connection.execute(
        'INSERT INTO Expense_Shares (expense_id, user_id, amount_owed) VALUES (?, ?, ?)',
        [expenseId, share.user_id, share.amount_owed]
      );
    }
    
    // Log Activity
    const currencyStr = currency || 'INR';
    const logDetails = `Added expense '${description}' for ${currencyStr} ${parseFloat(amount).toFixed(2)}`;
    await connection.execute(
      'INSERT INTO Activity_Logs (group_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [group_id, req.user.id, 'ADD_EXPENSE', logDetails]
    );

    await connection.commit();
    res.status(201).json({ id: expenseId, group_id, paid_by: req.user.id, amount, currency: currency || 'INR', description, notes, split_type, expense_date });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// --- SETTLEMENTS ENDPOINTS ---
app.post('/api/settlements', authenticate, async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const { group_id, to_user, amount } = req.body;
    const [result] = await connection.execute(
      'INSERT INTO Settlements (from_user, to_user, amount, group_id) VALUES (?, ?, ?, ?)',
      [req.user.id, to_user, amount, group_id]
    );
    
    // Fetch to_user name for logging
    const [userRes] = await connection.execute('SELECT name FROM Users WHERE id = ?', [to_user]);
    const toUserName = userRes[0].name;
    const logDetails = `Recorded a settlement payment of ${parseFloat(amount).toFixed(2)} to ${toUserName}`;
    await connection.execute(
      'INSERT INTO Activity_Logs (group_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [group_id, req.user.id, 'SETTLE_DEBT', logDetails]
    );

    await connection.commit();
    res.status(201).json({ id: result.insertId, from_user: req.user.id, to_user, amount, group_id });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// --- BALANCES ENDPOINTS ---
app.get('/api/groups/:id/balances', authenticate, async (req, res) => {
  try {
    const groupId = req.params.id;
    const expensesResult = await db.query(
      'SELECT e.id, e.paid_by, e.amount FROM Expenses e WHERE e.group_id = ?',
      [groupId]
    );
    const sharesResult = await db.query(
      'SELECT es.expense_id, es.user_id, es.amount_owed FROM Expense_Shares es JOIN Expenses e ON es.expense_id = e.id WHERE e.group_id = ?',
      [groupId]
    );
    const settlementsResult = await db.query(
      'SELECT from_user, to_user, amount FROM Settlements WHERE group_id = ?',
      [groupId]
    );

    const balances = {}; 
    const ensureUser = (id) => { if (!balances[id]) balances[id] = 0; };

    expensesResult.rows.forEach(exp => {
      ensureUser(exp.paid_by);
      balances[exp.paid_by] += parseFloat(exp.amount);
    });

    sharesResult.rows.forEach(share => {
      ensureUser(share.user_id);
      balances[share.user_id] -= parseFloat(share.amount_owed);
    });

    settlementsResult.rows.forEach(settlement => {
      ensureUser(settlement.from_user);
      ensureUser(settlement.to_user);
      balances[settlement.from_user] += parseFloat(settlement.amount);
      balances[settlement.to_user] -= parseFloat(settlement.amount);
    });

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HISTORY ENDPOINT ---
app.get('/api/groups/:id/history', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name as user_name 
       FROM Activity_Logs a 
       JOIN Users u ON a.user_id = u.id 
       WHERE a.group_id = ? 
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WEBSOCKETS FOR CHAT ---
io.on('connection', (socket) => {
  socket.on('join_expense', (expenseId) => {
    socket.join(`expense_${expenseId}`);
  });

  socket.on('send_message', (data) => {
    io.to(`expense_${data.expenseId}`).emit('receive_message', data);
  });
});

const path = require('path');

// Serve static React files in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) return res.status(404).json({error: "API Route Not Found"});
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

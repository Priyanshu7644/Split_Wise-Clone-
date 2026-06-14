const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const connection = process.env.DATABASE_URL 
    ? await mysql.createConnection({ uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } })
    : await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'splitwise_clone',
      });
  try {
    console.log('Clearing existing data...');
    // Disable foreign key checks temporarily to clear tables easily
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE Expense_Shares');
    await connection.query('TRUNCATE TABLE Expenses');
    await connection.query('TRUNCATE TABLE Settlements');
    await connection.query('TRUNCATE TABLE Group_Members');
    await connection.query('TRUNCATE TABLE Groups_Table');
    await connection.query('TRUNCATE TABLE Users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Creating users...');
    const users = [
      { name: 'Aisha', email: 'aisha@example.com', pass: '123456' },
      { name: 'Rohan', email: 'rohan@example.com', pass: '123456' },
      { name: 'Priya', email: 'priya@example.com', pass: '123456' },
      { name: 'Meera', email: 'meera@example.com', pass: '123456' },
      { name: 'Dev', email: 'dev@example.com', pass: '123456' },
      { name: 'Kabir', email: 'kabir@example.com', pass: '123456' }
    ];

    const userIdMap = {};
    for (const u of users) {
      const hash = await bcrypt.hash(u.pass, 10);
      const [res] = await connection.execute(
        'INSERT INTO Users (name, email, password_hash) VALUES (?, ?, ?)',
        [u.name, u.email, hash]
      );
      userIdMap[u.name] = res.insertId;
    }

    console.log('Creating groups...');
    // Group 1: Home (Aisha, Rohan, Priya, Meera)
    const [g1Res] = await connection.execute('INSERT INTO Groups_Table (name, created_by) VALUES (?, ?)', ['Apartment Home', userIdMap['Aisha']]);
    const groupHomeId = g1Res.insertId;
    for (const name of ['Aisha', 'Rohan', 'Priya', 'Meera']) {
      await connection.execute('INSERT INTO Group_Members (group_id, user_id) VALUES (?, ?)', [groupHomeId, userIdMap[name]]);
    }

    // Group 2: Goa Trip (Aisha, Rohan, Priya, Dev, Kabir)
    const [g2Res] = await connection.execute('INSERT INTO Groups_Table (name, created_by) VALUES (?, ?)', ['Goa Trip', userIdMap['Dev']]);
    const groupGoaId = g2Res.insertId;
    for (const name of ['Aisha', 'Rohan', 'Priya', 'Dev', 'Kabir']) {
      await connection.execute('INSERT INTO Group_Members (group_id, user_id) VALUES (?, ?)', [groupGoaId, userIdMap[name]]);
    }

    // Expenses Data
    console.log('Inserting expenses...');
    const expenses = [
      { date: '2026-02-01', desc: 'February rent', paid_by: 'Aisha', amount: 48000, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-02-03', desc: 'Groceries BigBasket', paid_by: 'Priya', amount: 2340, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-02-05', desc: 'Wifi bill Feb', paid_by: 'Rohan', amount: 1199, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-02-08', desc: 'Dinner at Marina Bites', paid_by: 'Dev', amount: 3200, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: 'Dev visiting for the weekend' },
      { date: '2026-02-08', desc: 'dinner - marina bites', paid_by: 'Dev', amount: 3200, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: '' },
      { date: '2026-02-10', desc: 'Electricity Feb', paid_by: 'Aisha', amount: 1200, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-02-12', desc: 'Maid salary Feb', paid_by: 'Meera', amount: 3000, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-02-14', desc: 'Movie night snacks', paid_by: 'Priya', amount: 640, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya'], notes: 'Meera skipped' },
      { date: '2026-02-15', desc: 'Cylinder refill', paid_by: 'Rohan', amount: 900, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-02-18', desc: 'Groceries DMart', paid_by: 'Priya', amount: 1875, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-02-20', desc: 'Aisha birthday cake', paid_by: 'Rohan', amount: 1500, curr: 'INR', type: 'MANUAL', members: ['Rohan','Priya','Meera'], shares: {'Rohan': 700, 'Priya': 400, 'Meera': 400}, notes: 'Aisha not charged obviously' },
      { date: '2026-02-22', desc: 'House cleaning supplies', paid_by: 'Meera', amount: 780, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: "can't remember who paid?" },
      // Settlement 1
      { isSettlement: true, date: '2026-02-25', from: 'Rohan', to: 'Aisha', amount: 5000 },
      { date: '2026-02-28', desc: 'Pizza Friday', paid_by: 'Aisha', amount: 1440, curr: 'INR', type: 'PERCENTAGE', members: ['Aisha','Rohan','Priya','Meera'], shares: {'Aisha': 432, 'Rohan': 432, 'Priya': 288, 'Meera': 288}, notes: 'percentages might be off' },
      { date: '2026-03-01', desc: 'March rent', paid_by: 'Aisha', amount: 48000, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-03-03', desc: 'Groceries BigBasket', paid_by: 'Meera', amount: 2810, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-03-05', desc: 'Wifi bill Mar', paid_by: 'Rohan', amount: 1199, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Meera'], notes: '' },
      { date: '2026-03-08', desc: 'Goa flights', paid_by: 'Aisha', amount: 32400, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: 'trip starts!' },
      { date: '2026-03-09', desc: 'Goa villa booking', paid_by: 'Dev', amount: 540, curr: 'USD', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: 'booked on intl site' },
      { date: '2026-03-10', desc: 'Beach shack lunch', paid_by: 'Rohan', amount: 84, curr: 'USD', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: '' },
      { date: '2026-03-10', desc: 'Scooter rentals', paid_by: 'Priya', amount: 3600, curr: 'INR', type: 'MANUAL', members: ['Aisha','Rohan','Priya','Dev'], shares: {'Aisha': 600, 'Rohan': 1200, 'Priya': 600, 'Dev': 1200}, notes: 'Rohan and Dev took the bigger ones' },
      { date: '2026-03-11', desc: 'Parasailing', paid_by: 'Dev', amount: 150, curr: 'USD', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev','Kabir'], notes: 'Kabir joined for the day' },
      { date: '2026-03-11', desc: 'Dinner at Thalassa', paid_by: 'Aisha', amount: 2400, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: '' },
      { date: '2026-03-11', desc: 'Thalassa dinner', paid_by: 'Rohan', amount: 2450, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: 'Aisha also logged this? I think hers is wrong' },
      { date: '2026-03-12', desc: 'Parasailing refund', paid_by: 'Dev', amount: -30, curr: 'USD', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: 'one slot got cancelled fixing later' },
      { date: '2026-03-14', desc: 'Airport cab', paid_by: 'Rohan', amount: 1100, curr: 'INR', type: 'EQUAL', members: ['Aisha','Rohan','Priya','Dev'], notes: '' },
    ];

    for (const exp of expenses) {
      if (exp.isSettlement) {
        // Find group. Assume it's Home since it involves Rohan and Aisha.
        await connection.execute(
          'INSERT INTO Settlements (from_user, to_user, amount, group_id, created_at) VALUES (?, ?, ?, ?, ?)',
          [userIdMap[exp.from], userIdMap[exp.to], exp.amount, groupHomeId, exp.date + ' 12:00:00']
        );
        continue;
      }

      const groupId = exp.members.includes('Dev') ? groupGoaId : groupHomeId;
      
      const [eRes] = await connection.execute(
        'INSERT INTO Expenses (group_id, paid_by, amount, currency, description, notes, split_type, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [groupId, userIdMap[exp.paid_by], exp.amount, exp.curr, exp.desc, exp.notes, exp.type, exp.date]
      );
      const expenseId = eRes.insertId;

      if (exp.type === 'EQUAL') {
        const splitAmt = exp.amount / exp.members.length;
        for (const m of exp.members) {
          await connection.execute(
            'INSERT INTO Expense_Shares (expense_id, user_id, amount_owed) VALUES (?, ?, ?)',
            [expenseId, userIdMap[m], splitAmt]
          );
        }
      } else {
        // MANUAL or PERCENTAGE (using provided calculated shares)
        for (const m of exp.members) {
          const amtOwed = exp.shares[m] || 0;
          await connection.execute(
            'INSERT INTO Expense_Shares (expense_id, user_id, amount_owed) VALUES (?, ?, ?)',
            [expenseId, userIdMap[m], amtOwed]
          );
        }
      }
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();

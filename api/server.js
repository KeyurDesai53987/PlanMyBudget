const express = require('express')
const cors = require('cors')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { Pool } = require('pg')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static web UI
app.use(express.static(path.resolve(__dirname, '../saveit-web/dist')))

// PostgreSQL Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Helper functions for queries
const db = {
  async get(sql, params = []) {
    const result = await pool.query(sql, params)
    return result.rows[0]
  },
  async all(sql, params = []) {
    const result = await pool.query(sql, params)
    return result.rows
  },
  async run(sql, params = []) {
    return pool.query(sql, params)
  }
}

// Initialize database schema
async function initDb() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordhash TEXT NOT NULL,
      name TEXT,
      preferredcurrency TEXT DEFAULT 'USD',
      locale TEXT DEFAULT 'en-US',
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      userid TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT DEFAULT 'USD',
      balance REAL DEFAULT 0,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userid) REFERENCES users(id)
    )
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      parentId TEXT,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      accountid TEXT NOT NULL,
      categoryId TEXT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (accountid) REFERENCES accounts(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    )
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      lines TEXT DEFAULT '[]',
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      targetamount REAL NOT NULL,
      currentamount REAL DEFAULT 0,
      duedate TEXT,
      status TEXT DEFAULT 'active',
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS recurring (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      accountid TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      startdate TEXT NOT NULL,
      nextdate TEXT NOT NULL,
      description TEXT,
      active INTEGER DEFAULT 1,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (accountid) REFERENCES accounts(id)
    )
  `)

  // Seed demo user if not exists
  const demoUser = await db.get('SELECT * FROM users WHERE email = $1', ['demo@saveit.app'])
  if (!demoUser) {
    const bcrypt = require('bcryptjs')
    const hash = bcrypt.hashSync('password', 10)
await db.run(`
      INSERT INTO users (id, email, passwordhash, name, preferredcurrency, locale)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['u-demo', 'demo@saveit.app', hash, 'Demo User', 'USD', 'en-US'])

    // Seed demo account
    await db.run(`
      INSERT INTO accounts (id, userid, name, type, currency, balance)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['acc-demo-1', 'u-demo', 'Checking', 'checking', 'USD', 1200])

    // Seed demo categories
    await db.run(`INSERT INTO categories (id, userid, name) VALUES ($1, $2, $3)`, ['cat-food', 'u-demo', 'Groceries'])
    await db.run(`INSERT INTO categories (id, userid, name) VALUES ($1, $2, $3)`, ['cat-ent', 'u-demo', 'Entertainment'])
    await db.run(`INSERT INTO categories (id, userid, name) VALUES ($1, $2, $3)`, ['cat-rent', 'u-demo', 'Rent'])

    // Seed demo budget
    await db.run(`
INSERT INTO budgets (id, userid, month, year, currency, lines)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['bud-1', 'u-demo', 2, 2026, 'USD', JSON.stringify([
      { categoryId: 'cat-food', amount: 400 },
      { categoryId: 'cat-ent', amount: 150 },
      { categoryId: 'cat-rent', amount: 1200 }
    ])])

    // Seed demo goal
    await db.run(`
      INSERT INTO goals (id, userid, name, targetamount, currentamount, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['gl-1', 'u-demo', 'Emergency Fund', 5000, 1200, 'active'])

    console.log('Demo user seeded: demo@saveit.app / password')
  }
}

// Password hashing
const bcrypt = require('bcryptjs')

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10)
}

function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash)
}

// Auth middleware
async function auth(req, res, next) {
  const header = req.headers['authorization'] || ''
  if (!header) return res.status(401).json({ error: 'Unauthorized' })
  const token = header.replace('Bearer ', '').trim()
  const session = await db.get('SELECT * FROM sessions WHERE token = $1', [token])
  if (!session) return res.status(401).json({ error: 'Invalid token' })
  req.userid = session.userid
  next()
}

/** API Routes **/

// Status
app.get('/api/status', (req, res) => res.json({ status: 'ok' }))

// Register
app.post('/api/users/register', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  
  const exists = await db.get('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase()])
  if (exists) return res.status(400).json({ error: 'User already exists' })
  
  const user = {
    id: uuidv4(),
    email,
    passwordhash: hashPassword(password),
    preferredCurrency: 'USD',
    locale: 'en-US',
    createdat: new Date().toISOString()
  }
  
  await db.run(`
    INSERT INTO users (id, email, passwordhash, preferredcurrency, locale, createdat)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [user.id, user.email, user.passwordhash, user.preferredcurrency, user.locale, user.createdat])
  
  res.json({ userId: user.id, email: user.email })
})

// Login
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  
  const user = await db.get('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase()])
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  if (!verifyPassword(password, user.passwordhash)) return res.status(401).json({ error: 'Invalid credentials' })
  
  const token = 'token-' + uuidv4()
  await db.run('INSERT INTO sessions (token, userId) VALUES ($1, $2)', [token, user.id])
  
  res.json({ token, userId: user.id })
})

// Accounts
app.get('/api/accounts', auth, async (req, res) => {
  const accounts = await db.all('SELECT * FROM accounts WHERE userid = $1', [req.userid])
  res.json({ accounts })
})

app.post('/api/accounts', auth, async (req, res) => {
  const { name, type, currency } = req.body || {}
  if (!name || !type) return res.status(400).json({ error: 'name and type required' })
  
  const acc = {
    id: uuidv4(),
    userid: req.userid,
    name,
    type,
    currency: currency || 'USD',
    balance: 0,
    createdat: new Date().toISOString()
  }
  
  await db.run(`
    INSERT INTO accounts (id, userid, name, type, currency, balance, createdat)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [acc.id, acc.userid, acc.name, acc.type, acc.currency, acc.balance, acc.createdat])
  
  res.json({ account: acc })
})

app.put('/api/accounts/:id', auth, async (req, res) => {
  const { id } = req.params
  const acc = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!acc) return res.status(404).json({ error: 'Account not found' })
  
  const { name, type, currency, balance } = req.body || {}
  if (name) await db.run('UPDATE accounts SET name = $1 WHERE id = $2', [name, id])
  if (type) await db.run('UPDATE accounts SET type = $1 WHERE id = $2', [type, id])
  if (currency) await db.run('UPDATE accounts SET currency = $1 WHERE id = $2', [currency, id])
  if (typeof balance === 'number') await db.run('UPDATE accounts SET balance = $1 WHERE id = $2', [balance, id])
  
  const updated = await db.get('SELECT * FROM accounts WHERE id = $1', [id])
  res.json({ account: updated })
})

app.delete('/api/accounts/:id', auth, async (req, res) => {
  const { id } = req.params
  const acc = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!acc) return res.status(404).json({ error: 'Account not found' })
  
  await db.run('DELETE FROM transactions WHERE accountid = $1', [id])
  await db.run('DELETE FROM accounts WHERE id = $1', [id])
  
  res.json({ success: true })
})

// Exchange rates
app.get('/api/exchange-rates', (req, res) => {
  const rates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    CAD: 1.36,
    AUD: 1.53,
    INR: 83.12,
    CNY: 7.24,
    CHF: 0.88,
    SGD: 1.34,
  }
  res.json({ rates })
})

// User preferences
app.get('/api/preferences', auth, async (req, res) => {
  const user = await db.get('SELECT preferredCurrency, locale FROM users WHERE id = $1', [req.userid])
  res.json({ 
    preferences: {
      preferredCurrency: user?.preferredCurrency || 'USD',
      locale: user?.locale || 'US'
    }
  })
})

app.put('/api/preferences', auth, async (req, res) => {
  const { preferredCurrency, locale } = req.body || {}
  if (preferredCurrency) {
    await db.run('UPDATE users SET preferredCurrency = $1 WHERE id = $2', [preferredCurrency, req.userid])
  }
  if (locale) {
    await db.run('UPDATE users SET locale = $1 WHERE id = $2', [locale, req.userid])
  }
  const user = await db.get('SELECT preferredCurrency, locale FROM users WHERE id = $1', [req.userid])
  res.json({ 
    preferences: {
      preferredCurrency: user?.preferredCurrency || 'USD',
      locale: user?.locale || 'US'
    }
  })
})

// Profile
app.get('/api/profile', auth, async (req, res) => {
  const user = await db.get('SELECT id, email, name, preferredCurrency, locale, createdat FROM users WHERE id = $1', [req.userid])
  res.json({ preferences: user })
})

app.put('/api/profile', auth, async (req, res) => {
  const { name } = req.body || {}
  if (name) {
    await db.run('UPDATE users SET name = $1 WHERE id = $2', [name, req.userid])
  }
  const user = await db.get('SELECT id, email, name, preferredCurrency, locale, createdat FROM users WHERE id = $1', [req.userid])
  res.json({ preferences: user })
})

app.put('/api/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' })
  }
  
  const user = await db.get('SELECT passwordhash FROM users WHERE id = $1', [req.userid])
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const isValid = bcrypt.compareSync(currentPassword, user.passwordhash)
  
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect' })
  }
  
  const newHash = bcrypt.hashSync(newPassword, 10)
  await db.run('UPDATE users SET passwordhash = $1 WHERE id = $2', [newHash, req.userid])
  res.json({ success: true })
})

// Categories
app.get('/api/categories', auth, async (req, res) => {
  const categories = await db.all('SELECT * FROM categories WHERE userid = $1', [req.userid])
  res.json({ categories })
})

app.post('/api/categories', auth, async (req, res) => {
  const { name, parentId } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name required' })
  
  const cat = {
    id: uuidv4(),
    userid: req.userid,
    name,
    parentid: parentId || null
  }
  
  await db.run('INSERT INTO categories (id, userid, name, parentid) VALUES ($1, $2, $3, $4)', [cat.id, cat.userid, cat.name, cat.parentid])
  res.json({ category: cat })
})

app.put('/api/categories/:id', auth, async (req, res) => {
  const { id } = req.params
  const category = await db.get('SELECT * FROM categories WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!category) return res.status(404).json({ error: 'Category not found' })
  
  const { name, parentId } = req.body || {}
  if (name) await db.run('UPDATE categories SET name = $1 WHERE id = $2', [name, id])
  if (parentId !== undefined) await db.run('UPDATE categories SET parentId = $1 WHERE id = $2', [parentId, id])
  
  const updated = await db.get('SELECT * FROM categories WHERE id = $1', [id])
  res.json({ category: updated })
})

app.delete('/api/categories/:id', auth, async (req, res) => {
  const { id } = req.params
  const category = await db.get('SELECT * FROM categories WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!category) return res.status(404).json({ error: 'Category not found' })
  
  await db.run('DELETE FROM categories WHERE id = $1', [id])
  res.json({ success: true })
})

// Transactions
app.get('/api/transactions', auth, async (req, res) => {
  const accounts = await db.all('SELECT id, currency FROM accounts WHERE userid = $1', [req.userid])
  const accountids = accounts.map(a => a.id)
  
  if (accountids.length === 0) {
    return res.json({ transactions: [] })
  }
  
  const placeholders = accountids.map((_, i) => `$${i + 1}`).join(',')
  const transactions = await db.all(`SELECT t.*, a.currency as accountCurrency FROM transactions t JOIN accounts a ON t.accountid = a.id WHERE t.accountid IN (${placeholders}) ORDER BY t.date DESC`, accountids)
  res.json({ transactions })
})

app.post('/api/transactions', auth, async (req, res) => {
  const { accountId, accountid, date, amount, type, categoryId, categoryid, description } = req.body || {}
  const accId = accountId || accountid
  const catId = categoryId || categoryid
  if (!accId || typeof amount !== 'number' || !date) return res.status(400).json({ error: 'accountId, date, amount required' })
  
  const account = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [accId, req.userid])
  if (!account) return res.status(400).json({ error: 'Invalid account' })
  
  const signed = (type === 'credit') ? Math.abs(amount) : -Math.abs(amount)
  const newBalance = account.balance + signed
  
  await db.run('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, accId])
  
  const txn = {
    id: uuidv4(),
    accountid: accId,
    categoryid: catId || null,
    date,
    amount: signed,
    type: type || (signed < 0 ? 'debit' : 'credit'),
    description: description || '',
    createdat: new Date().toISOString()
  }
  
  await db.run(`
    INSERT INTO transactions (id, accountid, categoryid, date, amount, type, description, createdat)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [txn.id, txn.accountid, txn.categoryid, txn.date, txn.amount, txn.type, txn.description, txn.createdat])
  
  res.json({ transaction: txn, accountBalance: newBalance })
})

app.put('/api/transactions/:id', auth, async (req, res) => {
  const { id } = req.params
  const txn = await db.get('SELECT * FROM transactions WHERE id = $1', [id])
  if (!txn) return res.status(404).json({ error: 'Transaction not found' })
  
  const account = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [txn.accountid, req.userid])
  if (!account) return res.status(400).json({ error: 'Account not found' })
  
  const oldAmount = txn.amount
  const { accountid, date, amount, type, categoryId, description } = req.body || {}
  
  if (accountid) {
    await db.run('UPDATE transactions SET accountid = $1 WHERE id = $2', [accountid, id])
  }
  if (date) {
    await db.run('UPDATE transactions SET date = $1 WHERE id = $2', [date, id])
  }
  if (typeof amount === 'number') {
    account.balance -= oldAmount
    const signed = (type === 'credit' || (type === undefined && amount > 0)) ? Math.abs(amount) : -Math.abs(amount)
    await db.run('UPDATE transactions SET amount = $1, type = $2 WHERE id = $3', [signed, type || (signed < 0 ? 'debit' : 'credit'), id])
    account.balance += signed
    await db.run('UPDATE accounts SET balance = $1 WHERE id = $2', [account.balance, account.id])
  }
  if (categoryId !== undefined) {
    await db.run('UPDATE transactions SET categoryId = $1 WHERE id = $2', [categoryId, id])
  }
  if (description !== undefined) {
    await db.run('UPDATE transactions SET description = $1 WHERE id = $2', [description, id])
  }
  
  const updated = await db.get('SELECT * FROM transactions WHERE id = $1', [id])
  res.json({ transaction: updated, accountBalance: account.balance })
})

app.delete('/api/transactions/:id', auth, async (req, res) => {
  const { id } = req.params
  const txn = await db.get('SELECT * FROM transactions WHERE id = $1', [id])
  if (!txn) return res.status(404).json({ error: 'Transaction not found' })
  
  const account = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [txn.accountid, req.userid])
  if (account) {
    const newBalance = account.balance - txn.amount
    await db.run('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, account.id])
  }
  
  await db.run('DELETE FROM transactions WHERE id = $1', [id])
  res.json({ success: true, accountBalance: account?.balance })
})

// Budgets
app.get('/api/budgets', auth, async (req, res) => {
  const budgets = await db.all('SELECT * FROM budgets WHERE userid = $1', [req.userid])
  const parsed = budgets.map(b => {
    try {
      return { ...b, lines: JSON.parse(b.lines || '[]') }
    } catch {
      return { ...b, lines: [] }
    }
  })
  res.json({ budgets: parsed })
})

app.post('/api/budgets', auth, async (req, res) => {
  const { month, year, currency, lines } = req.body || {}
  if (typeof month !== 'number' || typeof year !== 'number') return res.status(400).json({ error: 'month/year required' })
  
  const budget = {
    id: uuidv4(),
    userid: req.userid,
    month,
    year,
    currency: currency || 'USD',
    lines: JSON.stringify(Array.isArray(lines) ? lines : [])
  }
  
  await db.run(`
    INSERT INTO budgets (id, userId, month, year, currency, lines)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [budget.id, budget.userid, budget.month, budget.year, budget.currency, budget.lines])
  
  res.json({ budget: { ...budget, lines: JSON.parse(budget.lines || '[]') } })
})

app.put('/api/budgets/:id', auth, async (req, res) => {
  const { id } = req.params
  const budget = await db.get('SELECT * FROM budgets WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!budget) return res.status(404).json({ error: 'Budget not found' })
  
  const { month, year, currency, lines } = req.body || {}
  if (typeof month === 'number') await db.run('UPDATE budgets SET month = $1 WHERE id = $2', [month, id])
  if (typeof year === 'number') await db.run('UPDATE budgets SET year = $1 WHERE id = $2', [year, id])
  if (currency) await db.run('UPDATE budgets SET currency = $1 WHERE id = $2', [currency, id])
  if (Array.isArray(lines)) await db.run('UPDATE budgets SET lines = $1 WHERE id = $2', [JSON.stringify(lines), id])
  
  const updated = await db.get('SELECT * FROM budgets WHERE id = $1', [id])
  try {
    res.json({ budget: { ...updated, lines: JSON.parse(updated.lines || '[]') } })
  } catch {
    res.json({ budget: { ...updated, lines: [] } })
  }
})

app.delete('/api/budgets/:id', auth, async (req, res) => {
  const { id } = req.params
  const budget = await db.get('SELECT * FROM budgets WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!budget) return res.status(404).json({ error: 'Budget not found' })
  
  await db.run('DELETE FROM budgets WHERE id = $1', [id])
  res.json({ success: true })
})

// Goals
app.get('/api/goals', auth, async (req, res) => {
  const goals = await db.all('SELECT * FROM goals WHERE userid = $1', [req.userid])
  res.json({ goals })
})

app.post('/api/goals', auth, async (req, res) => {
  const { name, targetAmount, targetamount, dueDate, duedate } = req.body || {}
  const tgtAmount = targetAmount || targetamount
  const due = dueDate || duedate
  if (!name || typeof tgtAmount !== 'number') return res.status(400).json({ error: 'name and targetAmount required' })
  
  const goal = {
    id: uuidv4(),
    userid: req.userid,
    name,
    targetamount: tgtAmount,
    currentamount: 0,
    duedate: due || null,
    status: 'active'
  }
  
  await db.run(`
    INSERT INTO goals (id, userid, name, targetamount, currentamount, duedate, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [goal.id, goal.userid, goal.name, goal.targetamount, goal.currentamount, goal.duedate, goal.status])
  
  res.json({ goal })
})

app.put('/api/goals/:id', auth, async (req, res) => {
  const { id } = req.params
  const goal = await db.get('SELECT * FROM goals WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!goal) return res.status(404).json({ error: 'Goal not found' })
  
  const { name, targetamount, currentamount, duedate, status } = req.body || {}
  if (name) await db.run('UPDATE goals SET name = $1 WHERE id = $2', [name, id])
  if (typeof targetamount === 'number') await db.run('UPDATE goals SET targetamount = $1 WHERE id = $2', [targetamount, id])
  if (typeof currentamount === 'number') await db.run('UPDATE goals SET currentamount = $1 WHERE id = $2', [currentamount, id])
  if (duedate !== undefined) await db.run('UPDATE goals SET duedate = $1 WHERE id = $2', [duedate, id])
  if (status) await db.run('UPDATE goals SET status = $1 WHERE id = $2', [status, id])
  
  const updated = await db.get('SELECT * FROM goals WHERE id = $1', [id])
  res.json({ goal: updated })
})

app.delete('/api/goals/:id', auth, async (req, res) => {
  const { id } = req.params
  const goal = await db.get('SELECT * FROM goals WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!goal) return res.status(404).json({ error: 'Goal not found' })
  
  await db.run('DELETE FROM goals WHERE id = $1', [id])
  res.json({ success: true })
})

// Recurring Transactions
function getNextDate(currentDate, frequency) {
  const date = new Date(currentDate)
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  return date.toISOString().split('T')[0]
}

app.get('/api/recurring', auth, async (req, res) => {
  const recurring = await db.all('SELECT * FROM recurring WHERE userid = $1', [req.userid])
  res.json({ recurring })
})

app.post('/api/recurring', auth, async (req, res) => {
  const { accountId, accountid, name, amount, type, frequency, startDate, startdate, description } = req.body || {}
  const accId = accountId || accountid
  const start = startDate || startdate
  if (!accId || !name || !amount || !frequency || !start) {
    return res.status(400).json({ error: 'accountId, name, amount, frequency, startDate required' })
  }
  
  const account = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [accId, req.userid])
  if (!account) return res.status(400).json({ error: 'Invalid account' })
  
  const recurring = {
    id: uuidv4(),
    userid: req.userid,
    accountid: accId,
    name,
    amount: Math.abs(amount),
    type: type || 'debit',
    frequency,
    startdate: start,
    nextdate: start,
    description: description || '',
    active: 1
  }
  
  await db.run(`
    INSERT INTO recurring (id, userid, accountid, name, amount, type, frequency, startdate, nextdate, description, active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [recurring.id, recurring.userid, recurring.accountid, recurring.name, recurring.amount, recurring.type, recurring.frequency, recurring.startdate, recurring.nextdate, recurring.description, recurring.active])
  
  res.json({ recurring })
})

app.put('/api/recurring/:id', auth, async (req, res) => {
  const { id } = req.params
  const recurring = await db.get('SELECT * FROM recurring WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!recurring) return res.status(404).json({ error: 'Recurring not found' })
  
  const { name, amount, type, frequency, startdate, nextdate, description, active } = req.body || {}
  if (name) await db.run('UPDATE recurring SET name = $1 WHERE id = $2', [name, id])
  if (typeof amount === 'number') await db.run('UPDATE recurring SET amount = $1 WHERE id = $2', [amount, id])
  if (type) await db.run('UPDATE recurring SET type = $1 WHERE id = $2', [type, id])
  if (frequency) await db.run('UPDATE recurring SET frequency = $1 WHERE id = $2', [frequency, id])
  if (startdate) await db.run('UPDATE recurring SET startdate = $1 WHERE id = $2', [startdate, id])
  if (nextdate) await db.run('UPDATE recurring SET nextdate = $1 WHERE id = $2', [nextdate, id])
  if (description !== undefined) await db.run('UPDATE recurring SET description = $1 WHERE id = $2', [description, id])
  if (typeof active === 'number') await db.run('UPDATE recurring SET active = $1 WHERE id = $2', [active, id])
  
  const updated = await db.get('SELECT * FROM recurring WHERE id = $1', [id])
  res.json({ recurring: updated })
})

app.delete('/api/recurring/:id', auth, async (req, res) => {
  const { id } = req.params
  const recurring = await db.get('SELECT * FROM recurring WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!recurring) return res.status(404).json({ error: 'Recurring not found' })
  
  await db.run('DELETE FROM recurring WHERE id = $1', [id])
  res.json({ success: true })
})

app.post('/api/recurring/:id/process', auth, async (req, res) => {
  const { id } = req.params
  const recurring = await db.get('SELECT * FROM recurring WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!recurring) return res.status(404).json({ error: 'Recurring not found' })
  if (!recurring.active) return res.status(400).json({ error: 'Recurring is inactive' })
  
  const account = await db.get('SELECT * FROM accounts WHERE id = $1', [recurring.accountid])
  if (!account) return res.status(400).json({ error: 'Account not found' })
  
  const signed = recurring.type === 'credit' ? recurring.amount : -recurring.amount
  const newBalance = account.balance + signed
  await db.run('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, account.id])
  
  const txn = {
    id: uuidv4(),
    accountid: recurring.accountid,
    categoryId: null,
    date: recurring.nextdate,
    amount: signed,
    type: recurring.type,
    description: recurring.name,
    createdat: new Date().toISOString()
  }
  
  await db.run(`
    INSERT INTO transactions (id, accountid, categoryid, date, amount, type, description, createdat)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [txn.id, txn.accountid, txn.categoryid, txn.date, txn.amount, txn.type, txn.description, txn.createdat])
  
  const nextdate = getNextDate(recurring.nextdate, recurring.frequency)
  await db.run('UPDATE recurring SET nextdate = $1 WHERE id = $2', [nextdate, id])
  
  res.json({ transaction: txn, accountBalance: newBalance })
})

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'healthy' }))

// Serve index.html for all non-API routes (SPA fallback)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  next()
})

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../saveit-web/dist/index.html'))
})

// Initialize and start server
initDb().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`PlanMyBudget API listening on http://localhost:${PORT}`)
    console.log(`Database: PostgreSQL`)
  })

  process.on('SIGINT', () => {
    server.close(() => {
      pool.end()
      console.log('Server shut down')
      process.exit(0)
    })
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})

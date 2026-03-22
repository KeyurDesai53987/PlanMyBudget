const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const { Pool } = require('pg')
const nodemailer = require('nodemailer')
const bcrypt = require('bcryptjs')
const { OAuth2Client } = require('google-auth-library')

const app = express()
const PORT = process.env.PORT || 4000

// Security headers
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://planmybudget.xyz', 'http://planmybudget.xyz'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}))

// Body size limits
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  const originalSend = res.send
  
  res.send = function(data) {
    const duration = Date.now() - start
    const logLevel = res.statusCode >= 400 ? 'error' : 'info'
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100)
    }
    
    if (logLevel === 'error' || process.env.NODE_ENV !== 'production') {
      console.log(`[${log.timestamp}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`)
    }
    
    originalSend.call(this, data)
  }
  
  next()
})

// Upstash Redis for rate limiting and OTP storage
let redis = null
let ratelimit = null

async function initRedis() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = require('@upstash/redis')
      const { Ratelimit } = require('@upstash/ratelimit')
      
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      
      ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        analytics: false,
        prefix: 'ratelimit:',
      })
      
      console.log('Upstash Redis connected')
    } catch (err) {
      console.log('Redis init failed, falling back to in-memory:', err.message)
    }
  } else {
    console.log('Upstash Redis not configured (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)')
  }
}

initRedis()

const MAX_LOGIN_ATTEMPTS = 5
const MAX_OTP_ATTEMPTS = 3

async function checkRateLimit(key, maxAttempts) {
  if (ratelimit) {
    const result = await ratelimit.limit(key)
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfter: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000)
    }
  }
  
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.windowEnd) {
    rateLimitStore.set(key, { attempts: 1, windowEnd: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: maxAttempts - 1 }
  }
  
  if (record.attempts >= maxAttempts) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.windowEnd - now) / 1000) }
  }
  
  record.attempts++
  return { allowed: true, remaining: maxAttempts - record.attempts }
}

const rateLimitStore = new Map()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000

// Secure token generator
function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Email transporter (configure your SMTP in environment variables)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Input validation helpers
const validators = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) && value.length <= 255
  },
  
  password: (value) => {
    return typeof value === 'string' && value.length >= 6 && value.length <= 128
  },
  
  name: (value) => {
    if (!value) return true // Optional field
    return typeof value === 'string' && value.length >= 1 && value.length <= 100
  },
  
  amount: (value) => {
    const num = parseFloat(value)
    return !isNaN(num) && num >= -999999999 && num <= 999999999
  },
  
  date: (value) => {
    if (!value) return false
    const date = new Date(value)
    return !isNaN(date.getTime()) && value.length <= 20
  },
  
  text: (value, maxLen = 255) => {
    if (!value) return true
    return typeof value === 'string' && value.length <= maxLen
  },
  
  id: (value) => {
    return typeof value === 'string' && value.length > 0 && value.length <= 50
  },
  
  currency: (value) => {
    if (!value) return true // Optional
    return typeof value === 'string' && /^[A-Z]{3}$/.test(value)
  },
  
  type: (value, allowed) => {
    return allowed.includes(value)
  }
}

// Sanitize string - remove potential XSS characters
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

// Validation middleware factory
function validate(fields) {
  return (req, res, next) => {
    const errors = []
    
    for (const [field, validator] of Object.entries(fields)) {
      const value = req.body?.[field]
      if (!validator(value)) {
        errors.push(`Invalid field: ${field}`)
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: errors[0],
        details: errors
      })
    }
    
    // Sanitize string fields
    if (req.body) {
      if (req.body.name) req.body.name = sanitizeString(req.body.name)
      if (req.body.description) req.body.description = sanitizeString(req.body.description)
    }
    
    next()
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    })
  }
  
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({ 
      error: 'Database connection failed. Please try again later.',
      code: 'DB_UNAVAILABLE'
    })
  }
  
  res.status(500).json({ 
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR'
  })
})

// OTP store (Redis when available, fallback to in-memory)
async function setOTP(email, otp, attempts = 0) {
  if (redis) {
    await redis.set(`otp:${email}`, JSON.stringify({ otp, attempts, created: Date.now() }), { ex: 600 })
  } else {
    otpStoreInMemory.set(email, { otp, attempts, created: Date.now() })
  }
}

async function getOTP(email) {
  if (redis) {
    const data = await redis.get(`otp:${email}`)
    return data ? JSON.parse(data) : null
  }
  return otpStoreInMemory.get(email) || null
}

async function deleteOTP(email) {
  if (redis) {
    await redis.del(`otp:${email}`)
  } else {
    otpStoreInMemory.delete(email)
  }
}

const otpStoreInMemory = new Map()

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@planmybudget.app',
      to: email,
      subject: 'Your PlanMyBudget OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #475569;">PlanMyBudget</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `
    })
    return true
  } catch (err) {
    console.log('Email send failed (email may not be configured):', err.message)
    return false
  }
}

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
      userid TEXT NOT NULL,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expiresat TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
      FOREIGN KEY (userid) REFERENCES users(id)
    )
  `)
  
  // Add expiresat column if it doesn't exist (for existing tables)
  try {
    await db.run('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expiresat TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL \'30 days\')')
  } catch (e) {
    // Column may already exist
  }

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

  await db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      userid TEXT NOT NULL,
      name TEXT NOT NULL,
      keyhash TEXT NOT NULL,
      keyprefix TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userid) REFERENCES users(id)
    )
  `)

  // Create indexes for better query performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_accounts_userid ON accounts(userid)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_accountid ON transactions(accountid)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_categoryid ON transactions(categoryid)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_userid ON sessions(userid)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_expiresat ON sessions(expiresat)',
    'CREATE INDEX IF NOT EXISTS idx_budgets_userid ON budgets(userid)',
    'CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(year, month)',
    'CREATE INDEX IF NOT EXISTS idx_goals_userid ON goals(userid)',
    'CREATE INDEX IF NOT EXISTS idx_recurring_userid ON recurring(userid)',
    'CREATE INDEX IF NOT EXISTS idx_recurring_nextdate ON recurring(nextdate)',
    'CREATE INDEX IF NOT EXISTS idx_api_keys_userid ON api_keys(userid)',
    'CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(keyprefix)'
  ]
  
  for (const idx of indexes) {
    try {
      await db.run(idx)
    } catch (e) {
      // Index may already exist
    }
  }

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

// Email notification function for budget alerts
async function sendBudgetAlertEmail(email, budget, spent, limit, currency) {
  try {
    const percentage = Math.round((spent / limit) * 100)
    const remaining = limit - spent
    const status = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'almost reached' : 'on track'
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@planmybudget.app',
      to: email,
      subject: `Budget Alert: ${budget.name} - ${percentage}% used`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #475569;">Budget Alert</h2>
          <p>Your budget for <strong>${budget.name}</strong> is ${status}:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Spent:</strong> ${currency}${spent.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Budget:</strong> ${currency}${limit.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Remaining:</strong> ${currency}${remaining.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Usage:</strong> ${percentage}%</p>
          </div>
          
          ${percentage >= 100 ? '<p style="color: #dc2626;"><strong>Warning:</strong> You have exceeded your budget!</p>' : ''}
          ${percentage >= 80 && percentage < 100 ? '<p style="color: #f59e0b;"><strong>Warning:</strong> You are approaching your budget limit.</p>' : ''}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Sent by PlanMyBudget
          </p>
        </div>
      `
    })
    return true
  } catch (err) {
    console.log('Budget alert email failed:', err.message)
    return false
  }
}

// Password hashing
function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10)
}

function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash)
}

// Auth middleware - supports both Bearer tokens and API keys
async function auth(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const apiKey = req.headers['x-api-key'] || ''
  
  // Try Bearer token first
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim()
    const session = await db.get('SELECT * FROM sessions WHERE token = $1 AND (expiresat IS NULL OR expiresat > NOW())', [token])
    if (session) {
      req.userid = session.userid
      return next()
    }
  }
  
  // Try API key
  if (apiKey) {
    const keyPrefix = apiKey.slice(0, 10)
    const keyHash = bcrypt.hashSync(apiKey, 'salt') // Verify without storing plain
    
    // Find key by prefix and verify
    const storedKey = await db.get('SELECT * FROM api_keys WHERE keyprefix = $1 AND active = 1', [keyPrefix])
    if (storedKey) {
      // Verify the key matches
      if (bcrypt.compareSync(apiKey, storedKey.keyhash)) {
        req.userid = storedKey.userid
        req.isApiKey = true
        return next()
      }
    }
  }
  
  return res.status(401).json({ error: 'Unauthorized' })
}

/** API Routes **/

// Status
app.get('/api/status', (req, res) => res.json({ status: 'ok' }))

// Register
app.post('/api/users/register', validate({ email: validators.email, password: validators.password, name: validators.name }), async (req, res) => {
  const { email, password, name } = req.body || {}
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
app.post('/api/users/login', validate({ email: validators.email, password: validators.password }), async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  
  // Rate limiting
  const ip = req.ip || req.connection.remoteAddress
  const loginKey = `login:${ip}:${email.toLowerCase()}`
  const loginLimit = await checkRateLimit(loginKey, MAX_LOGIN_ATTEMPTS)
  
  if (!loginLimit.allowed) {
    return res.status(429).json({ 
      error: 'Too many login attempts. Please try again later.',
      retryAfter: loginLimit.retryAfter
    })
  }
  
  const user = await db.get('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase()])
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  if (!verifyPassword(password, user.passwordhash)) return res.status(401).json({ error: 'Invalid credentials' })
  
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  await db.run('INSERT INTO sessions (token, userid, expiresat) VALUES ($1, $2, $3)', [token, user.id, expiresAt])
  
  res.json({ token, userId: user.id })
})

// Logout
app.post('/api/logout', async (req, res) => {
  const header = req.headers['authorization'] || ''
  if (!header) return res.status(401).json({ error: 'Unauthorized' })
  
  const token = header.replace('Bearer ', '').trim()
  await db.run('DELETE FROM sessions WHERE token = $1', [token])
  
  res.json({ success: true })
})

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Email required' })
  
  // Rate limiting for OTP requests
  const ip = req.ip || req.connection.remoteAddress
  const otpKey = `otp:${ip}`
  const otpLimit = await checkRateLimit(otpKey, 5) // 5 OTP requests per 15 minutes
  
  if (!otpLimit.allowed) {
    return res.status(429).json({ 
      error: 'Too many OTP requests. Please try again later.',
      retryAfter: otpLimit.retryAfter
    })
  }
  
  const user = await db.get('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase()])
  if (user) return res.status(400).json({ error: 'User already exists' })
  
  const otp = generateOTP()
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  await setOTP(email.toLowerCase(), { otp, expiresAt, attempts: 0 })
  
  const sent = await sendOTPEmail(email, otp)
  
  res.json({ 
    success: true, 
    message: sent ? 'OTP sent to your email' : 'OTP generated (email not configured)',
    email: email // Return email for frontend state
  })
})

// Verify OTP and register
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp, password, name } = req.body || {}
  if (!email || !otp || !password) return res.status(400).json({ error: 'Email, OTP and password required' })
  
  // Password strength validation
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  
  const stored = await getOTP(email.toLowerCase())
  if (!stored) return res.status(400).json({ error: 'No OTP requested for this email' })
  
  // Check OTP attempts
  if (stored.attempts >= MAX_OTP_ATTEMPTS) {
    await deleteOTP(email.toLowerCase())
    return res.status(400).json({ error: 'Too many attempts. Request a new OTP.' })
  }
  
  if (Date.now() > stored.expiresAt) {
    await deleteOTP(email.toLowerCase())
    return res.status(400).json({ error: 'OTP expired. Request a new one.' })
  }
  
  if (stored.otp !== otp) {
    stored.attempts++
    await setOTP(email.toLowerCase(), stored)
    return res.status(400).json({ error: 'Invalid OTP' })
  }
  
  await deleteOTP(email.toLowerCase())
  
  const user = {
    id: uuidv4(),
    email,
    passwordhash: hashPassword(password),
    name: name || '',
    preferredCurrency: 'USD',
    locale: 'en-US',
    createdat: new Date().toISOString()
  }
  
  await db.run(`
    INSERT INTO users (id, email, passwordhash, name, preferredcurrency, locale, createdat)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [user.id, user.email, user.passwordhash, user.name, user.preferredCurrency, user.locale, user.createdat])
  
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await db.run('INSERT INTO sessions (token, userid, expiresat) VALUES ($1, $2, $3)', [token, user.id, expiresAt])
  
  res.json({ token, userId: user.id })
})

// Google OAuth
app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body || {}
  if (!idToken) return res.status(400).json({ error: 'ID token required' })
  
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    const payload = ticket.getPayload()
    
    let user = await db.get('SELECT * FROM users WHERE email = $1', [payload.email])
    
    if (!user) {
      const userId = uuidv4()
      await db.run(`
        INSERT INTO users (id, email, name, passwordhash, preferredcurrency, locale, createdat)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, payload.email, payload.name || '', '', 'USD', 'en-US', new Date().toISOString()])
      
      user = await db.get('SELECT * FROM users WHERE id = $1', [userId])
    }
    
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await db.run('INSERT INTO sessions (token, userId) VALUES ($1, $2)', [token, user.id])
    
    res.json({ token, userId: user.id })
  } catch (err) {
    console.error('Google auth error:', err)
    res.status(401).json({ error: 'Google authentication failed' })
  }
})

// Accounts
app.get('/api/accounts', auth, async (req, res) => {
  const accounts = await db.all('SELECT * FROM accounts WHERE userid = $1', [req.userid])
  const formatted = accounts.map(a => ({
    id: a.id,
    userId: a.userid,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    createdAt: a.createdat
  }))
  res.json({ accounts: formatted })
})

app.post('/api/accounts', auth, validate({ name: (v) => validators.text(v, 100), type: (v) => validators.type(v, ['checking', 'savings', 'credit', 'cash', 'investment']), currency: validators.currency }), async (req, res) => {
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

// API Keys Management
app.post('/api/api-keys', auth, async (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ error: 'Name required' })
  
  const id = uuidv4()
  const apiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex')
  const keyPrefix = apiKey.slice(0, 10)
  const keyHash = bcrypt.hashSync(apiKey, 10)
  
  await db.run(`
    INSERT INTO api_keys (id, userid, name, keyhash, keyprefix, createdat)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `, [id, req.userid, name, keyHash, keyPrefix])
  
  res.json({
    id,
    apiKey,
    name,
    createdAt: new Date().toISOString(),
    message: 'Save this API key. It will not be shown again.'
  })
})

app.get('/api/api-keys', auth, async (req, res) => {
  const keys = await db.all('SELECT id, name, keyprefix, active, createdat FROM api_keys WHERE userid = $1 ORDER BY createdat DESC', [req.userid])
  res.json({ apiKeys: keys })
})

app.delete('/api/api-keys/:id', auth, async (req, res) => {
  const { id } = req.params
  await db.run('UPDATE api_keys SET active = 0 WHERE id = $1 AND userid = $2', [id, req.userid])
  res.json({ success: true })
})

// Profile
app.get('/api/profile', auth, async (req, res) => {
  const user = await db.get('SELECT id, email, name, preferredCurrency, locale, createdat FROM users WHERE id = $1', [req.userid])
  res.json({ 
    preferences: {
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.preferredCurrency,
      locale: user.locale,
      createdAt: user.createdat
    }
  })
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
  const rows = await db.all(`SELECT t.*, a.currency as accountCurrency FROM transactions t JOIN accounts a ON t.accountid = a.id WHERE t.accountid IN (${placeholders}) ORDER BY t.date DESC`, accountids)
  const formatted = rows.map(t => ({
    id: t.id,
    accountId: t.accountid,
    categoryId: t.categoryid,
    date: t.date,
    amount: t.amount,
    type: t.type,
    description: t.description,
    accountCurrency: t.accountCurrency,
    createdAt: t.createdat
  }))
  res.json({ transactions: formatted })
})

app.post('/api/transactions', auth, validate({ 
  amount: validators.amount,
  date: validators.date,
  description: (v) => validators.text(v, 500)
}), async (req, res) => {
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
  
  // Verify ownership - transaction must belong to user's account
  const txn = await db.get(`
    SELECT t.* FROM transactions t 
    JOIN accounts a ON t.accountid = a.id 
    WHERE t.id = $1 AND a.userid = $2
  `, [id, req.userid])
  if (!txn) return res.status(404).json({ error: 'Transaction not found' })
  
  const account = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [txn.accountid, req.userid])
  
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
  
  // Verify ownership - transaction must belong to user's account
  const txn = await db.get(`
    SELECT t.* FROM transactions t 
    JOIN accounts a ON t.accountid = a.id 
    WHERE t.id = $1 AND a.userid = $2
  `, [id, req.userid])
  if (!txn) return res.status(404).json({ error: 'Transaction not found' })
  
  const account = await db.get('SELECT * FROM accounts WHERE id = $1 AND userid = $2', [txn.accountid, req.userid])
  if (account) {
    const newBalance = account.balance - txn.amount
    await db.run('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, account.id])
  }
  
  await db.run('DELETE FROM transactions WHERE id = $1', [id])
  res.json({ success: true, accountBalance: account?.balance })
})

// Check budget alerts
app.get('/api/budgets/alerts', auth, async (req, res) => {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  
  const budgets = await db.all(
    'SELECT * FROM budgets WHERE userid = $1 AND month = $2 AND year = $3',
    [req.userid, currentMonth, currentYear]
  )
  
  const user = await db.get('SELECT * FROM users WHERE id = $1', [req.userid])
  const accounts = await db.all('SELECT * FROM accounts WHERE userid = $1', [req.userid])
  
  const alerts = []
  
  for (const budget of budgets) {
    const lines = JSON.parse(budget.lines || '[]')
    
    for (const line of lines) {
      if (!line.limit || !line.categoryId) continue
      
      const spent = Math.abs(line.spent || 0)
      const limit = line.limit
      const percentage = (spent / limit) * 100
      
      if (percentage >= 80) {
        alerts.push({
          categoryId: line.categoryId,
          spent,
          limit,
          percentage: Math.round(percentage),
          currency: budget.currency || 'USD'
        })
      }
    }
  }
  
  res.json({ alerts, currency: user?.preferredcurrency || 'USD' })
})

// Send budget alert email
app.post('/api/budgets/send-alert', auth, async (req, res) => {
  const { categoryId, spent, limit } = req.body
  if (!categoryId || typeof spent !== 'number' || typeof limit !== 'number') {
    return res.status(400).json({ error: 'categoryId, spent, and limit required' })
  }
  
  const user = await db.get('SELECT * FROM users WHERE id = $1', [req.userid])
  if (!user?.email) return res.status(400).json({ error: 'No email found' })
  
  const category = await db.get('SELECT * FROM categories WHERE id = $1', [categoryId])
  const sent = await sendBudgetAlertEmail(
    user.email,
    { name: category?.name || 'Budget' },
    spent,
    limit,
    user.preferredcurrency || 'USD'
  )
  
  res.json({ success: sent })
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
  const formatted = goals.map(g => ({
    id: g.id,
    userId: g.userid,
    name: g.name,
    targetAmount: g.targetamount,
    currentAmount: g.currentamount,
    dueDate: g.duedate,
    status: g.status,
    createdAt: g.createdat
  }))
  res.json({ goals: formatted })
})

app.post('/api/goals', auth, validate({
  name: (v) => validators.text(v, 100),
  targetAmount: validators.amount,
  dueDate: validators.date
}), async (req, res) => {
  const { name, targetAmount, targetamount, dueDate, duedate } = req.body || {}
  const tgtAmount = targetAmount || targetamount
  const due = dueDate || duedate
  if (!name || typeof tgtAmount !== 'number') return res.status(400).json({ error: 'name and targetAmount required' })
  
  const goal = {
    id: uuidv4(),
    userid: req.userid,
    name,
    targetAmount: tgtAmount,
    currentAmount: 0,
    dueDate: due || null,
    status: 'active'
  }
  
  await db.run(`
    INSERT INTO goals (id, userid, name, targetamount, currentamount, duedate, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [goal.id, goal.userid, goal.name, goal.targetAmount, goal.currentAmount, goal.dueDate, goal.status])
  
  res.json({ goal })
})

app.put('/api/goals/:id', auth, async (req, res) => {
  const { id } = req.params
  const goal = await db.get('SELECT * FROM goals WHERE id = $1 AND userid = $2', [id, req.userid])
  if (!goal) return res.status(404).json({ error: 'Goal not found' })
  
  const { name, targetAmount, targetamount, currentAmount, currentamount, dueDate, duedate, status } = req.body || {}
  if (name) await db.run('UPDATE goals SET name = $1 WHERE id = $2', [name, id])
  if (typeof (targetAmount || targetamount) === 'number') await db.run('UPDATE goals SET targetamount = $1 WHERE id = $2', [targetAmount || targetamount, id])
  if (typeof (currentAmount || currentamount) === 'number') await db.run('UPDATE goals SET currentamount = $1 WHERE id = $2', [currentAmount || currentamount, id])
  if (dueDate !== undefined || duedate !== undefined) await db.run('UPDATE goals SET duedate = $1 WHERE id = $2', [dueDate || duedate, id])
  if (status) await db.run('UPDATE goals SET status = $1 WHERE id = $2', [status, id])
  
  const updated = await db.get('SELECT * FROM goals WHERE id = $1', [id])
  const formatted = {
    id: updated.id,
    userId: updated.userid,
    name: updated.name,
    targetAmount: updated.targetamount,
    currentAmount: updated.currentamount,
    dueDate: updated.duedate,
    status: updated.status,
    createdAt: updated.createdat
  }
  res.json({ goal: formatted })
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

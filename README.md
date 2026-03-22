# PlanMyBudget - Complete Developer Documentation

> A comprehensive personal finance tracking application with web, desktop, and mobile support.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Why We Chose It](#2-tech-stack--why-we-chose-it)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [API Documentation](#5-api-documentation)
6. [Security Implementation](#6-security-implementation)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Development Setup](#8-development-setup)
9. [Deployment](#9-deployment)
10. [Project Structure](#10-project-structure)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Project Overview

### What is PlanMyBudget?

PlanMyBudget is a personal finance tracking application that helps users manage their money through:

- **Account Management**: Track multiple bank accounts, wallets, and credit cards
- **Transaction Tracking**: Record income and expenses with categories
- **Budget Planning**: Set monthly budgets and receive alerts
- **Goal Setting**: Create savings goals with progress tracking
- **Recurring Transactions**: Automate regular payments
- **Visual Analytics**: Charts and reports for financial insights

### Target Users

- Individuals tracking personal finances
- Small teams managing shared expenses
- Anyone wanting to understand their spending patterns

### Key Features

| Feature | Description |
|---------|-------------|
| Dashboard | Overview of finances with charts |
| Accounts | Manage multiple financial accounts |
| Transactions | Income/expense tracking with filters |
| Budgets | Monthly budget limits with alerts |
| Goals | Savings goals with progress bars |
| Recurring | Automated recurring transactions |
| Categories | Custom transaction categories |
| Dark Mode | Light/dark theme toggle |
| Export | CSV export for all data |
| API Access | REST API for mobile apps |

---

## 2. Tech Stack & Why We Chose It

### Frontend

#### React (JavaScript Framework)
```
Why: Component-based architecture, reusable UI components, vast ecosystem
Alternatives: Vue, Svelte, Angular
```

**Why React over others?**
- Largest community and job market
- Rich ecosystem of libraries (state management, routing, UI)
- React Hooks make state management intuitive
- React Native enables mobile development with same codebase

#### Vite (Build Tool)
```
Why: Fast HMR (Hot Module Replacement), optimized builds, great DX
Alternatives: Create React App, Webpack
```

**Why Vite over CRA?**
- 10-100x faster development server startup
- Instant HMR regardless of app size
- Out-of-the-box TypeScript support
- Optimized production builds

#### Mantine UI (Component Library)
```
Why: Fully featured, accessible, dark mode built-in
Alternatives: Material UI, Ant Design, Chakra UI
```

**Why Mantine?**
- Built-in dark mode support
- Accessible by default (ARIA compliant)
- Comprehensive component library (forms, modals, notifications)
- Free and open source
- Good documentation

#### Recharts (Charts)
```
Why: React-native, customizable, lightweight
Alternatives: Chart.js, Victory, Nivo
```

**Why Recharts?**
- Built specifically for React
- SVG-based for crisp rendering
- Responsive out of the box
- Tree-shakeable for smaller bundles

---

### Backend

#### Node.js (Runtime)
```
Why: JavaScript everywhere, non-blocking I/O, npm ecosystem
Alternatives: Python/Django, Go, Ruby on Rails
```

**Why Node.js?**
- Same language as frontend (full-stack JavaScript)
- Excellent for I/O-heavy apps (our API)
- Largest package registry (npm)
- Easy to hire developers

#### Express.js (Framework)
```
Why: Minimal, flexible, middleware ecosystem
Alternatives: Fastify, NestJS, Koa
```

**Why Express?**
- Industry standard for Node.js APIs
- Huge community and tutorials
- Middleware for everything (auth, logging, CORS)
- Easy to learn and extend

#### PostgreSQL (Database)
```
Why: Reliable, ACID compliant, JSON support, free
Alternatives: MySQL, MongoDB, SQLite
```

**Why PostgreSQL over MySQL?**
- Better support for complex queries
- Native JSON data type
- Full-text search built-in
- Row-level security (RLS) for multi-tenancy
- Supabase provides excellent free tier

---

### Infrastructure

#### Supabase (Database as a Service)
```
Why: PostgreSQL + auth + storage + real-time
Alternatives: Firebase, PlanetScale, Neon
```

**Why Supabase?**
- Generous free tier (500MB database)
- Built on PostgreSQL (all SQL features)
- Real-time subscriptions
- Row-level security
- Dashboard for database management

#### Vercel (Frontend Hosting)
```
Why: Optimized for Next.js/React, global CDN, zero config
Alternatives: Netlify, AWS Amplify, GitHub Pages
```

**Why Vercel?**
- Instant deploys from GitHub
- Edge network for global performance
- Free tier includes SSL
- Built-in preview deployments

#### Render (Backend Hosting)
```
Why: Simple deploy, managed infrastructure, good free tier
Alternatives: Railway, Heroku, Fly.io
```

**Why Render?**
- Connect to GitHub for auto-deploy
- Managed PostgreSQL available
- Sleeps after 15min (free tier) - OK for dev
- Custom domains with SSL

---

### Desktop & Mobile

#### Electron (Desktop App)
```
Why: Cross-platform, web tech stack, native APIs
Alternatives: Tauri, NW.js
```

**Why Electron?**
- Same codebase as web app
- Access to native OS features
- Distribution to macOS, Windows, Linux
- Large ecosystem

#### React Native (Mobile - SaveItMobile)
```
Why: Cross-platform iOS/Android, React knowledge reusable
Alternatives: Flutter, Swift/Kotlin native
```

**Why React Native?**
- 80% code sharing between iOS/Android
- JavaScript developers can build mobile apps
- Hot reloading during development
- Expo for easy setup and builds

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web Browser   │   Desktop App   │      Mobile App             │
│   (Vite/React)  │   (Electron)    │   (React Native)            │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                        │
         └─────────────────┴────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTERNET / CDN                               │
│                   (Vercel Edge Network)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LOAD BALANCER                                │
│                      (Optional)                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RENDER (Backend)                              │
│                  Node.js + Express API                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Rate Limiter │  │   Sessions   │  │      Middleware       │  │
│  │  (Upstash)   │  │  (Database)  │  │ (Auth, CORS, Parse)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    SUPABASE     │  │    UPSTASH     │  │     EMAIL       │
│   (PostgreSQL)  │  │    (Redis)     │  │   (Gmail/SMTP)  │
│                 │  │                │  │                 │
│ - Users         │  │ - Rate Limits  │  │ - OTP Codes     │
│ - Accounts      │  │ - OTP Cache    │  │ - Notifications │
│ - Transactions  │  │ - Cache        │  │                 │
│ - Budgets       │  │                │  │                 │
│ - Goals         │  │                │  │                 │
│ - Sessions      │  │                │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Request Flow

```
1. User action in UI
       ↓
2. React component calls API function (api.js)
       ↓
3. Fetch request to backend with auth token
       ↓
4. Express middleware (CORS, Auth, Rate Limit)
       ↓
5. Route handler processes request
       ↓
6. PostgreSQL query via Supabase
       ↓
7. Response transformed to camelCase
       ↓
8. Frontend updates state → UI re-renders
```

---

## 4. Database Schema

### Entity Relationship Diagram

```
users ──────────────┬──────────────┬──────────────┬──────────────
   │               │              │              │              │
   │ (1:N)         │ (1:N)        │ (1:N)        │ (1:N)        │
   ▼               ▼              ▼              ▼              │
accounts ───► transactions    budgets       goals        categories
   │               │              │                            │
   │ (1:N)         │              │                            │
   └──────────────►│              │                            │
                   │              │                            │
               recurring ────────┘                            │
                                                              │
                                                              │
                                                        sessions
                                                          (token)

api_keys ───────► users
```

### Tables

#### users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID
  email TEXT UNIQUE NOT NULL,             -- Login identifier
  passwordhash TEXT NOT NULL,             -- bcrypt hash
  name TEXT,                              -- Display name
  preferredcurrency TEXT DEFAULT 'USD',   -- User's currency
  locale TEXT DEFAULT 'en-US',           -- Date/number format
  createdat TIMESTAMP DEFAULT NOW()       -- Account creation
);
```
**Why this design?**
- `id` as TEXT (not UUID type) for simplicity
- Email unique with lowercase index
- Password never stored in plain text
- Currency/locale for internationalization

#### accounts
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  userid TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,                    -- "Chase Checking"
  type TEXT NOT NULL,                    -- "checking", "savings", "credit"
  currency TEXT DEFAULT 'USD',
  balance REAL DEFAULT 0,                 -- Current balance
  createdat TIMESTAMP DEFAULT NOW()
);
```
**Why this design?**
- Multiple account types support
- Balance stored for quick dashboard queries
- Currency per account for multi-currency users

#### categories
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,                    -- "Groceries"
  parentId TEXT,                         -- For subcategories
  createdat TIMESTAMP DEFAULT NOW()
);
```
**Why this design?**
- Hierarchical categories via self-reference
- User-specific categories (not global)
- Parent can be null for top-level

#### transactions
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  accountid TEXT NOT NULL REFERENCES accounts(id),
  categoryId TEXT REFERENCES categories(id),
  date TEXT NOT NULL,                    -- ISO date string
  amount REAL NOT NULL,                  -- Positive for income, negative for expense
  type TEXT NOT NULL,                    -- "income" or "expense"
  description TEXT,
  createdat TIMESTAMP DEFAULT NOW()
);
```
**Why this design?**
- `amount` sign determines type (or use `type` field)
- `accountid` links to account for balance calculation
- `categoryId` is optional (some transactions uncategorized)
- Date as TEXT for easy ISO formatting

#### budgets
```sql
CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  month INTEGER NOT NULL,                 -- 1-12
  year INTEGER NOT NULL,                 -- e.g., 2024
  currency TEXT DEFAULT 'USD',
  lines TEXT DEFAULT '[]',                -- JSON array of budget lines
  createdat TIMESTAMP DEFAULT NOW()
);
```
**Why this design?**
- One budget per user per month
- `lines` is JSON for flexible budget categories:
```json
[
  {"categoryId": "cat-123", "limit": 500, "spent": 320},
  {"categoryId": "cat-456", "limit": 200, "spent": 180}
]
```

#### goals
```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,                    -- "New Car"
  targetamount REAL NOT NULL,           -- $10,000
  currentamount REAL DEFAULT 0,         -- $3,500
  duedate TEXT,                         -- Optional deadline
  status TEXT DEFAULT 'active',          -- "active", "completed", "cancelled"
  createdat TIMESTAMP DEFAULT NOW()
);
```

#### recurring
```sql
CREATE TABLE recurring (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  accountid TEXT NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,                    -- "Netflix Subscription"
  amount REAL NOT NULL,
  type TEXT NOT NULL,                    -- "income" or "expense"
  frequency TEXT NOT NULL,              -- "daily", "weekly", "monthly", "yearly"
  startdate TEXT NOT NULL,
  nextdate TEXT NOT NULL,               -- Next occurrence
  description TEXT,
  active INTEGER DEFAULT 1,
  createdat TIMESTAMP DEFAULT NOW()
);
```

#### sessions
```sql
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,                -- 64-char hex token
  userid TEXT NOT NULL REFERENCES users(id),
  createdat TIMESTAMP DEFAULT NOW(),
  expiresat TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);
```
**Why this design?**
- Token-based auth (not JWT for simplicity)
- 30-day expiration
- Can be revoked by deleting row

#### api_keys
```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  userid TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,                    -- "iOS App"
  keyhash TEXT NOT NULL,                 -- bcrypt hash of key
  keyprefix TEXT NOT NULL,               -- First 8 chars for display
  active INTEGER DEFAULT 1,
  createdat TIMESTAMP DEFAULT NOW()
);
```
**Why this design?**
- API key hash stored (never plain text)
- Prefix shown to user for identification
- Can be revoked without changing key

---

## 5. API Documentation

### Base URLs

```
Production: https://saveit-r1gc.onrender.com/api
Local:      http://localhost:4000/api
```

### Authentication

All endpoints (except public ones) require authentication via Bearer token:

```
Authorization: Bearer <token>
```

Or via API key:

```
X-API-Key: <your-api-key>
```

### Endpoints

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Health check |
| POST | `/api/users/login` | User login |
| POST | `/api/users/register` | Register new user |
| POST | `/api/auth/send-otp` | Send OTP for registration |
| POST | `/api/auth/verify-otp` | Verify OTP and complete registration |

#### Protected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile |
| PUT | `/api/profile/password` | Change password |
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Delete account |
| GET | `/api/transactions` | List transactions (with filters) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/budgets` | List budgets |
| POST | `/api/budgets` | Create/update budget |
| GET | `/api/goals` | List goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| GET | `/api/recurring` | List recurring |
| POST | `/api/recurring` | Create recurring |
| PUT | `/api/recurring/:id` | Update recurring |
| DELETE | `/api/recurring/:id` | Delete recurring |
| GET | `/api/api-keys` | List API keys |
| POST | `/api/api-keys` | Create API key |
| DELETE | `/api/api-keys/:id` | Revoke API key |
| POST | `/api/auth/logout` | Logout (invalidate session) |

### Response Format

All responses follow this structure:

```json
// Success
{
  "accounts": [...],
  "message": "Success"
}

// Error
{
  "error": "Error message here"
}

// With data
{
  "token": "abc123...",
  "userId": "user-456"
}
```

### Field Naming

**Important:** Database columns use `snake_case`, but API responses use `camelCase`.

```javascript
// Database (snake_case)
{ userid, createdat, preferredcurrency }

// API Response (camelCase)
{ userId, createdAt, preferredCurrency }
```

This transformation happens in the API response handlers.

---

## 6. Security Implementation

### 6.1 Password Security

```javascript
// Password hashing with bcrypt (cost factor 10)
const bcrypt = require('bcryptjs')

// Hash password before storing
const hash = bcrypt.hashSync(password, 10)

// Verify password on login
const match = bcrypt.compareSync(password, storedHash)
```

**Why bcrypt?**
- Adaptive hashing (cost factor can increase)
- Built-in salt (no separate salt storage)
- Industry standard since 1999

### 6.2 Authentication Flow

```
1. User submits email/password
       ↓
2. Server checks rate limit (prevent brute force)
       ↓
3. Query user by email
       ↓
4. Compare password hash with bcrypt
       ↓
5. Generate 64-char random token (crypto.randomBytes)
       ↓
6. Store token in sessions table (30-day expiry)
       ↓
7. Return token to client
       ↓
8. Client stores in localStorage/cookie
       ↓
9. All future requests include token in header
```

### 6.3 Rate Limiting

Implemented with Upstash Redis for scalability:

```javascript
// Upstash Ratelimit - sliding window
const { Ratelimit } = require('@upstash/ratelimit')

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 minutes
})
```

**Limits:**
| Action | Limit | Window |
|--------|-------|--------|
| Login | 5 attempts | 15 minutes |
| OTP Request | 5 requests | 15 minutes |
| OTP Verification | 3 attempts | Per code |

### 6.4 CORS Configuration

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'https://planmybudget.vercel.app'
  ]
}))
```

**Why CORS matters?**
- Prevents cross-site requests from unauthorized domains
- Only configured origins can access the API
- Browser enforces this for AJAX requests

### 6.5 Input Validation

```javascript
// Password validation
if (password.length < 6) {
  return res.status(400).json({ error: 'Password must be at least 6 characters' })
}

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: 'Invalid email format' })
}
```

### 6.6 Row Level Security (RLS)

PostgreSQL RLS policies enforce data isolation at database level:

```sql
-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own accounts
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL
  USING (userid = current_user_id());
```

**Why RLS?**
- Defense in depth (API + Database security)
- Prevents accidental data exposure
- Works even if API has bugs

### 6.7 API Key Security

```javascript
// API keys are hashed before storage
const keyHash = bcrypt.hashSync(apiKey, 10)
const keyPrefix = apiKey.substring(0, 8) // "sk_live_abc12345..."

// Store hash, show prefix
INSERT INTO api_keys (id, userid, name, keyhash, keyprefix, ...)
VALUES (uuid, userId, 'iOS App', hash, prefix, ...)

// Verify on each request
const match = bcrypt.compareSync(providedKey, storedHash)
```

---

## 7. Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Top navigation bar
│   ├── Dashboard.jsx        # Main dashboard with charts
│   ├── Accounts.jsx        # Account management
│   ├── Transactions.jsx    # Transaction list
│   ├── Budgets.jsx         # Budget management
│   ├── Goals.jsx           # Savings goals
│   ├── Categories.jsx      # Category management
│   ├── Recurring.jsx       # Recurring transactions
│   ├── Settings.jsx        # User settings
│   ├── Login.jsx           # Login/Register pages
│   └── Register.jsx        # Registration with OTP
├── api.js                  # API client functions
├── theme.js                # Mantine theme configuration
├── App.jsx                 # Main app with routing
└── main.jsx                # Entry point
```

### State Management

The app uses React's built-in state with `useState` and `useEffect`. For a larger app, consider:

- **Zustand**: Lightweight state management
- **React Query**: Server state caching
- **Context API**: Global UI state (theme, auth)

### API Client Pattern

```javascript
// api.js - Centralized API handling
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token')
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API Error')
  }
  
  return response.json()
}
```

### Data Transformation

The backend returns snake_case, frontend uses camelCase:

```javascript
// Transform backend response to frontend format
const transformAccount = (account) => ({
  id: account.id,
  name: account.name,
  type: account.type,
  balance: account.balance,
  createdAt: new Date(account.createdat) // Convert string to Date
})
```

### Error Handling

```javascript
// Component-level error handling
const [error, setError] = useState(null)

const loadData = async () => {
  try {
    const data = await api('/accounts')
    setAccounts(data.accounts)
  } catch (err) {
    setError(err.message)
    if (err.message.includes('401')) {
      // Token expired, redirect to login
      localStorage.removeItem('token')
      navigate('/login')
    }
  }
}
```

---

## 8. Development Setup

### Prerequisites

- Node.js 18+ (check with `node -v`)
- npm or yarn
- Git
- PostgreSQL (local) or Supabase account
- Upstash Redis account (optional, for scalability)

### Step 1: Clone Repository

```bash
git clone https://github.com/KeyurDesai53987/PlanMyBudget.git
cd PlanMyBudget
```

### Step 2: Install Dependencies

```bash
# Root dependencies (Electron, shared)
npm install

# API dependencies
cd api && npm install

# Frontend dependencies
cd ../planmybudget-web && npm install
```

### Step 3: Set Up Database

#### Option A: Local PostgreSQL

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb planmybudget

# Set environment variable
export DATABASE_URL="postgresql://localhost:5432/planmybudget"
```

#### Option B: Supabase Cloud

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database → Connection string
4. Copy connection string
5. Set as `DATABASE_URL`

### Step 4: Set Up Redis (Optional)

1. Create account at [console.upstash.com](https://console.upstash.com)
2. Create Serverless Redis database
3. Copy REST URL and Token
4. Set environment variables

```bash
export UPSTASH_REDIS_REST_URL="https://..."
export UPSTASH_REDIS_REST_TOKEN="..."
```

### Step 5: Run the Application

```bash
# Terminal 1: Backend API
cd api
node server.js
# Runs on http://localhost:4000

# Terminal 2: Frontend (new terminal)
cd planmybudget-web
npm run dev
# Runs on http://localhost:5173
```

### Step 6: Test Login

Demo account credentials:
- Email: `demo@saveit.app`
- Password: `password`

Or register a new account with OTP verification.

---

## 9. Deployment

### Frontend (Vercel)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Select `planmybudget-web` as root

2. **Configure**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   ```
   VITE_API_URL=https://saveit-r1gc.onrender.com/api
   ```

4. **Deploy**
   - Vercel auto-deploys on push to main

### Backend (Render)

1. **Connect Repository**
   - Go to [render.com](https://render.com)
   - Create Web Service
   - Connect GitHub repo
   - Select repository

2. **Configure**
   - Root Directory: `api`
   - Build Command: (empty - no build needed)
   - Start Command: `node server.js`

3. **Environment Variables**

   Required:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

   Optional:
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=app-password
   ALLOWED_ORIGINS=https://your-domain.com,https://app.vercel.app
   ```

4. **Deploy**
   - Render auto-deploys on push to main

### Database (Supabase)

1. Create project at [supabase.com](https://supabase.com)
2. Database tables are auto-created by the API on first run
3. For RLS, run `supabase-rls.sql` in SQL Editor

### Redis (Upstash)

1. Create account at [console.upstash.com](https://console.upstash.com)
2. Create Serverless Redis database
3. Copy credentials to Render environment variables

### Desktop App (Electron)

```bash
# Build macOS app
npm run build:electron

# Output: dist/mac-arm64/PlanMyBudget.app
```

### Mobile App (React Native)

```bash
cd SaveItMobile

# Install dependencies
npm install

# Run on iOS Simulator
npx expo start --ios

# Run on Android Emulator
npx expo start --android

# Build for production
eas build
```

---

## 10. Project Structure

```
PlanMyBudget/
├── api/                          # Backend API
│   └── server.js                 # Express server (all routes here)
├── planmybudget-web/             # Frontend React app
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── api.js                # API client
│   │   ├── theme.js              # Mantine theme
│   │   ├── App.jsx               # Main app
│   │   └── main.jsx              # Entry point
│   ├── public/
│   │   ├── logo.svg              # App logo
│   │   └── favicon.ico
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── SaveItMobile/                 # React Native mobile app
├── electron.js                   # Desktop app entry
├── package.json                  # Root package.json
├── vercel.json                   # Vercel config
├── .env.example                  # Environment variables template
├── API.md                        # API documentation
├── supabase-rls.sql              # RLS policies
└── README.md                     # This file
```

---

## 11. Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Supabase connection string format
postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

#### 2. "CORS error in browser"

```javascript
// In server.js, check CORS origin includes your domain
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-domain.com']
}))
```

#### 3. "OTP not sending"

- Check EMAIL_USER and EMAIL_PASS are set
- For Gmail, use App Password (not regular password)
- Enable 2FA on Google Account → Create App Password

#### 4. "Rate limit not working"

- Ensure Upstash Redis credentials are correct
- Check environment variables are set in Render
- Redis has 10K free commands/day limit

#### 5. "Login keeps redirecting"

- Clear localStorage: `localStorage.clear()`
- Check token is being saved: `localStorage.getItem('token')`
- Verify API is running and responding

#### 6. "Charts not showing"

- Check browser console for errors
- Ensure data exists in database
- Check date format matches API expectations

### Debug Mode

Add logging to API routes:

```javascript
app.post('/api/endpoint', async (req, res) => {
  console.log('Request body:', req.body)
  // ... handler
  console.log('Response:', result)
})
```

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | No | Redis URL (for scalability) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis token |
| `EMAIL_USER` | No | Gmail for sending OTP |
| `EMAIL_PASS` | No | Gmail app password |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the PlanMyBudget Team**

For questions or support, open an issue on GitHub.

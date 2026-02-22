# SaveIt - Personal Finance Tracker

A full-stack personal budgeting and financial planning web application built with React, Express, and SQLite.

## Features

- **Dashboard** - Overview of your financial health with balance, income, expenses, and goals progress
- **Accounts** - Track multiple bank accounts (checking, savings, credit, investments)
- **Transactions** - Record income and expenses with quick-add and detailed entry forms
- **Budgets** - Set monthly budget limits by category
- **Goals** - Create savings goals and track progress

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| UI Library | Mantine UI |
| Icons | Tabler Icons |
| Backend | Express.js |
| Database | SQLite (easily upgradeable to PostgreSQL) |
| Authentication | Token-based sessions |

## Prerequisites

- Node.js 18+
- npm or yarn

## Quick Start

### 1. Clone and Install

```bash
cd SaveIt
cd api && npm install
cd ../saveit-web && npm install
```

### 2. Start the Backend

```bash
cd api
npm start
```

The API server runs on **http://localhost:4000**

### 3. Start the Frontend (Development)

```bash
cd saveit-web
npm run dev
```

The app runs on **http://localhost:5173**

### 4. Login

Use the demo account:
- **Email:** demo@saveit.app
- **Password:** password

## Production Build

### Build the Frontend

```bash
cd saveit-web
npm run build
```

### Run in Production Mode

The API serves the built frontend automatically:

```bash
cd api
npm start
```

Access at **http://localhost:4000**

## Project Structure

```
SaveIt/
├── api/
│   ├── server.js          # Express API server
│   ├── saveit.db         # SQLite database (created on first run)
│   └── package.json
├── saveit-web/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── api.js        # API client
│   │   ├── main.jsx      # App entry point
│   │   └── index.css     # Global styles
│   ├── dist/             # Production build
│   └── package.json
├── SaveItMobile/          # Expo React Native app
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/users/register | Register new user |
| POST | /api/users/login | Login |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/accounts | List user accounts |
| POST | /api/accounts | Create account |
| PUT | /api/accounts/:id | Update account |
| DELETE | /api/accounts/:id | Delete account |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create transaction |
| PUT | /api/transactions/:id | Update transaction |
| DELETE | /api/transactions/:id | Delete transaction |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/budgets | List budgets |
| POST | /api/budgets | Create budget |
| PUT | /api/budgets/:id | Update budget |
| DELETE | /api/budgets/:id | Delete budget |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/goals | List goals |
| POST | /api/goals | Create goal |
| PUT | /api/goals/:id | Update goal |
| DELETE | /api/goals/:id | Delete goal |

## Database Schema

### Users
- id (TEXT, PRIMARY KEY)
- email (TEXT, UNIQUE)
- passwordHash (TEXT)
- preferredCurrency (TEXT)
- locale (TEXT)
- createdAt (TEXT)

### Accounts
- id (TEXT, PRIMARY KEY)
- userId (TEXT, FOREIGN KEY)
- name (TEXT)
- type (TEXT) - checking, savings, credit, investment
- currency (TEXT)
- balance (REAL)
- createdAt (TEXT)

### Transactions
- id (TEXT, PRIMARY KEY)
- accountId (TEXT, FOREIGN KEY)
- categoryId (TEXT, FOREIGN KEY)
- date (TEXT)
- amount (REAL)
- type (TEXT) - credit, debit
- description (TEXT)
- createdAt (TEXT)

### Budgets
- id (TEXT, PRIMARY KEY)
- userId (TEXT, FOREIGN KEY)
- month (INTEGER)
- year (INTEGER)
- currency (TEXT)
- lines (TEXT, JSON array)
- createdAt (TEXT)

### Goals
- id (TEXT, PRIMARY KEY)
- userId (TEXT, FOREIGN KEY)
- name (TEXT)
- targetAmount (REAL)
- currentAmount (REAL)
- dueDate (TEXT)
- status (TEXT) - active, completed
- createdAt (TEXT)

## Upgrading to PostgreSQL

The current setup uses SQLite for simplicity. To upgrade to PostgreSQL:

1. Install PostgreSQL
2. Install pg package: `npm install pg`
3. Replace `better-sqlite3` with `pg`
4. Update database connection in server.js

Example PostgreSQL connection:

```javascript
const { Pool } = require('pg')
const pool = new Pool({
  user: 'youruser',
  host: 'localhost',
  database: 'saveit',
  password: 'yourpassword',
  port: 5432,
})
```

## Mobile App

The project also includes an Expo React Native mobile app in `SaveItMobile/`.

To run:
```bash
cd SaveItMobile
npx expo start
```

## Changelog

### Latest Changes (2026-02-21)
- Switched from JSON file storage to SQLite database
- Added bcrypt password hashing for security
- Integrated Mantine UI for professional design
- Added Tabler Icons
- Built production-ready web app

### Original Features
- Dashboard with financial overview
- Account management (checking, savings, credit, investment)
- Transaction tracking with quick-add
- Monthly budgets by category
- Savings goals with progress tracking

## License

MIT

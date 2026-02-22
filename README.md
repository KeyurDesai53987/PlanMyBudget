# SaveIt - Personal Finance Tracker

A personal finance web app built with React, Mantine UI, and PostgreSQL.

## Features

- Dashboard with charts (Income vs Expenses, Last 7 Days)
- Accounts management (CRUD)
- Transactions/Activity with filters, pagination, search
- Budgets with alerts and expandable transactions
- Goals with progress tracking
- Recurring transactions
- Categories management
- Settings (Profile, Password, About)
- Dark mode toggle
- Export to CSV

## Tech Stack

- **Frontend:** React, Mantine UI, Recharts, Vite
- **Backend:** Node.js, Express, PostgreSQL
- **Database:** PostgreSQL (or SQLite for local development)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16+

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/SaveIt.git
cd SaveIt
```

2. **Install dependencies:**
```bash
# Install backend dependencies
cd api && npm install

# Install frontend dependencies
cd ../saveit-web && npm install
```

3. **Start PostgreSQL:**
```bash
brew services start postgresql@16
```

4. **Create database:**
```bash
createdb saveit
```

### Running the App

**Terminal 1 - Backend:**
```bash
cd api
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd saveit-web
npm run dev
```

Open http://localhost:5173 in your browser.

### Login

- Email: demo@saveit.app
- Password: password

## Environment Variables

For production, set the database URL:
```bash
export DATABASE_URL="postgresql://user:password@host:5432/saveit"
```

## Deployment

### Backend (Render/Fly.io)
1. Set `DATABASE_URL` environment variable to your PostgreSQL connection string
2. Deploy the `api` folder

### Frontend (Vercel/Netlify)
1. Build the frontend: `cd saveit-web && npm run build`
2. Deploy the `dist` folder

## License

MIT

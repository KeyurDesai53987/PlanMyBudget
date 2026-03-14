# SaveIt - Personal Finance Tracker

A personal finance web app built with React, Mantine UI, and PostgreSQL.

## Live Demo

- **Frontend:** https://saveit.vercel.app
- **Backend API:** https://saveit-r1gc.onrender.com
- **Database:** Supabase (cloud)

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
- macOS Desktop App

## Tech Stack

- **Frontend:** React, Mantine UI, Recharts, Vite
- **Backend:** Node.js, Express, PostgreSQL
- **Database:** PostgreSQL (Supabase)
- **Deployment:** Vercel (frontend), Render (backend)
- **Desktop:** Electron

## Getting Started

### Live App

Simply visit: https://saveit.vercel.app

Login with your credentials to start tracking your finances.

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/KeyurDesai53987/SaveIt.git
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

5. **Run the app:**

Terminal 1 - Backend:
```bash
cd api
node server.js
```

Terminal 2 - Frontend:
```bash
cd saveit-web
npm run dev
```

Open http://localhost:5173

### Login

- Email: demo@saveit.app
- Password: password

## Environment Variables

For production, set the database URL:
```bash
export DATABASE_URL="postgresql://user:password@host:5432/postgres"
```

## Deployment

### Frontend (Vercel)

The frontend is deployed at https://saveit.vercel.app

To redeploy:
1. Push changes to GitHub
2. Vercel automatically deploys

### Backend (Render)

The backend is deployed at https://saveit-r1gc.onrender.com

To redeploy:
1. Push changes to GitHub
2. Render automatically deploys

### Desktop App (macOS)

Download from `dist/mac-arm64/SaveIt.app`

Requires the backend to be running or set `DATABASE_URL` to your Supabase connection string.

## License

MIT

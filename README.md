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
- macOS Desktop App

## Tech Stack

- **Frontend:** React, Mantine UI, Recharts, Vite
- **Backend:** Node.js, Express, PostgreSQL
- **Database:** PostgreSQL (Supabase or local)
- **Desktop:** Electron

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16+ (or use Supabase)

### Option 1: Local Development

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

### Option 2: Use Supabase (Cloud Database)

1. Create a project at https://supabase.com
2. Get your connection string from Settings → Database
3. Update the connection string in `api/server.js` or set `DATABASE_URL` environment variable

### Option 3: Desktop App (macOS)

Download and run the app from `dist/mac-arm64/SaveIt.app`

Requires PostgreSQL running locally or set `DATABASE_URL` to your Supabase connection string.

### Login

- Email: demo@saveit.app
- Password: password

## Deployment

### Frontend (Vercel)

1. Go to https://vercel.com
2. Import your GitHub repo (KeyurDesai53987/SaveIt)
3. Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy

### Backend (Render)

1. Go to https://render.com
2. Create New Web Service
3. Connect your GitHub repo
4. Settings:
   - Build Command: (leave empty)
   - Start Command: `node api/server.js`
5. Add Environment Variable:
   - `DATABASE_URL`: Your Supabase connection string

## License

MIT

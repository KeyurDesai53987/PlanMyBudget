-- Row Level Security (RLS) Policies for PlanMyBudget
-- Run these commands in the Supabase SQL Editor to enable RLS

-- Create the helper function FIRST (used by policies)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT coalesce(
      nullif(current_setting('request.jwt.claims', true)::json->>'user_id', ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean reinstall)
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can manage own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
DROP POLICY IF EXISTS "Users can manage own recurring" ON recurring;
DROP POLICY IF EXISTS "Users can manage own api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can manage own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- ACCOUNTS: Users can only access their own accounts
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL
  USING (userid = current_user_id());

-- CATEGORIES: Users can only access their own categories
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL
  USING (userid = current_user_id());

-- TRANSACTIONS: Users can only access transactions from their own accounts
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL
  USING (
    accountid IN (
      SELECT id FROM accounts WHERE userid = current_user_id()
    )
  );

-- BUDGETS: Users can only access their own budgets
CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL
  USING (userid = current_user_id());

-- GOALS: Users can only access their own goals
CREATE POLICY "Users can manage own goals" ON goals
  FOR ALL
  USING (userid = current_user_id());

-- RECURRING: Users can only access their own recurring transactions
CREATE POLICY "Users can manage own recurring" ON recurring
  FOR ALL
  USING (userid = current_user_id());

-- API_KEYS: Users can only access their own API keys
CREATE POLICY "Users can manage own api_keys" ON api_keys
  FOR ALL
  USING (userid = current_user_id());

-- SESSIONS: Users can only manage their own sessions (for token management)
-- Note: PostgREST should NOT expose sessions table directly via API
-- This is just a safety measure. Better to manage sessions through API endpoints only.
CREATE POLICY "Users can manage own sessions" ON sessions
  FOR ALL
  USING (userid = current_user_id());

-- USERS: Users can only view their own profile (hide email/password from others)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = current_user_id());

-- Disable direct API access to sessions table (sessions should be managed via API endpoints)
-- Note: PostgREST should have sessions table excluded from API exposure
-- To exclude from PostgREST, add to config: db-schema = "public,storage,extensions"
-- And ensure sessions is not in the exposed schemas, or use anon key restrictions

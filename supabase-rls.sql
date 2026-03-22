-- Row Level Security (RLS) Policies for PlanMyBudget
-- Run these commands in the Supabase SQL Editor to enable RLS

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean reinstall)
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can manage own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
DROP POLICY IF EXISTS "Users can manage own recurring" ON recurring;
DROP POLICY IF EXISTS "Users can manage own api_keys" ON api_keys;

-- ACCOUNTS: Users can only access their own accounts
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL
  USING (userid = current_user_id());

-- CATEGORIES: Users can only access their own categories
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL
  USING (userid = current_user_id());

-- TRANSACTIONS: Users can only access transactions from their own accounts
-- This requires a subquery to check account ownership through the accounts table
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

-- Note: The current_user_id() function above is a placeholder.
-- In Supabase, you need to create this function that extracts the user ID
-- from the JWT token's 'sub' claim or a custom claim.

-- Create the helper function if it doesn't exist
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

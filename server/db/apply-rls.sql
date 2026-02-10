-- SQL Script to enable Row Level Security (RLS) on the database tables

DO $$ 
BEGIN
    -- Enable RLS on the tasks table
    ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

    -- Create policy for "tasks" table
    -- This policy ensures that users can only interact with tasks where user_id matches app.current_user_id
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tasks_user_isolation_policy') THEN
        CREATE POLICY tasks_user_isolation_policy ON "tasks"
        FOR ALL
        USING (user_id = current_setting('app.current_user_id', true))
        WITH CHECK (user_id = current_setting('app.current_user_id', true));
    END IF;

    -- Note: We are not enabling RLS on 'user', 'session', or 'account' tables 
    -- to avoid interfering with Better Auth's internal operations during authentication.
END $$;

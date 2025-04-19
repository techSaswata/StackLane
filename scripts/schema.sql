-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Automatically generates a unique UUID
  repo_full_name TEXT NOT NULL,                 -- Repository name
  user_id UUID NOT NULL,                        -- User ID as UUID
  user_email TEXT NOT NULL,                     -- User email
  user_avatar TEXT,                             -- User avatar URL
  content TEXT NOT NULL,                        -- Message content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Timestamp of message creation
  
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_repo_full_name ON public.messages(repo_full_name);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all messages
CREATE POLICY "Allow authenticated users to read all messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow users to insert their own messages
CREATE POLICY "Allow users to insert their own messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::uuid);

-- Add a policy to allow users to read messages for a specific repo
CREATE POLICY "Allow users to read messages for their repo"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (repo_full_name = current_setting('request.jwt.claim.repo_full_name'));

-- Add a policy to allow users to insert messages for their repo
CREATE POLICY "Allow users to insert messages for their repo"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    repo_full_name = current_setting('request.jwt.claim.repo_full_name')
    AND user_id = auth.uid()::UUID
  );

-- Create stored procedure for creating the messages table
CREATE OR REPLACE FUNCTION create_messages_table()
RETURNS void AS $$
BEGIN
  -- Create messages table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_full_name TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user
      FOREIGN KEY(user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE
  );

  -- Create index for faster queries
  CREATE INDEX IF NOT EXISTS idx_messages_repo_full_name ON public.messages(repo_full_name);

  -- Enable Row Level Security
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

  -- Create policies
  PERFORM create_policies();
END;
$$ LANGUAGE plpgsql;

-- Create stored procedure for creating the stored procedure
CREATE OR REPLACE FUNCTION create_stored_procedure()
RETURNS void AS $$
BEGIN
  -- This function is just a placeholder to check if the stored procedure exists
  RAISE NOTICE 'Stored procedure exists';
END;
$$ LANGUAGE plpgsql;

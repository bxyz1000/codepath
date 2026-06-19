-- Enable UUID extension if not enabled (useful for user_progress ID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create tracks table
-- We use TEXT for the ID to match the string identifiers in the frontend (e.g. 'html', 'css')
CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    track_type TEXT,
    source_repo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create topics table
-- We use TEXT for the ID to match the string identifiers in the frontend (e.g. 'html_intro', 'css_selectors')
-- and reference the tracks table
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    subtopics JSONB DEFAULT '[]'::jsonb NOT NULL,
    resources JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create user_progress table
-- Using UUID for unique progress records
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_topic UNIQUE (username, topic_id)
);

-- Optional: Create function and trigger to automatically update updated_at on user_progress
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_progress_modtime
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

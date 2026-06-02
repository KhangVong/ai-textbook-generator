-- Run this in the Supabase SQL Editor to create the projects table

CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    outline_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- For MVP purposes, we disable RLS (Row Level Security) so the anon key can read/write.
-- In production, you would enable RLS and use Clerk JWT templates.
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

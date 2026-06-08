-- Migration: Create generation_jobs table for background task polling

CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT, -- Clerk user ID
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RESEARCHING, PROFILING, DRAFTING, VERIFYING, COMPLETED, FAILED
    blueprint JSONB,
    markdown_result TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- For a personal project without a Supabase Service Role key in the backend,
-- it's easiest to temporarily disable RLS on this table so the background API can update it via the Anon key.
ALTER TABLE public.generation_jobs DISABLE ROW LEVEL SECURITY;

-- If you want to enable RLS later, you can run:
-- ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public insert" ON public.generation_jobs FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public select" ON public.generation_jobs FOR SELECT USING (true);
-- CREATE POLICY "Allow public update" ON public.generation_jobs FOR UPDATE USING (true);

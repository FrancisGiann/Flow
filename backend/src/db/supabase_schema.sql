-- ==============================================================================
-- FLOW: Supabase Database Schema
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- to initialize the database tables for Flow typing telemetry and persistence.
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
-- Stores user profiles or anonymous session owners
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default prototype guest user for unauthenticated / anonymous sessions
INSERT INTO public.users (id, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', now())
ON CONFLICT (id) DO NOTHING;

-- 2. SESSIONS TABLE
-- Stores completed typing passages, speeds, and biometrics
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  passage_id TEXT,
  passage_title TEXT,
  wpm NUMERIC NOT NULL,
  raw_wpm NUMERIC,
  accuracy NUMERIC NOT NULL,
  elapsed_time_ms INTEGER DEFAULT 0,
  total_chars INTEGER DEFAULT 0,
  correct_chars INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  mode TEXT DEFAULT 'passage',
  passage_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user history lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_timestamp 
ON public.sessions (user_id, timestamp DESC);

-- 3. WEAKNESSES TABLE
-- Stores aggregate keystroke, bigram, and trigram weakness metrics
CREATE TABLE IF NOT EXISTS public.weaknesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  token_type TEXT DEFAULT 'char',
  total_attempts INTEGER DEFAULT 1,
  error_count INTEGER DEFAULT 0,
  error_rate NUMERIC DEFAULT 0,
  avg_latency NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_pattern UNIQUE (user_id, pattern)
);

-- Index for prioritized weakness drill generation
CREATE INDEX IF NOT EXISTS idx_weaknesses_user_error_rate 
ON public.weaknesses (user_id, error_rate DESC, avg_latency DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enables public/anonymous access for prototype mode. 
-- You can tighten these policies when implementing Supabase Auth.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weaknesses ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Allow public read access to users" 
ON public.users FOR SELECT USING (true);

CREATE POLICY "Allow public insert to users" 
ON public.users FOR INSERT WITH CHECK (true);

-- Sessions policies
CREATE POLICY "Allow public read access to sessions" 
ON public.sessions FOR SELECT USING (true);

CREATE POLICY "Allow public insert to sessions" 
ON public.sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete own sessions" 
ON public.sessions FOR DELETE USING (true);

-- Weaknesses policies
CREATE POLICY "Allow public read access to weaknesses" 
ON public.weaknesses FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update to weaknesses" 
ON public.weaknesses FOR ALL USING (true);

-- ==============================================================================
-- Schema setup complete.
-- ==============================================================================

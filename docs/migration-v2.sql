-- Assessment v2 migration: add season confidence fields
-- Run this against your Supabase database

ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS season_confidence TEXT DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS season_presumed TEXT,
  ADD COLUMN IF NOT EXISTS season_self_select TEXT,
  ADD COLUMN IF NOT EXISTS season_confirmation_score NUMERIC(4,2);

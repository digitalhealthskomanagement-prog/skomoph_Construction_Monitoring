-- Add budget_source to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_source text;

-- Add completion_notes column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;

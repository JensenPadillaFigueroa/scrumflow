-- Add assigned_to_user_id column to quick_notes table
ALTER TABLE quick_notes ADD COLUMN assigned_to_user_id VARCHAR(255) NULL;

-- Add index for better query performance
CREATE INDEX idx_quick_notes_assigned_to_user_id ON quick_notes(assigned_to_user_id);

-- Add focus_today, focus_date and focus_user_id columns to tasks table
ALTER TABLE tasks 
ADD COLUMN focus_today TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Mark task as focus for today',
ADD COLUMN focus_date DATE NULL 
COMMENT 'Date when task was marked as focus',
ADD COLUMN focus_user_id VARCHAR(255) NULL
COMMENT 'User ID who marked this task as focus';

-- Add index for better query performance
CREATE INDEX idx_tasks_focus_today ON tasks(focus_today, focus_date, focus_user_id);
CREATE INDEX idx_tasks_status_assigned ON tasks(status, assigned_to);

-- Add schedule_enabled column to projects table
ALTER TABLE projects 
ADD COLUMN schedule_enabled TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Enable/disable task schedule calendar for this project';

-- Update existing projects to have schedule enabled by default (optional)
-- UPDATE projects SET schedule_enabled = 1;

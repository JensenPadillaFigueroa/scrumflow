-- Create scheduled_tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id CHAR(36) NOT NULL COLLATE 'utf8mb4_general_ci',
  project_id CHAR(36) NOT NULL COLLATE 'utf8mb4_general_ci',
  title VARCHAR(255) NOT NULL COLLATE 'utf8mb4_general_ci',
  description TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
  due_date DATE NOT NULL,
  assigned_to CHAR(36) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
  importance ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' COLLATE 'utf8mb4_general_ci',
  status ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo' COLLATE 'utf8mb4_general_ci',
  created_by CHAR(36) NOT NULL COLLATE 'utf8mb4_general_ci',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id) USING BTREE,
  INDEX idx_project_id (project_id) USING BTREE,
  INDEX idx_due_date (due_date) USING BTREE,
  INDEX idx_assigned_to (assigned_to) USING BTREE,
  CONSTRAINT fk_scheduled_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheduled_tasks_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_scheduled_tasks_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci'
ENGINE=InnoDB
;

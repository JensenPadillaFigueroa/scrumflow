-- Agregar campos de auditoría para rastrear creación por admin
-- Ejecutar estos comandos en la base de datos MySQL

-- Tabla projects
ALTER TABLE projects 
ADD COLUMN created_by_admin_id VARCHAR(36) NULL COMMENT 'ID del admin que creó este proyecto (si aplica)',
ADD COLUMN created_by_admin_username VARCHAR(255) NULL COMMENT 'Username del admin que creó este proyecto (si aplica)';

-- Tabla tasks
ALTER TABLE tasks 
ADD COLUMN created_by_admin_id VARCHAR(36) NULL COMMENT 'ID del admin que creó esta tarea (si aplica)',
ADD COLUMN created_by_admin_username VARCHAR(255) NULL COMMENT 'Username del admin que creó esta tarea (si aplica)';

-- Tabla wishlist (no wishlist_items)
ALTER TABLE wishlist 
ADD COLUMN created_by_admin_id VARCHAR(36) NULL COMMENT 'ID del admin que creó este item (si aplica)',
ADD COLUMN created_by_admin_username VARCHAR(255) NULL COMMENT 'Username del admin que creó este item (si aplica)';

-- Tabla reminders
ALTER TABLE reminders 
ADD COLUMN created_by_admin_id VARCHAR(36) NULL COMMENT 'ID del admin que creó este recordatorio (si aplica)',
ADD COLUMN created_by_admin_username VARCHAR(255) NULL COMMENT 'Username del admin que creó este recordatorio (si aplica)';

-- Tabla quick_notes
ALTER TABLE quick_notes 
ADD COLUMN created_by_admin_id VARCHAR(36) NULL COMMENT 'ID del admin que creó esta nota (si aplica)',
ADD COLUMN created_by_admin_username VARCHAR(255) NULL COMMENT 'Username del admin que creó esta nota (si aplica)';

-- Verificar los cambios
DESCRIBE projects;
DESCRIBE tasks;
DESCRIBE wishlist;
DESCRIBE reminders;
DESCRIBE quick_notes;

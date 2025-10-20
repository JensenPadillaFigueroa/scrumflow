-- Agregar columna assigned_to a la tabla tasks
ALTER TABLE tasks 
ADD COLUMN assigned_to VARCHAR(36) NULL;

-- Agregar foreign key constraint
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_assigned_to 
  FOREIGN KEY (assigned_to) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Crear índice para mejorar performance
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

-- Opcional: Asignar tareas existentes al owner del proyecto
-- Esto asegura que las tareas existentes tengan un asignado
UPDATE tasks t
INNER JOIN projects p ON t.projectId = p.id
SET t.assigned_to = p.userId
WHERE t.assigned_to IS NULL;

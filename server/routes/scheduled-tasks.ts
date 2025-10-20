import { Router } from "express";
import type { Pool } from "mysql2/promise";
import { randomUUID } from "crypto";

const router = Router();

// Helper to get MySQL pool from app
function getPool(req: any): Pool {
  return req.app.get("storage").pool;
}

// Get all scheduled tasks for a project
router.get("/project/:projectId", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId } = req.params;
    const pool = getPool(req);

    // Verify user has access to the project
    const [projectRows] = await pool.query(
      `SELECT p.*, pm.role 
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.projectId AND pm.userId = ?
       WHERE p.id = ? AND (p.userId = ? OR pm.userId = ?)`,
      [userId, projectId, userId, userId]
    );

    if (!Array.isArray(projectRows) || projectRows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get scheduled tasks with user information
    const [tasks] = await pool.query(
      `SELECT 
        st.*,
        u.username as assigned_to_username,
        u.full_name as assigned_to_full_name,
        creator.username as created_by_username
       FROM scheduled_tasks st
       LEFT JOIN users u ON st.assigned_to = u.id
       LEFT JOIN users creator ON st.created_by = creator.id
       WHERE st.project_id = ?
       ORDER BY st.due_date ASC`,
      [projectId]
    );

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching scheduled tasks:", error);
    res.status(500).json({ error: "Failed to fetch scheduled tasks" });
  }
});

// Create a new scheduled task
router.post("/", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId, title, description, dueDate, assignedTo, importance } = req.body;

    if (!projectId || !title || !dueDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pool = getPool(req);

    // Verify user has access to the project
    const [projectRows] = await pool.query(
      `SELECT p.*, pm.role 
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.projectId AND pm.userId = ?
       WHERE p.id = ? AND (p.userId = ? OR pm.userId = ?)`,
      [userId, projectId, userId, userId]
    );

    if (!Array.isArray(projectRows) || projectRows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    const taskId = randomUUID();
    await pool.query(
      `INSERT INTO scheduled_tasks 
       (id, project_id, title, description, due_date, assigned_to, importance, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, projectId, title, description || null, dueDate, assignedTo || null, importance || 'medium', userId]
    );

    // Get the created task with user information
    const [tasks] = await pool.query(
      `SELECT 
        st.*,
        u.username as assigned_to_username,
        u.full_name as assigned_to_full_name,
        creator.username as created_by_username
       FROM scheduled_tasks st
       LEFT JOIN users u ON st.assigned_to = u.id
       LEFT JOIN users creator ON st.created_by = creator.id
       WHERE st.id = ?`,
      [taskId]
    );

    res.status(201).json(Array.isArray(tasks) ? tasks[0] : tasks);
  } catch (error) {
    console.error("Error creating scheduled task:", error);
    res.status(500).json({ error: "Failed to create scheduled task" });
  }
});

// Update a scheduled task
router.put("/:id", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { title, description, dueDate, assignedTo, importance, status } = req.body;

    const pool = getPool(req);

    // Verify user has access to the task's project
    const [taskRows] = await pool.query(
      `SELECT st.*, p.userId as project_owner_id, pm.role
       FROM scheduled_tasks st
       JOIN projects p ON st.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.projectId AND pm.userId = ?
       WHERE st.id = ? AND (p.userId = ? OR pm.userId = ?)`,
      [userId, id, userId, userId]
    );

    if (!Array.isArray(taskRows) || taskRows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (dueDate !== undefined) {
      updates.push("due_date = ?");
      values.push(dueDate);
    }
    if (assignedTo !== undefined) {
      updates.push("assigned_to = ?");
      values.push(assignedTo);
    }
    if (importance !== undefined) {
      updates.push("importance = ?");
      values.push(importance);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);

    await pool.query(
      `UPDATE scheduled_tasks SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Get the updated task with user information
    const [tasks] = await pool.query(
      `SELECT 
        st.*,
        u.username as assigned_to_username,
        u.full_name as assigned_to_full_name,
        creator.username as created_by_username
       FROM scheduled_tasks st
       LEFT JOIN users u ON st.assigned_to = u.id
       LEFT JOIN users creator ON st.created_by = creator.id
       WHERE st.id = ?`,
      [id]
    );

    res.json(Array.isArray(tasks) ? tasks[0] : tasks);
  } catch (error) {
    console.error("Error updating scheduled task:", error);
    res.status(500).json({ error: "Failed to update scheduled task" });
  }
});

// Delete a scheduled task
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const pool = getPool(req);

    // Verify user has access to the task's project
    const [taskRows] = await pool.query(
      `SELECT st.*, p.userId as project_owner_id, pm.role
       FROM scheduled_tasks st
       JOIN projects p ON st.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.projectId AND pm.userId = ?
       WHERE st.id = ? AND (p.userId = ? OR pm.userId = ?)`,
      [userId, id, userId, userId]
    );

    if (!Array.isArray(taskRows) || taskRows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query("DELETE FROM scheduled_tasks WHERE id = ?", [id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled task:", error);
    res.status(500).json({ error: "Failed to delete scheduled task" });
  }
});

export default router;

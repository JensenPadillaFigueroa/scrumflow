import { Router } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "crypto";

const router = Router();

interface NotificationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: string | null;
  created_at: Date;
}

// Helper to get MySQL pool from app
function getPool(req: any): Pool {
  return req.app.get("storage").pool;
}

// Get all notifications for current user
router.get("/", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pool = getPool(req);
    const [rows] = await pool.query<NotificationRow[]>(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    const unreadCount = rows.filter((n: NotificationRow) => !n.read).length;

    // Parse metadata JSON strings and convert to camelCase
    const parsedNotifications = rows.map((n: NotificationRow) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
      createdAt: n.created_at
    }));

    res.json({
      notifications: parsedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const pool = getPool(req);

    await pool.query(
      "UPDATE notifications SET `read` = TRUE WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Mark all notifications as read
router.put("/read-all", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pool = getPool(req);
    await pool.query(
      "UPDATE notifications SET `read` = TRUE WHERE user_id = ?",
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// Delete all notifications
router.delete("/", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pool = getPool(req);
    const [result] = await pool.query(
      "DELETE FROM notifications WHERE user_id = ?",
      [userId]
    );

    res.json({ success: true, deletedCount: (result as any).affectedRows });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    res.status(500).json({ error: "Failed to delete notifications" });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const pool = getPool(req);

    await pool.query(
      "DELETE FROM notifications WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Create notification (internal use - for other routes to call)
export async function createNotification(
  pool: Pool,
  data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }
) {
  try {
    const id = randomUUID();
    await pool.query(
      "INSERT INTO notifications (id, user_id, type, title, message, metadata, `read`, created_at) VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())",
      [
        id,
        data.userId,
        data.type,
        data.title,
        data.message,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export default router;

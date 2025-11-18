import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { IStorage } from "../storage";

const sendMessageSchema = z.object({
  projectId: z.string(),
  message: z.string().min(1).max(5000),
});

const updateMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

export function registerChatRoutes(app: Express, storage: IStorage) {
  // Get messages for a project
  app.get("/api/chat/:projectId", async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify user has access to project (is owner or member)
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const members = await storage.getProjectMembers(projectId);
      const isMember = members.some(m => m.userId === req.session.user!.id);
      const isOwner = project.userId === req.session.user!.id;

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await storage.getProjectMessages(projectId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post("/api/chat/:projectId", async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const parsed = sendMessageSchema.parse({ ...req.body, projectId });

      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify user has access to project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const members = await storage.getProjectMembers(projectId);
      const isMember = members.some(m => m.userId === req.session.user!.id);
      const isOwner = project.userId === req.session.user!.id;

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: "Access denied" });
      }

      const message = await storage.createProjectMessage({
        projectId: parsed.projectId,
        message: parsed.message,
        userId: req.session.user.id,
      });

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Update a message
  app.put("/api/chat/message/:messageId", async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const parsed = updateMessageSchema.parse(req.body);

      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get the message to verify ownership
      const messages = await storage.getProjectMessages("", 1000); // Get all to find this one
      const message = messages.find(m => m.id === messageId);

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.userId !== req.session.user.id) {
        return res.status(403).json({ error: "Can only edit your own messages" });
      }

      const updated = await storage.updateProjectMessage(messageId, parsed.message);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating message:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Delete a message
  app.delete("/api/chat/message/:messageId", async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;

      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get the message to verify ownership
      const messages = await storage.getProjectMessages("", 1000);
      const message = messages.find(m => m.id === messageId);

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.userId !== req.session.user.id) {
        return res.status(403).json({ error: "Can only delete your own messages" });
      }

      const deleted = await storage.deleteProjectMessage(messageId);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Message not found" });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });
}

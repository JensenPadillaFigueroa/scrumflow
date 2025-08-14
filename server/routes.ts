import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTaskSchema, insertWishlistItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const { projectId } = req.query;
      let tasks;
      if (projectId) {
        tasks = await storage.getTasksByProject(projectId as string);
      } else {
        tasks = await storage.getTasks();
      }
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, validatedData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const success = await storage.deleteTask(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Wishlist routes
  app.get("/api/wishlist", async (req, res) => {
    try {
      const items = await storage.getWishlistItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wishlist items" });
    }
  });

  app.post("/api/wishlist", async (req, res) => {
    try {
      const validatedData = insertWishlistItemSchema.parse(req.body);
      const item = await storage.createWishlistItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid wishlist item data" });
    }
  });

  app.delete("/api/wishlist/:id", async (req, res) => {
    try {
      const success = await storage.deleteWishlistItem(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  });

  app.post("/api/wishlist/:id/promote", async (req, res) => {
    try {
      const project = await storage.promoteWishlistItemToProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to promote wishlist item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

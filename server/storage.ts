import { type Project, type InsertProject, type Task, type InsertTask, type WishlistItem, type InsertWishlistItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Wishlist
  getWishlistItems(): Promise<WishlistItem[]>;
  getWishlistItem(id: string): Promise<WishlistItem | undefined>;
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  updateWishlistItem(id: string, updates: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined>;
  deleteWishlistItem(id: string): Promise<boolean>;
  promoteWishlistItemToProject(id: string): Promise<Project | undefined>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private tasks: Map<string, Task>;
  private wishlistItems: Map<string, WishlistItem>;

  constructor() {
    this.projects = new Map();
    this.tasks = new Map();
    this.wishlistItems = new Map();
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;

    const updated: Project = { ...existing, ...updates };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const deleted = this.projects.delete(id);
    // Also delete associated tasks
    const tasksToDelete: string[] = [];
    this.tasks.forEach((task, taskId) => {
      if (task.projectId === id) {
        tasksToDelete.push(taskId);
      }
    });
    tasksToDelete.forEach(taskId => this.tasks.delete(taskId));
    return deleted;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      status: insertTask.status || "todo",
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    const updated: Task = { ...existing, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Wishlist
  async getWishlistItems(): Promise<WishlistItem[]> {
    return Array.from(this.wishlistItems.values());
  }

  async getWishlistItem(id: string): Promise<WishlistItem | undefined> {
    return this.wishlistItems.get(id);
  }

  async createWishlistItem(insertItem: InsertWishlistItem): Promise<WishlistItem> {
    const id = randomUUID();
    const item: WishlistItem = {
      ...insertItem,
      id,
      createdAt: new Date(),
    };
    this.wishlistItems.set(id, item);
    return item;
  }

  async updateWishlistItem(id: string, updates: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined> {
    const existing = this.wishlistItems.get(id);
    if (!existing) return undefined;

    const updated: WishlistItem = { ...existing, ...updates };
    this.wishlistItems.set(id, updated);
    return updated;
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }

  async promoteWishlistItemToProject(id: string): Promise<Project | undefined> {
    const item = this.wishlistItems.get(id);
    if (!item) return undefined;

    const project = await this.createProject({
      name: item.title,
      description: item.description,
      category: item.category,
    });

    this.wishlistItems.delete(id);
    return project;
  }
}

export const storage = new MemStorage();

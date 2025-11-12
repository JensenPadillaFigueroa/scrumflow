import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  userId: varchar("user_id").notNull(), // Owner del proyecto
  scheduleEnabled: boolean("schedule_enabled").notNull().default(false), // Enable task schedule calendar
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  status: text("status").notNull().default("wishlist"), // wishlist, todo, in-process, finished
  assignedTo: varchar("assigned_to"), // Usuario asignado a la tarea
  orderIndex: integer("order_index"), // Posición dentro de la columna (status) por proyecto
  dueDate: timestamp("due_date"), // Fecha de vencimiento para agenda
  importance: text("importance").default("medium"), // low, medium, high, urgent
  focusToday: boolean("focus_today").notNull().default(false), // Mark as focus for today
  focusDate: timestamp("focus_date"), // Date when marked as focus
  focusUserId: varchar("focus_user_id"), // User who marked as focus
  completionNotes: text("completion_notes"), // Notes added when task is completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  completed: boolean("completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quickNotes = pgTable("quick_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  noteType: text("note_type").notNull().default("dashboard"), // dashboard, project
  color: text("color").notNull().default("yellow"), // yellow, blue, green, pink, purple
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  userId: varchar("user_id"), // Usuario que creó la nota
  assignedToUserId: varchar("assigned_to_user_id"), // Usuario específico al que se asigna la nota
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Usuario que recibe la notificación
  type: text("type").notNull(), // task_assigned, task_completed, project_invite, mention, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  metadata: text("metadata"), // JSON string con datos adicionales (projectId, taskId, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
}).extend({
  orderIndex: z.number().int().optional().nullable(),
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  createdAt: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.union([
    z.string(),
    z.date(),
    z.null()
  ]).optional().nullable()
});

export const insertQuickNoteSchema = createInsertSchema(quickNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

export type InsertQuickNote = z.infer<typeof insertQuickNoteSchema>;
export type QuickNote = typeof quickNotes.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

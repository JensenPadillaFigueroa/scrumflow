// storage.ts
import "dotenv/config";
import mysql, { type Pool } from "mysql2/promise";
import { randomUUID } from "crypto";
import type { 
  Project, 
  InsertProject, 
  ProjectMember,
  InsertProjectMember,
  Task, 
  InsertTask, 
  WishlistItem, 
  InsertWishlistItem, 
  Reminder, 
  InsertReminder, 
  QuickNote, 
  InsertQuickNote,
  Attachment,
  InsertAttachment
} from "@shared/schema";

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

/** Storage interface (usado por routes.ts) */
export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserForLogin(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: { username: string; email: string; full_name: string; password: string; role: string }): Promise<User>;
  updateUser(id: string, updates: Partial<{ username: string; email: string; full_name: string; role: string }>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Projects
  getProjects(userId?: string, isAdminView?: boolean): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject & { userId?: string }): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Project Members
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  getAllProjectMembers(): Promise<Array<{ projectId: string; userId: string }>>;
  getAllProjectMembersByProjectIds(projectIds: string[]): Promise<Array<{ projectId: string; userId: string }>>;
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  removeProjectMember(projectId: string, userId: string): Promise<boolean>;
  updateProjectMemberRole(projectId: string, userId: string, role: string): Promise<ProjectMember | undefined>;
  getUserProjectRole(projectId: string, userId: string): Promise<string | null>;

  // Tasks
  getTasks(userId?: string, isAdminView?: boolean): Promise<Task[]>;
  getTasksByProject(projectId: string, userId?: string, isAdminView?: boolean): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getTodaysFocusTasks(projectId: string, userId: string): Promise<Task[]>;
  getTeamFocusTasks(projectId: string): Promise<any>;
  toggleTaskFocus(taskId: string, userId: string): Promise<Task | undefined>;
  getDashboardMyFocus(userId: string): Promise<Task[]>;
  getDashboardTeamFocus(userId: string): Promise<any[]>;

  getWishlistItems(userId?: string, isAdminView?: boolean): Promise<WishlistItem[]>;
  getWishlistItem(id: string): Promise<WishlistItem | undefined>;
  createWishlistItem(item: InsertWishlistItem & { userId?: string }): Promise<WishlistItem>;
  updateWishlistItem(id: string, updates: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined>;
  deleteWishlistItem(id: string): Promise<boolean>;
  promoteWishlistItemToProject(id: string): Promise<Project | undefined>;

  // Reminders
  getReminders(userId?: string, isAdminView?: boolean): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder & { userId?: string }): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;

  // Quick Notes
  getQuickNotes(userId?: string, isAdminView?: boolean): Promise<QuickNote[]>;
  getArchivedQuickNotes(userId?: string, isAdminView?: boolean): Promise<QuickNote[]>;
  getQuickNote(id: string): Promise<QuickNote | undefined>;
  getQuickNotesByProject(projectId: string, userId?: string, isAdminView?: boolean): Promise<QuickNote[]>;
  createQuickNote(note: InsertQuickNote & { userId?: string }): Promise<QuickNote>;
  updateQuickNote(id: string, updates: Partial<InsertQuickNote>): Promise<QuickNote | undefined>;
  deleteQuickNote(id: string): Promise<boolean>;

  // Attachments
  getAttachments(entityType: 'task' | 'project', entityId: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment & { uploadedBy: string }): Promise<Attachment>;
  deleteAttachment(id: string): Promise<boolean>;
}

type DbStatus = "wishlist" | "todo" | "in_progress" | "done";
function normalizeStatus(input: unknown): DbStatus {
  if (input == null) return "todo";
  const raw = String(input).trim().toLowerCase();
  const compact = raw.replace(/[\s\-_]/g, ""); // capta "inProgress", "in-progress", etc.

  // wishlist
  if (compact === "wishlist") return "wishlist";

  // in_progress
  if (compact === "inprogress" || compact === "doing" || compact === "wip") return "in_progress";

  // done
  if (compact === "done" || compact === "finished" || compact === "complete" || compact === "completed" || compact === "resolved" || compact === "closed")
    return "done";

  // todo (default)
  if (compact === "todo" || compact === "pending" || compact === "backlog") return "todo";

  return "todo";
}

/** MariaDB adapter implementando IStorage con mysql2/promise */
export class MariaStorage implements IStorage {
  constructor(public pool: Pool) {}
  // -------- Users --------
  async getUserById(id: string): Promise<User | undefined> {
    try {
      const [rows] = await this.pool.query(
        "SELECT id, username, email, password_hash, full_name, role, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      const users = rows as User[];
      return users[0];
    } catch (error) {
      console.error("❌ [DB] Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log("🔍 [DB] Buscando usuario:", username);
      const [rows] = await this.pool.query(
        "SELECT id, username, email, password_hash, full_name, role, createdAt, updatedAt FROM users WHERE username = ? LIMIT 1",
        [username]
      );
      console.log("🔍 [DB] Resultado query:", rows);
      const list = rows as User[];
      const user = list[0];
      if (user) {
        console.log("🔍 [DB] Usuario encontrado:", {
          id: user.id,
          username: user.username,
          email: user.email,
          password_hash: user.password_hash,
          full_name: user.full_name,
          role: user.role,
          hasRole: 'role' in user,
          roleType: typeof user.role,
          hasPassword: 'password_hash' in user,
          passwordValue: user.password_hash
        });
      } else {
        console.log("🔍 [DB] No se encontró usuario");
      }
      return user;
    } catch (error) {
      console.error("❌ [DB] Error en getUserByUsername:", error);
      throw error;
    }
  }

  async getUserForLogin(username: string): Promise<User | undefined> {
    try {
      console.log("🔐 [DB] Buscando usuario para login:", username);
      const [rows] = await this.pool.query(
        "SELECT id, username, email, password_hash, full_name, role, createdAt, updatedAt FROM users WHERE username = ? LIMIT 1",
        [username]
      );
      console.log("🔐 [DB] Raw result for login:", rows);
      const list = rows as User[];
      const user = list[0];
      if (user) {
        console.log("🔐 [DB] Usuario para login encontrado:", {
          id: user.id,
          username: user.username,
          email: user.email,
          password_hash: user.password_hash,
          full_name: user.full_name,
          role: user.role,
          hasPassword: !!user.password_hash,
          passwordLength: user.password_hash?.length
        });
      } else {
        console.log("🔐 [DB] No se encontró usuario para login");
      }
      return user;
    } catch (error) {
      console.error("❌ [DB] Error en getUserForLogin:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const [rows] = await this.pool.query(
        "SELECT id, username, email, full_name, role, createdAt, updatedAt FROM users ORDER BY username ASC"
      );
      return rows as User[];
    } catch (error) {
      console.error("❌ [DB] Error en getAllUsers:", error);
      throw error;
    }
  }

  async createUser(user: { username: string; email: string; full_name: string; password: string; role: string }): Promise<User> {
    try {
      const id = randomUUID();
      const now = new Date();
      
      console.log("👤 [DB] Creating user:", user.username, "with role:", user.role);
      
      await this.pool.execute(
        "INSERT INTO users (id, username, email, password_hash, full_name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, user.username, user.email, user.password, user.full_name, user.role, now, now]
      );

      const [rows] = await this.pool.query(
        "SELECT id, username, email, full_name, role, createdAt, updatedAt FROM users WHERE id = ?",
        [id]
      );
      
      const createdUser = (rows as User[])[0];
      console.log("✅ [DB] User created successfully:", createdUser.username);
      return createdUser;
    } catch (error) {
      console.error("❌ [DB] Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<{ username: string; email: string; full_name: string; role: string }>): Promise<User | undefined> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.username !== undefined) {
        fields.push("username = ?");
        values.push(updates.username);
      }
      if (updates.email !== undefined) {
        fields.push("email = ?");
        values.push(updates.email);
      }
      if (updates.full_name !== undefined) {
        fields.push("full_name = ?");
        values.push(updates.full_name);
      }
      if (updates.role !== undefined) {
        fields.push("role = ?");
        values.push(updates.role);
      }

      if (fields.length === 0) {
        // No hay campos para actualizar, devolver el usuario actual
        const [rows] = await this.pool.query(
          "SELECT id, username, email, full_name, role, createdAt, updatedAt FROM users WHERE id = ?",
          [id]
        );
        return (rows as User[])[0];
      }

      fields.push("updatedAt = ?");
      values.push(new Date());
      values.push(id);

      console.log("👤 [DB] Updating user:", id, "fields:", fields);

      const [result] = await this.pool.execute(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
        values
      );

      if ((result as any).affectedRows === 0) {
        console.log("❌ [DB] User not found for update:", id);
        return undefined;
      }

      const [rows] = await this.pool.query(
        "SELECT id, username, email, full_name, role, createdAt, updatedAt FROM users WHERE id = ?",
        [id]
      );

      const updatedUser = (rows as User[])[0];
      console.log("✅ [DB] User updated successfully:", updatedUser.username);
      return updatedUser;
    } catch (error) {
      console.error("❌ [DB] Error updating user:", error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      console.log("👤 [DB] Deleting user:", id);
      
      const [result] = await this.pool.execute("DELETE FROM users WHERE id = ?", [id]);
      const success = (result as any).affectedRows > 0;
      
      if (success) {
        console.log("✅ [DB] User deleted successfully");
      } else {
        console.log("❌ [DB] User not found for deletion");
      }
      
      return success;
    } catch (error) {
      console.error("❌ [DB] Error deleting user:", error);
      throw error;
    }
  }
  // -------- Projects --------
  async getProjects(userId?: string, isAdminView?: boolean): Promise<Project[]> {
    if (isAdminView) {
      // Admin puede ver todos los proyectos con info del creador
      const [rows] = await this.pool.query(`
        SELECT p.id, p.name, p.description, p.category, p.userId, p.createdAt, 
               p.created_by_admin_id, p.created_by_admin_username,
               u.username as owner_username, u.full_name as owner_full_name
        FROM projects p
        LEFT JOIN users u ON p.userId = u.id
        ORDER BY p.createdAt DESC
      `);
      return rows as Project[];
    }
    
    if (userId) {
      // Obtener proyectos propios y compartidos con info del creador
      const [rows] = await this.pool.query(`
        SELECT DISTINCT p.id, p.name, p.description, p.category, p.userId, p.schedule_enabled as scheduleEnabled, p.createdAt, 
               p.created_by_admin_id, p.created_by_admin_username,
               u.username as owner_username, u.full_name as owner_full_name
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.projectId
        LEFT JOIN users u ON p.userId = u.id
        WHERE p.userId = ? OR pm.userId = ?
        ORDER BY p.createdAt DESC
      `, [userId, userId]);
      return rows as Project[];
    }
    
    // Fallback para compatibilidad con info del creador
    const [rows] = await this.pool.query(`
      SELECT p.id, p.name, p.description, p.category, p.userId, p.schedule_enabled as scheduleEnabled, p.createdAt, 
             p.created_by_admin_id, p.created_by_admin_username,
             u.username as owner_username, u.full_name as owner_full_name
      FROM projects p
      LEFT JOIN users u ON p.userId = u.id
      ORDER BY p.createdAt DESC
    `);
    return rows as Project[];
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [rows] = await this.pool.query(`
      SELECT p.id, p.name, p.description, p.category, p.userId, p.schedule_enabled as scheduleEnabled, p.createdAt, 
             p.created_by_admin_id, p.created_by_admin_username,
             u.username as owner_username, u.full_name as owner_full_name
      FROM projects p
      LEFT JOIN users u ON p.userId = u.id
      WHERE p.id = ? 
      LIMIT 1
    `, [id]);
    const list = rows as Project[];
    return list[0];
  }

  async createProject(insertProject: InsertProject & { userId?: string; created_by_admin_id?: string; created_by_admin_username?: string }): Promise<Project> {
    const id = randomUUID();
    await this.pool.execute(
      "INSERT INTO projects (id, name, description, category, userId, schedule_enabled, created_by_admin_id, created_by_admin_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id, 
        insertProject.name, 
        insertProject.description ?? null, 
        insertProject.category ?? null, 
        insertProject.userId,
        insertProject.scheduleEnabled ?? false,
        insertProject.created_by_admin_id ?? null,
        insertProject.created_by_admin_username ?? null
      ]
    );
    const created = await this.getProject(id);
    if (!created) throw new Error("Failed to create project");
    return created;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = await this.getProject(id);
    if (!existing) return undefined;

    const name = updates.name ?? existing.name;
    const description = (updates.description ?? existing.description) ?? null;
    const category = (updates.category ?? existing.category) ?? null;

    await this.pool.execute(
      "UPDATE projects SET name = ?, description = ?, category = ? WHERE id = ?",
      [name, description, category, id]
    );
    return this.getProject(id);
  }

  async deleteProject(id: string): Promise<boolean> {
    const [res] = await this.pool.execute("DELETE FROM projects WHERE id = ?", [id]);
    // @ts-ignore
    return res.affectedRows > 0;
  }

  // -------- Project Members --------
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const [rows] = await this.pool.query(
      "SELECT id, projectId, userId, role, joinedAt FROM project_members WHERE projectId = ? ORDER BY joinedAt ASC",
      [projectId]
    );
    return rows as ProjectMember[];
  }

  async getAllProjectMembers(): Promise<Array<{ projectId: string; userId: string }>> {
    const [rows] = await this.pool.query(
      "SELECT projectId, userId FROM project_members"
    );
    return rows as Array<{ projectId: string; userId: string }>;
  }

  async getAllProjectMembersByProjectIds(projectIds: string[]): Promise<Array<{ projectId: string; userId: string }>> {
    if (projectIds.length === 0) return [];
    
    // Crear placeholders para la query IN (?, ?, ?)
    const placeholders = projectIds.map(() => '?').join(',');
    
    const [rows] = await this.pool.query(
      `SELECT projectId, userId FROM project_members WHERE projectId IN (${placeholders})`,
      projectIds
    );
    return rows as Array<{ projectId: string; userId: string }>;
  }

  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const id = randomUUID();
    const now = new Date();
    await this.pool.execute(
      "INSERT INTO project_members (id, projectId, userId, role, joinedAt) VALUES (?, ?, ?, ?, ?)",
      [id, member.projectId, member.userId, member.role || "member", now]
    );
    
    const [rows] = await this.pool.query(
      "SELECT id, projectId, userId, role, joinedAt FROM project_members WHERE id = ?",
      [id]
    );
    const list = rows as ProjectMember[];
    return list[0];
  }

  async removeProjectMember(projectId: string, userId: string): Promise<boolean> {
    const [res] = await this.pool.execute(
      "DELETE FROM project_members WHERE projectId = ? AND userId = ?",
      [projectId, userId]
    );
    // @ts-ignore
    return res.affectedRows > 0;
  }

  async updateProjectMemberRole(projectId: string, userId: string, role: string): Promise<ProjectMember | undefined> {
    await this.pool.execute(
      "UPDATE project_members SET role = ? WHERE projectId = ? AND userId = ?",
      [role, projectId, userId]
    );
    
    const [rows] = await this.pool.query(
      "SELECT id, projectId, userId, role, joinedAt FROM project_members WHERE projectId = ? AND userId = ?",
      [projectId, userId]
    );
    const list = rows as ProjectMember[];
    return list[0];
  }

  async getUserProjectRole(projectId: string, userId: string): Promise<string | null> {
    // Verificar si es el owner del proyecto
    const [ownerRows] = await this.pool.query(
      "SELECT userId FROM projects WHERE id = ? AND userId = ?",
      [projectId, userId]
    );
    if ((ownerRows as any[]).length > 0) {
      return "owner";
    }

    // Verificar si es miembro del proyecto
    const [memberRows] = await this.pool.query(
      "SELECT role FROM project_members WHERE projectId = ? AND userId = ?",
      [projectId, userId]
    );
    const members = memberRows as { role: string }[];
    return members.length > 0 ? members[0].role : null;
  }

  // -------- Tasks --------
  async getTasks(userId?: string, isAdminView?: boolean): Promise<Task[]> {
    if (isAdminView) {
      // Admin puede ver todas las tareas
      const [rows] = await this.pool.query(
        `SELECT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, 
                t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
                u.username as assigned_to_username, u.full_name as assigned_to_full_name
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         ORDER BY t.createdAt DESC`
      );
      return (rows as Task[]).map(t => ({ ...t, projectId: t.projectId ?? null }));
    }
    
    if (userId) {
      // Obtener tareas propias del usuario
      const [ownTasks] = await this.pool.query(`
        SELECT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
               t.order_index AS orderIndex, t.due_date as dueDate, t.importance,
               t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
               t.completion_notes as completionNotes,
               u.username as created_by_username, u.full_name as created_by_full_name,
               assigned_user.username as assigned_to_username, assigned_user.full_name as assigned_to_full_name
        FROM tasks t
        LEFT JOIN users u ON t.userId = u.id
        LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
        WHERE t.userId = ?
        ORDER BY (t.order_index IS NULL), t.order_index ASC, t.createdAt DESC
      `, [userId]);
      
      // Obtener tareas de proyectos donde es owner
      const [ownerTasks] = await this.pool.query(`
        SELECT DISTINCT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
               t.order_index AS orderIndex, t.due_date as dueDate, t.importance,
               t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
               t.completion_notes as completionNotes,
               u.username as created_by_username, u.full_name as created_by_full_name,
               assigned_user.username as assigned_to_username, assigned_user.full_name as assigned_to_full_name
        FROM tasks t
        INNER JOIN projects p ON t.projectId = p.id
        LEFT JOIN users u ON t.userId = u.id
        LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
        WHERE p.userId = ? AND t.userId != ?
        ORDER BY (t.order_index IS NULL), t.order_index ASC, t.createdAt DESC
      `, [userId, userId]);
      
      // Obtener tareas de proyectos donde es miembro
      const [memberTasks] = await this.pool.query(`
        SELECT DISTINCT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
               t.order_index AS orderIndex, t.due_date as dueDate, t.importance,
               t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
               t.completion_notes as completionNotes,
               u.username as created_by_username, u.full_name as created_by_full_name,
               assigned_user.username as assigned_to_username, assigned_user.full_name as assigned_to_full_name
        FROM tasks t
        INNER JOIN project_members pm ON t.projectId = pm.projectId
        LEFT JOIN users u ON t.userId = u.id
        LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
        WHERE pm.userId = ? AND t.userId != ?
        ORDER BY (t.order_index IS NULL), t.order_index ASC, t.createdAt DESC
      `, [userId, userId]);
      
      // Combinar todas las tareas y eliminar duplicados
      const allTasks = [...(ownTasks as Task[]), ...(ownerTasks as Task[]), ...(memberTasks as Task[])];
      const uniqueTasks = allTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );
      
      return uniqueTasks.map(t => ({ ...t, projectId: t.projectId ?? null }));
    }
    
    // Fallback para compatibilidad
    const [rows] = await this.pool.query(
      `SELECT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, 
              t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
              t.order_index AS orderIndex,
              u.username as assigned_to_username, u.full_name as assigned_to_full_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       ORDER BY (t.order_index IS NULL), t.order_index ASC, t.createdAt DESC`
    );
    return (rows as Task[]).map(t => ({ ...t, projectId: t.projectId ?? null }));
  }

  async getTasksByProject(projectId: string, userId?: string, isAdminView?: boolean): Promise<Task[]> {
    if (isAdminView) {
      // Admin puede ver todas las tareas del proyecto
      const [rows] = await this.pool.query(
        `SELECT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, 
                t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
                t.order_index AS orderIndex, t.due_date as dueDate, t.importance,
                t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
                t.completion_notes as completionNotes,
                u.username as assigned_to_username, u.full_name as assigned_to_full_name
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.projectId = ? 
         ORDER BY (t.order_index IS NULL), t.order_index ASC, t.createdAt DESC`,
        [projectId]
      );
      return (rows as Task[]).map(t => ({ ...t, projectId: t.projectId ?? null }));
    }
    
    if (userId) {
      // Verificar si el usuario tiene acceso al proyecto (owner o miembro)
      const userRole = await this.getUserProjectRole(projectId, userId);
      if (!userRole) {
        // Usuario no tiene acceso al proyecto
        return [];
      }
      
      // Si tiene acceso, devolver todas las tareas del proyecto
      const [rows] = await this.pool.query(`
        SELECT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
               t.order_index AS orderIndex, t.due_date as dueDate, t.importance,
               t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
               t.completion_notes as completionNotes,
               u.username as created_by_username, u.full_name as created_by_full_name,
               assigned_user.username as assigned_to_username, assigned_user.full_name as assigned_to_full_name
        FROM tasks t
        LEFT JOIN users u ON t.userId = u.id
        LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
        WHERE t.projectId = ? 
        ORDER BY (t.order_index IS NULL), t.order_index ASC, t.createdAt DESC
      `, [projectId]);
      return (rows as Task[]).map(t => ({ ...t, projectId: t.projectId ?? null }));
    }
    
    // Fallback para compatibilidad
    const [rows] = await this.pool.query(
      `SELECT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, 
              t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
              t.order_index AS orderIndex,
              u.username as assigned_to_username, u.full_name as assigned_to_full_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.projectId = ? 
       ORDER BY (t.order_index IS NULL), t.order_index ASC, t.createdAt DESC`,
      [projectId]
    );
    return (rows as Task[]).map(t => ({ ...t, projectId: t.projectId ?? null }));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [rows] = await this.pool.query(
      `SELECT t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt, 
              t.created_by_admin_id, t.created_by_admin_username, t.assigned_to as assignedTo,
              t.order_index AS orderIndex, t.due_date as dueDate, t.importance,
              t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
              t.completion_notes as completionNotes,
              u.username as assigned_to_username, u.full_name as assigned_to_full_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = ? 
       LIMIT 1`,
      [id]
    );
    const list = rows as Task[];
    const item = list[0];
    return item ? { ...item, projectId: item.projectId ?? null } : undefined;
  }

  async createTask(insertTask: InsertTask & { userId?: string; created_by_admin_id?: string; created_by_admin_username?: string; assignedTo?: string; focusToday?: number; focusUserId?: string; focusDate?: string }): Promise<Task> {
    const id = randomUUID();
    const projectId = insertTask.projectId ?? null;
    const status = normalizeStatus(insertTask.status);

    // Calcular order_index al final de la columna si no viene especificado
    let orderIndex = (insertTask as any).orderIndex as number | null | undefined;
    if (orderIndex === undefined || orderIndex === null) {
      const [res] = await this.pool.query(
        "SELECT COALESCE(MAX(order_index), 0) + 1 AS nextIdx FROM tasks WHERE (projectId <=> ?) AND status = ?",
        [projectId, status]
      );
      orderIndex = (res as any[])[0]?.nextIdx ?? 1;
    }

    await this.pool.execute(
      "INSERT INTO tasks (id, title, description, status, projectId, userId, created_by_admin_id, created_by_admin_username, assigned_to, order_index, focus_today, focus_user_id, focus_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id, 
        insertTask.title, 
        insertTask.description ?? null, 
        status, 
        projectId, 
        insertTask.userId,
        insertTask.created_by_admin_id ?? null,
        insertTask.created_by_admin_username ?? null,
        insertTask.assignedTo ?? null,
        orderIndex,
        insertTask.focusToday ?? 0,
        insertTask.focusUserId ?? null,
        insertTask.focusDate ?? null
      ]
    );
    const created = await this.getTask(id);
    if (!created) throw new Error("Failed to create task");
    return created;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const existing = await this.getTask(id);
    if (!existing) return undefined;

    const title = updates.title ?? existing.title;
    const description = (updates.description ?? existing.description) ?? null;

    const status: DbStatus =
      updates.status !== undefined ? normalizeStatus(updates.status) : (existing.status as DbStatus);

    // permitir null explícito para projectId
    const hasProjectId = Object.prototype.hasOwnProperty.call(updates, "projectId");
    const projectId = hasProjectId ? (updates as any).projectId ?? null : existing.projectId;

    // construir SQL dinámico para incluir assigned_to y order_index si se envían
    const hasAssignedTo = Object.prototype.hasOwnProperty.call(updates, "assignedTo");
    const hasOrderIndex = Object.prototype.hasOwnProperty.call(updates, "orderIndex");
    const hasFocusToday = Object.prototype.hasOwnProperty.call(updates, "focusToday");
    const hasFocusDate = Object.prototype.hasOwnProperty.call(updates, "focusDate");
    const hasFocusUserId = Object.prototype.hasOwnProperty.call(updates, "focusUserId");
    const hasDueDate = Object.prototype.hasOwnProperty.call(updates, "dueDate");
    const hasImportance = Object.prototype.hasOwnProperty.call(updates, "importance");
    const hasCompletionNotes = Object.prototype.hasOwnProperty.call(updates, "completionNotes");
    
    let computedOrderIndex: number | null | undefined = undefined;

    if (hasOrderIndex) {
      computedOrderIndex = (updates as any).orderIndex ?? null;
    } else if (updates.status !== undefined) {
      // Si cambia de columna y no se envió orderIndex, poner al final
      const targetProjectId = hasProjectId ? (updates as any).projectId ?? null : existing.projectId;
      const [res] = await this.pool.query(
        "SELECT COALESCE(MAX(order_index), 0) + 1 AS nextIdx FROM tasks WHERE (projectId <=> ?) AND status = ?",
        [targetProjectId, status]
      );
      computedOrderIndex = (res as any[])[0]?.nextIdx ?? 1;
    }

    let sql = "UPDATE tasks SET title = ?, description = ?, status = ?, projectId = ?";
    const params: any[] = [title, description, status, projectId];
    
    if (hasAssignedTo) {
      sql += ", assigned_to = ?";
      const assignedVal = (updates as any).assignedTo ?? null;
      params.push(assignedVal);
    }
    if (computedOrderIndex !== undefined) {
      sql += ", order_index = ?";
      params.push(computedOrderIndex);
    }
    if (hasFocusToday) {
      sql += ", focus_today = ?";
      params.push((updates as any).focusToday ? 1 : 0);
    }
    if (hasFocusDate) {
      sql += ", focus_date = ?";
      params.push((updates as any).focusDate ?? null);
    }
    if (hasFocusUserId) {
      sql += ", focus_user_id = ?";
      params.push((updates as any).focusUserId ?? null);
    }
    if (hasDueDate) {
      sql += ", due_date = ?";
      params.push((updates as any).dueDate ?? null);
    }
    if (hasImportance) {
      sql += ", importance = ?";
      params.push((updates as any).importance ?? 'medium');
    }
    if (hasCompletionNotes) {
      sql += ", completion_notes = ?";
      params.push((updates as any).completionNotes ?? null);
    }
    
    sql += " WHERE id = ?";
    params.push(id);

    await this.pool.execute(sql, params);
    return this.getTask(id);
  }

  async deleteTask(id: string): Promise<boolean> {
    const [res] = await this.pool.execute("DELETE FROM tasks WHERE id = ?", [id]);
    // @ts-ignore
    return res.affectedRows > 0;
  }

  async getTodaysFocusTasks(projectId: string, userId: string): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get tasks from regular tasks table
    const [taskRows] = await this.pool.query(`
      SELECT *, 'task' as source_type FROM tasks 
      WHERE projectId = ?
        AND status != 'done'
        AND (
          -- Only tasks where THIS user marked as focus
          (focus_today = 1 AND focus_user_id = ?)
        )
    `, [projectId, userId]);
    
    // Get scheduled tasks from calendar with due_date = today assigned to user
    const [scheduledRows] = await this.pool.query(`
      SELECT 
        id,
        title,
        description,
        project_id as projectId,
        status,
        assigned_to as assignedTo,
        NULL as orderIndex,
        due_date as dueDate,
        importance,
        0 as focusToday,
        NULL as focusDate,
        NULL as focusUserId,
        created_at as createdAt,
        'scheduled' as source_type
      FROM scheduled_tasks 
      WHERE project_id = ? 
        AND DATE(due_date) = ?
        AND status != 'done'
        AND assigned_to = ?
    `, [projectId, today, userId]);
    
    // Combine both sources
    const allTasks = [...(taskRows as any[]), ...(scheduledRows as any[])];
    
    // Sort by priority
    allTasks.sort((a, b) => {
      // Priority order
      const getPriority = (task: any) => {
        if (task.focus_today === 1 || task.focusToday === 1) return 1;
        if (task.source_type === 'scheduled') return 2; // Calendar tasks high priority
        if (task.due_date && new Date(task.due_date).toISOString().split('T')[0] === today) return 2;
        if (task.status === 'in_progress') return 3;
        return 4;
      };
      
      const priorityDiff = getPriority(a) - getPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by importance
      const importanceOrder: any = { high: 1, medium: 2, low: 3 };
      return (importanceOrder[a.importance] || 4) - (importanceOrder[b.importance] || 4);
    });
    
    // Limit to 12 tasks
    return allTasks.slice(0, 12) as Task[];
  }

  async getTeamFocusTasks(projectId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all focus tasks for the project, grouped by user
    const [rows] = await this.pool.query(`
      SELECT 
        t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt,
        t.assigned_to as assignedTo, t.order_index AS orderIndex,
        t.due_date as dueDate, t.importance,
        t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
        u.username as focus_user_username, u.full_name as focus_user_full_name,
        assigned_user.username as assigned_to_username, assigned_user.full_name as assigned_to_full_name
      FROM tasks t
      LEFT JOIN users u ON t.focus_user_id = u.id
      LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
      WHERE t.projectId = ?
        AND t.focus_today = 1
        AND t.status != 'done'
      ORDER BY u.full_name ASC, t.createdAt DESC
    `, [projectId]);
    
    // Group tasks by user
    const tasksByUser: Record<string, any> = {};
    
    for (const task of rows as any[]) {
      const userId = task.focusUserId;
      const userName = task.focus_user_full_name || task.focus_user_username || 'Unknown User';
      
      if (!tasksByUser[userId]) {
        tasksByUser[userId] = {
          userId,
          userName,
          username: task.focus_user_username,
          tasks: []
        };
      }
      
      tasksByUser[userId].tasks.push(task);
    }
    
    // Convert to array and sort by user name
    const result = Object.values(tasksByUser).sort((a, b) => 
      a.userName.localeCompare(b.userName)
    );
    
    return result;
  }

  async toggleTaskFocus(taskId: string, userId: string): Promise<Task | undefined> {
    // Get current state
    const task = await this.getTask(taskId);
    if (!task) return undefined;

    const newFocusState = task.focusToday ? 0 : 1;
    // Format as DATE only (YYYY-MM-DD) not DATETIME
    const focusDate = newFocusState ? new Date().toISOString().split('T')[0] : null;
    const focusUserId = newFocusState ? userId : null;

    await this.pool.execute(
      "UPDATE tasks SET focus_today = ?, focus_date = ?, focus_user_id = ? WHERE id = ?",
      [newFocusState, focusDate, focusUserId, taskId]
    );

    return this.getTask(taskId);
  }

  // Dashboard: Get My Focus tasks (all projects)
  async getDashboardMyFocus(userId: string): Promise<Task[]> {
    const [rows] = await this.pool.query(`
      SELECT 
        t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt,
        t.assigned_to as assignedTo, t.order_index AS orderIndex,
        t.due_date as dueDate, t.importance,
        t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
        p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.projectId = p.id
      WHERE t.focus_today = 1
        AND t.focus_user_id = ?
        AND t.status != 'done'
      ORDER BY t.createdAt DESC
      LIMIT 20
    `, [userId]);
    
    return rows as Task[];
  }

  // Dashboard: Get Team Focus tasks (all collaborative projects)
  async getDashboardTeamFocus(userId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get only COLLABORATIVE projects (projects where user has access AND has at least 1 member)
    const [projectRows] = await this.pool.query(`
      SELECT DISTINCT p.id, p.name,
        COUNT(DISTINCT pm.userId) as member_count
      FROM projects p
      INNER JOIN project_members pm ON p.id = pm.projectId
      WHERE p.userId = ? OR pm.userId = ?
      GROUP BY p.id, p.name
      HAVING COUNT(DISTINCT pm.userId) > 0
    `, [userId, userId]);
    
    const projectIds = (projectRows as any[]).map(p => p.id);
    
    console.log(`🔍 [getDashboardTeamFocus] User ${userId} has access to ${projectIds.length} collaborative projects:`, projectIds);
    console.log(`🔍 [getDashboardTeamFocus] Projects with member counts:`, (projectRows as any[]).map(p => ({
      name: p.name,
      memberCount: p.member_count
    })));
    
    if (projectIds.length === 0) {
      console.log(`⚠️ [getDashboardTeamFocus] No collaborative projects found for user ${userId}`);
      return [];
    }
    
    // Get all focus tasks from these projects (excluding current user's tasks)
    const [rows] = await this.pool.query(`
      SELECT 
        t.id, t.title, t.description, t.status, t.projectId, t.userId, t.createdAt,
        t.assigned_to as assignedTo, t.order_index AS orderIndex,
        t.due_date as dueDate, t.importance,
        t.focus_today as focusToday, t.focus_date as focusDate, t.focus_user_id as focusUserId,
        u.username as focus_user_username, u.full_name as focus_user_full_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.focus_user_id = u.id
      LEFT JOIN projects p ON t.projectId = p.id
      WHERE t.projectId IN (?)
        AND t.focus_today = 1
        AND t.focus_user_id != ?
        AND t.status != 'done'
      ORDER BY p.name ASC, u.full_name ASC, t.createdAt DESC
    `, [projectIds, userId]);
    
    console.log(`🔍 [getDashboardTeamFocus] Found ${(rows as any[]).length} team focus tasks (excluding user ${userId})`);
    console.log(`🔍 [getDashboardTeamFocus] Sample tasks:`, (rows as any[]).slice(0, 3).map(t => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      focusUserId: t.focusUserId,
      focusToday: t.focusToday
    })));
    
    // Group tasks by project, then by user
    const tasksByProject: Record<string, any> = {};
    
    for (const task of rows as any[]) {
      const projectId = task.projectId;
      const projectName = task.project_name || 'Unknown Project';
      const focusUserId = task.focusUserId;
      const fullName = task.focus_user_full_name || task.focus_user_username || 'Unknown User';
      
      // Initialize project if not exists
      if (!tasksByProject[projectId]) {
        tasksByProject[projectId] = {
          projectId,
          projectName,
          users: {}
        };
      }
      
      // Initialize user within project if not exists
      if (!tasksByProject[projectId].users[focusUserId]) {
        tasksByProject[projectId].users[focusUserId] = {
          userId: focusUserId,
          username: task.focus_user_username,
          fullName: fullName,
          tasks: []
        };
      }
      
      tasksByProject[projectId].users[focusUserId].tasks.push(task);
    }
    
    // Convert to array format
    const result = Object.values(tasksByProject).map((project: any) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      users: Object.values(project.users).sort((a: any, b: any) => 
        a.fullName.localeCompare(b.fullName)
      )
    })).sort((a, b) => a.projectName.localeCompare(b.projectName));
    
    console.log(`✅ [getDashboardTeamFocus] Returning ${result.length} projects with team focus`);
    console.log(`✅ [getDashboardTeamFocus] Result structure:`, result.map(p => ({
      projectName: p.projectName,
      userCount: p.users.length,
      users: p.users.map((u: any) => ({ fullName: u.fullName, taskCount: u.tasks.length }))
    })));
    
    return result;
  }

  // -------- Wishlist --------
  async getWishlistItems(userId?: string, isAdminView?: boolean): Promise<WishlistItem[]> {
    if (isAdminView) {
      // Admin puede ver todos los items de wishlist
      const [rows] = await this.pool.query(
        "SELECT id, title, description, category, userId, createdAt, created_by_admin_id, created_by_admin_username FROM wishlist ORDER BY createdAt DESC"
      );
      return rows as WishlistItem[];
    }
    
    if (userId) {
      const [rows] = await this.pool.query(
        "SELECT id, title, description, category, userId, createdAt, created_by_admin_id, created_by_admin_username FROM wishlist WHERE userId = ? ORDER BY createdAt DESC",
        [userId]
      );
      return rows as WishlistItem[];
    }
    
    // Fallback para compatibilidad
    const [rows] = await this.pool.query(
      "SELECT id, title, description, category, userId, createdAt, created_by_admin_id, created_by_admin_username FROM wishlist ORDER BY createdAt DESC"
    );
    return rows as WishlistItem[];
  }

  async getWishlistItem(id: string): Promise<WishlistItem | undefined> {
    const [rows] = await this.pool.query(
      "SELECT id, title, description, category, userId, createdAt, created_by_admin_id, created_by_admin_username FROM wishlist WHERE id = ? LIMIT 1",
      [id]
    );
    const list = rows as WishlistItem[];
    return list[0];
  }

  async createWishlistItem(insertItem: InsertWishlistItem & { userId?: string; created_by_admin_id?: string; created_by_admin_username?: string }): Promise<WishlistItem> {
    const id = randomUUID();
    await this.pool.execute(
      "INSERT INTO wishlist (id, title, description, category, userId, created_by_admin_id, created_by_admin_username) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        id, 
        insertItem.title, 
        insertItem.description ?? null, 
        insertItem.category ?? null, 
        insertItem.userId,
        insertItem.created_by_admin_id ?? null,
        insertItem.created_by_admin_username ?? null
      ]
    );
    const created = await this.getWishlistItem(id);
    if (!created) throw new Error("Failed to create wishlist item");
    return created;
  }

  async updateWishlistItem(id: string, updates: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined> {
    const existing = await this.getWishlistItem(id);
    if (!existing) return undefined;

    const title = updates.title ?? existing.title;
    const description = (updates.description ?? existing.description) ?? null;
    const category = (updates.category ?? existing.category) ?? null;

    await this.pool.execute(
      "UPDATE wishlist SET title = ?, description = ?, category = ? WHERE id = ?",
      [title, description, category, id]
    );
    return this.getWishlistItem(id);
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    const [res] = await this.pool.execute("DELETE FROM wishlist WHERE id = ?", [id]);
    // @ts-ignore
    return res.affectedRows > 0;
  }

  async promoteWishlistItemToProject(id: string): Promise<Project | undefined> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        "SELECT id, title, description, category FROM wishlist WHERE id = ? FOR UPDATE",
        [id]
      );
      const list = rows as Array<Pick<WishlistItem, "id" | "title" | "description" | "category">>;
      const item = list[0];
      if (!item) {
        await conn.rollback();
        return undefined;
      }

      const projectId = randomUUID();
      await conn.execute(
        "INSERT INTO projects (id, name, description, category) VALUES (?, ?, ?, ?)",
        [projectId, item.title, item.description ?? null, item.category ?? null]
      );
      await conn.execute("DELETE FROM wishlist WHERE id = ?", [id]);

      await conn.commit();

      const [pRows] = await this.pool.query(
        "SELECT id, name, description, category, createdAt, created_by_admin_id, created_by_admin_username FROM projects WHERE id = ?",
        [projectId]
      );
      const plist = pRows as Project[];
      return plist[0];
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // === REMINDERS ===
  async getReminders(userId?: string, isAdminView?: boolean): Promise<Reminder[]> {
    if (isAdminView) {
      // Admin puede ver todos los recordatorios
      const [rows] = await this.pool.query(`
        SELECT id, title, description, priority, completed, dueDate, userId, createdAt, created_by_admin_id, created_by_admin_username 
        FROM reminders 
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
            ELSE 5 
          END,
          completed ASC,
          createdAt DESC
      `);
      return rows as Reminder[];
    }
    
    if (userId) {
      const [rows] = await this.pool.query(`
        SELECT id, title, description, priority, completed, dueDate, userId, createdAt, created_by_admin_id, created_by_admin_username 
        FROM reminders 
        WHERE userId = ?
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
            ELSE 5 
          END,
          completed ASC,
          createdAt DESC
      `, [userId]);
      return rows as Reminder[];
    }
    
    // Fallback para compatibilidad
    const [rows] = await this.pool.query(`
      SELECT id, title, description, priority, completed, dueDate, userId, createdAt, created_by_admin_id, created_by_admin_username 
      FROM reminders 
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 
        END,
        completed ASC,
        createdAt DESC
    `);
    return rows as Reminder[];
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [rows] = await this.pool.query(
      "SELECT id, title, description, priority, completed, dueDate, createdAt, created_by_admin_id, created_by_admin_username FROM reminders WHERE id = ?",
      [id]
    );
    const list = rows as Reminder[];
    return list[0];
  }

  async createReminder(reminder: InsertReminder & { userId?: string; created_by_admin_id?: string; created_by_admin_username?: string }): Promise<Reminder> {
    console.log("💾 Storage - Datos recibidos en createReminder:", reminder);
    console.log("💾 Storage - Tipo de dueDate en storage:", typeof reminder.dueDate);
    console.log("💾 Storage - Valor de dueDate en storage:", reminder.dueDate);
    
    const id = randomUUID();
    const now = new Date();
    // Formatear dueDate para MariaDB DATE
    const formattedDueDate = reminder.dueDate && reminder.dueDate !== ""
      ? (reminder.dueDate instanceof Date 
          ? reminder.dueDate.toISOString().split('T')[0] 
          : reminder.dueDate) // Ya viene como string YYYY-MM-DD del frontend
      : null;
      
    console.log("💾 Storage - dueDate formateado para DB:", formattedDueDate);
    console.log("💾 Storage - Tipo de dueDate formateado:", typeof formattedDueDate);
    console.log("💾 Storage - userId recibido:", reminder.userId);
    console.log("💾 Storage - Tipo de userId:", typeof reminder.userId);

    const insertQuery = "INSERT INTO reminders (id, title, description, priority, completed, dueDate, createdAt, userId, created_by_admin_id, created_by_admin_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const insertValues = [
      id,
      reminder.title,
      reminder.description ?? null,
      reminder.priority ?? "medium",
      reminder.completed ?? false,
      formattedDueDate,
      now,
      reminder.userId,
      reminder.created_by_admin_id ?? null,
      reminder.created_by_admin_username ?? null,
    ];
    
    console.log("💾 Storage - Query SQL:", insertQuery);
    console.log("💾 Storage - Values:", insertValues);

    await this.pool.execute(insertQuery, insertValues);

    const [rows] = await this.pool.query(
      "SELECT id, title, description, priority, completed, dueDate, createdAt, created_by_admin_id, created_by_admin_username FROM reminders WHERE id = ?",
      [id]
    );
    const list = rows as Reminder[];
    return list[0];
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push("title = ?");
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.priority !== undefined) {
      fields.push("priority = ?");
      values.push(updates.priority);
    }
    if (updates.completed !== undefined) {
      fields.push("completed = ?");
      values.push(updates.completed);
    }
    if (updates.dueDate !== undefined) {
      fields.push("dueDate = ?");
      // Formatear dueDate para MariaDB DATE
      const formattedDueDate = updates.dueDate && updates.dueDate !== ""
        ? (updates.dueDate instanceof Date 
            ? updates.dueDate.toISOString().split('T')[0] 
            : updates.dueDate) // Ya viene como string YYYY-MM-DD del frontend
        : null;
      values.push(formattedDueDate);
    }

    if (fields.length === 0) return this.getReminder(id);

    values.push(id);
    await this.pool.execute(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.getReminder(id);
  }

  async deleteReminder(id: string): Promise<boolean> {
    const [result] = await this.pool.execute("DELETE FROM reminders WHERE id = ?", [id]);
    return (result as any).affectedRows > 0;
  }

  // === QUICK NOTES ===
  async getQuickNotes(userId?: string, isAdminView?: boolean): Promise<QuickNote[]> {
    if (isAdminView) {
      // Admin puede ver todas las notas rápidas del dashboard (no archivadas)
      const [rows] = await this.pool.query(`
        SELECT id, content, projectId, noteType, color, pinned, archived, userId, createdAt, updatedAt, created_by_admin_id, created_by_admin_username 
        FROM quick_notes 
        WHERE noteType = 'dashboard' AND archived = FALSE
        ORDER BY pinned DESC, updatedAt DESC
      `);
      return rows as QuickNote[];
    }
    
    if (userId) {
      console.log("🔍 [NOTES] Getting quick notes for user:", userId);
      
      // Primero, ver qué proyectos tiene acceso este usuario
      const [userProjects] = await this.pool.query(`
        SELECT DISTINCT p.id, p.name, p.userId as ownerId, 'owner' as role
        FROM projects p 
        WHERE p.userId = ?
        UNION
        SELECT DISTINCT p.id, p.name, p.userId as ownerId, pm.role
        FROM projects p
        INNER JOIN project_members pm ON p.id = pm.projectId
        WHERE pm.userId = ?
      `, [userId, userId]);
      
      console.log("🏗️ [NOTES] User has access to projects:", userProjects);
      
      // Obtener notas del dashboard visibles para el usuario:
      // - Notas ASIGNADAS al usuario (assigned_to_user_id = userId)
      // - Notas propias SIN asignación (assigned_to_user_id IS NULL AND userId = userId)
      const [ownNotes] = await this.pool.query(`
        SELECT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.assigned_to_user_id, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username,
               u.username as created_by_username, u.full_name as created_by_full_name
        FROM quick_notes qn
        LEFT JOIN users u ON qn.userId = u.id
        WHERE ((qn.assigned_to_user_id = ?) OR (qn.assigned_to_user_id IS NULL AND qn.userId = ?))
          AND qn.noteType = 'dashboard' AND qn.archived = FALSE
      `, [userId, userId]);
      
      console.log("📝 [NOTES] Own notes:", (ownNotes as any[]).length);
      
      // Obtener notas de proyectos donde es owner
      const [ownerNotes] = await this.pool.query(`
        SELECT DISTINCT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.assigned_to_user_id, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username,
               u.username as created_by_username, u.full_name as created_by_full_name
        FROM quick_notes qn
        INNER JOIN projects p ON qn.projectId = p.id
        LEFT JOIN users u ON qn.userId = u.id
        WHERE p.userId = ? AND qn.noteType = 'dashboard' AND qn.archived = FALSE AND qn.userId != ?
          AND (qn.assigned_to_user_id IS NULL OR qn.assigned_to_user_id = ?)
      `, [userId, userId, userId]);
      
      console.log("📝 [NOTES] Owner notes (from owned projects):", (ownerNotes as any[]).length);
      
      // Obtener notas de proyectos donde es miembro
      const [memberNotes] = await this.pool.query(`
        SELECT DISTINCT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.assigned_to_user_id, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username,
               u.username as created_by_username, u.full_name as created_by_full_name
        FROM quick_notes qn
        INNER JOIN project_members pm ON qn.projectId = pm.projectId
        LEFT JOIN users u ON qn.userId = u.id
        WHERE pm.userId = ? AND qn.noteType = 'dashboard' AND qn.archived = FALSE AND qn.userId != ?
          AND (qn.assigned_to_user_id IS NULL OR qn.assigned_to_user_id = ?)
      `, [userId, userId, userId]);
      
      console.log("📝 [NOTES] Member notes (from member projects):", (memberNotes as any[]).length);
      
      // Combinar todas las notas y eliminar duplicados
      const allNotes = [...(ownNotes as QuickNote[]), ...(ownerNotes as QuickNote[]), ...(memberNotes as QuickNote[])];
      const uniqueNotes = allNotes.filter((note, index, self) => 
        index === self.findIndex(n => n.id === note.id)
      );
      
      // Ordenar por pinned y fecha
      const rows = uniqueNotes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime();
      });
      
      console.log("📝 [NOTES] Found notes:", (rows as any[]).length);
      console.log("📝 [NOTES] Notes details:", rows);
      
      return rows as QuickNote[];
    }
    
    // Fallback para compatibilidad - solo notas del dashboard (no archivadas)
    const [rows] = await this.pool.query(`
      SELECT id, content, projectId, noteType, color, pinned, archived, userId, createdAt, updatedAt, created_by_admin_id, created_by_admin_username 
      FROM quick_notes 
      WHERE noteType = 'dashboard' AND archived = FALSE
      ORDER BY pinned DESC, updatedAt DESC
    `);
    return rows as QuickNote[];
  }

  async getArchivedQuickNotes(userId?: string, isAdminView?: boolean): Promise<QuickNote[]> {
    if (isAdminView) {
      // Admin puede ver todas las notas archivadas del dashboard
      const [rows] = await this.pool.query(`
        SELECT id, content, projectId, noteType, color, pinned, archived, userId, createdAt, updatedAt, created_by_admin_id, created_by_admin_username 
        FROM quick_notes 
        WHERE noteType = 'dashboard' AND archived = TRUE
        ORDER BY updatedAt DESC
      `);
      return rows as QuickNote[];
    }
    
    if (userId) {
      console.log("🔍 [ARCHIVED NOTES] Getting archived notes for user:", userId);
      
      // Obtener notas archivadas propias del usuario
      const [ownNotes] = await this.pool.query(`
        SELECT id, content, projectId, noteType, color, pinned, archived, userId, createdAt, updatedAt, created_by_admin_id, created_by_admin_username
        FROM quick_notes 
        WHERE userId = ? AND noteType = 'dashboard' AND archived = TRUE
      `, [userId]);
      
      // Obtener notas archivadas de proyectos donde es owner
      const [ownerNotes] = await this.pool.query(`
        SELECT DISTINCT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username
        FROM quick_notes qn
        INNER JOIN projects p ON qn.projectId = p.id
        WHERE p.userId = ? AND qn.noteType = 'dashboard' AND qn.archived = TRUE AND qn.userId != ?
      `, [userId, userId]);
      
      // Obtener notas archivadas de proyectos donde es miembro
      const [memberNotes] = await this.pool.query(`
        SELECT DISTINCT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username
        FROM quick_notes qn
        INNER JOIN project_members pm ON qn.projectId = pm.projectId
        WHERE pm.userId = ? AND qn.noteType = 'dashboard' AND qn.archived = TRUE AND qn.userId != ?
      `, [userId, userId]);
      
      // Combinar todas las notas y eliminar duplicados
      const allNotes = [...(ownNotes as QuickNote[]), ...(ownerNotes as QuickNote[]), ...(memberNotes as QuickNote[])];
      const uniqueNotes = allNotes.filter((note, index, self) => 
        index === self.findIndex(n => n.id === note.id)
      );
      
      // Ordenar por fecha de actualización
      const rows = uniqueNotes.sort((a, b) => 
        new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
      );
      
      console.log("📝 [ARCHIVED NOTES] Found notes:", rows.length);
      return rows as QuickNote[];
    }
    
    // Fallback para compatibilidad - solo notas archivadas del dashboard
    const [rows] = await this.pool.query(`
      SELECT id, content, projectId, noteType, color, pinned, archived, userId, createdAt, updatedAt, created_by_admin_id, created_by_admin_username 
      FROM quick_notes 
      WHERE noteType = 'dashboard' AND archived = TRUE
      ORDER BY updatedAt DESC
    `);
    return rows as QuickNote[];
  }

  async getQuickNote(id: string): Promise<QuickNote | undefined> {
    const [rows] = await this.pool.query(
      "SELECT id, content, projectId, noteType, color, pinned, archived, userId, createdAt, updatedAt, created_by_admin_id, created_by_admin_username FROM quick_notes WHERE id = ?",
      [id]
    );
    const list = rows as QuickNote[];
    return list[0];
  }

  async getQuickNotesByProject(projectId: string, userId?: string, isAdminView?: boolean): Promise<QuickNote[]> {
    if (isAdminView) {
      // Admin puede ver todas las notas del proyecto (no archivadas)
      const [rows] = await this.pool.query(`
        SELECT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username,
               u.username as created_by_username, u.full_name as created_by_full_name
        FROM quick_notes qn
        LEFT JOIN users u ON qn.userId = u.id
        WHERE qn.projectId = ? AND qn.noteType = 'project' AND qn.archived = FALSE
        ORDER BY qn.pinned DESC, qn.updatedAt DESC
      `, [projectId]);
      return rows as QuickNote[];
    }
    
    if (userId) {
      // Verificar si el usuario tiene acceso al proyecto (owner o miembro)
      const userRole = await this.getUserProjectRole(projectId, userId);
      if (!userRole) {
        // Usuario no tiene acceso al proyecto
        return [];
      }
      
      // Si tiene acceso, devolver todas las notas del proyecto
      const [rows] = await this.pool.query(`
        SELECT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username,
               u.username as created_by_username, u.full_name as created_by_full_name
        FROM quick_notes qn
        LEFT JOIN users u ON qn.userId = u.id
        WHERE qn.projectId = ? AND qn.noteType = 'project' AND qn.archived = FALSE
        ORDER BY qn.pinned DESC, qn.updatedAt DESC
      `, [projectId]);
      return rows as QuickNote[];
    }
    
    // Fallback para compatibilidad
    const [rows] = await this.pool.query(`
      SELECT qn.id, qn.content, qn.projectId, qn.noteType, qn.color, qn.pinned, qn.archived, qn.userId, qn.createdAt, qn.updatedAt, qn.created_by_admin_id, qn.created_by_admin_username,
             u.username as created_by_username, u.full_name as created_by_full_name
      FROM quick_notes qn
      LEFT JOIN users u ON qn.userId = u.id
      WHERE qn.projectId = ? AND qn.noteType = 'project' AND qn.archived = FALSE
      ORDER BY qn.pinned DESC, qn.updatedAt DESC
    `, [projectId]);
    return rows as QuickNote[];
  }

  async createQuickNote(note: InsertQuickNote & { userId?: string; created_by_admin_id?: string; created_by_admin_username?: string; assignedToUserId?: string }): Promise<QuickNote> {
    const id = randomUUID();
    const now = new Date();
    // Determinar automáticamente el noteType basado en si tiene projectId
    const noteType = note.projectId ? 'project' : 'dashboard';
    console.log("📝 [STORAGE] Creating note with projectId:", note.projectId, "noteType:", noteType, "assignedToUserId:", (note as any).assignedToUserId);
    
    await this.pool.execute(
      "INSERT INTO quick_notes (id, content, projectId, noteType, color, pinned, archived, assigned_to_user_id, createdAt, updatedAt, userId, created_by_admin_id, created_by_admin_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        note.content,
        note.projectId ?? null,
        noteType,
        note.color ?? "yellow",
        note.pinned ?? false,
        (note as any).archived ?? false,
        (note as any).assignedToUserId ?? null,
        now,
        now,
        note.userId,
        note.created_by_admin_id ?? null,
        note.created_by_admin_username ?? null,
      ]
    );

    const [rows] = await this.pool.query(
      "SELECT id, content, projectId, noteType, color, pinned, archived, assigned_to_user_id, userId, createdAt, updatedAt, created_by_admin_id, created_by_admin_username FROM quick_notes WHERE id = ?",
      [id]
    );
    const list = rows as QuickNote[];
    return list[0];
  }

  async updateQuickNote(id: string, updates: Partial<InsertQuickNote>): Promise<QuickNote | undefined> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      fields.push("content = ?");
      values.push(updates.content);
    }
    if (updates.projectId !== undefined) {
      fields.push("projectId = ?");
      values.push(updates.projectId);
    }
    if (updates.color !== undefined) {
      fields.push("color = ?");
      values.push(updates.color);
    }
    if (updates.pinned !== undefined) {
      fields.push("pinned = ?");
      values.push(updates.pinned);
    }
    if ((updates as any).archived !== undefined) {
      fields.push("archived = ?");
      values.push((updates as any).archived);
    }

    if (fields.length === 0) return this.getQuickNote(id);

    // Always update updatedAt
    fields.push("updatedAt = ?");
    values.push(new Date());

    values.push(id);
    await this.pool.execute(`UPDATE quick_notes SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.getQuickNote(id);
  }

  async deleteQuickNote(id: string): Promise<boolean> {
    const [result] = await this.pool.execute("DELETE FROM quick_notes WHERE id = ?", [id]);
    return (result as any).affectedRows > 0;
  }

  // -------- Attachments --------
  async getAttachments(entityType: 'task' | 'project', entityId: string): Promise<Attachment[]> {
    const [rows] = await this.pool.query(
      `SELECT 
        id, 
        file_name as fileName, 
        file_path as filePath, 
        file_size as fileSize, 
        file_type as fileType, 
        file_extension as fileExtension,
        entity_type as entityType,
        entity_id as entityId,
        uploaded_by as uploadedBy,
        description,
        is_image as isImage,
        uploaded_at as uploadedAt,
        updated_at as updatedAt
      FROM attachments 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY uploaded_at DESC`,
      [entityType, entityId]
    );
    return rows as Attachment[];
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const [rows] = await this.pool.query(
      `SELECT 
        id, 
        file_name as fileName, 
        file_path as filePath, 
        file_size as fileSize, 
        file_type as fileType, 
        file_extension as fileExtension,
        entity_type as entityType,
        entity_id as entityId,
        uploaded_by as uploadedBy,
        description,
        is_image as isImage,
        uploaded_at as uploadedAt,
        updated_at as updatedAt
      FROM attachments 
      WHERE id = ? 
      LIMIT 1`,
      [id]
    );
    const list = rows as Attachment[];
    return list[0];
  }

  async createAttachment(attachment: InsertAttachment & { uploadedBy: string }): Promise<Attachment> {
    const id = randomUUID();
    const now = new Date();
    
    await this.pool.execute(
      `INSERT INTO attachments 
        (id, file_name, file_path, file_size, file_type, file_extension, entity_type, entity_id, uploaded_by, description, is_image, uploaded_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        attachment.fileName,
        attachment.filePath,
        attachment.fileSize,
        attachment.fileType,
        attachment.fileExtension,
        attachment.entityType,
        attachment.entityId,
        attachment.uploadedBy,
        attachment.description ?? null,
        attachment.isImage ?? false,
        now,
        now
      ]
    );

    const created = await this.getAttachment(id);
    if (!created) throw new Error("Failed to create attachment");
    return created;
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const [result] = await this.pool.execute("DELETE FROM attachments WHERE id = ?", [id]);
    return (result as any).affectedRows > 0;
  }
}

/** Crear pool y exportar instancia lista para usar */
function createPool(): Pool {
  return mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "scrumflow",
    connectionLimit: 10,
    waitForConnections: true,
    dateStrings: false,
    timezone: "Z", // UTC
  });
}

const pool = createPool();
export const storage: IStorage = new MariaStorage(pool);

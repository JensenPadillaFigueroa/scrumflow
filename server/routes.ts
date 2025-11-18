import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { type IStorage } from "./storage";
import {
  insertProjectSchema,
  insertTaskSchema,
  insertWishlistItemSchema,
  insertReminderSchema,
  insertQuickNoteSchema,
} from "@shared/schema";
import { ZodError, z } from "zod";
import notificationsRouter, { createNotification } from "./routes/notifications";
import scheduledTasksRouter from "./routes/scheduled-tasks";
import { registerAttachmentRoutes } from "./routes/attachments";
import { registerChatRoutes } from "./routes/chat";

/** Respuesta estándar para errores de Zod */
function zodReply(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(422).json({ message: "Validation error", issues: error.issues });
  }
  return null;
}

/** Normaliza status a los valores del ENUM de DB */
type DbStatus = "wishlist" | "todo" | "in_progress" | "done";
function normalizeStatus(input: unknown): DbStatus {
  if (input == null) return "todo";
  const s = String(input).trim().toLowerCase();
  const compact = s.replace(/[\s\-_]/g, "");

  // wishlist
  if (compact === "wishlist") return "wishlist";

  // in_progress
  if (compact === "inprogress" || compact === "inprocess" || compact === "doing" || compact === "wip") {
    return "in_progress";
  }

  // done
  if (
    compact === "done" ||
    compact === "finished" ||
    compact === "complete" ||
    compact === "completed" ||
    compact === "resolved" ||
    compact === "closed"
  ) {
    return "done";
  }

  // todo (default)
  if (compact === "todo" || compact === "pending" || compact === "backlog") return "todo";

  return "todo";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get storage from app settings
  const storage = app.get("storage") as IStorage | undefined;
  if (!storage) {
    throw new Error("Storage not initialized on app. Did you call app.set('storage', storage)?");
  }

  // -------- Auth/Login --------
  const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  });

  // Obtener TODOS los proyectos (owner o colaborador) de un usuario específico
  app.get("/api/users/:id/projects", async (req, res, next) => {
    try {
      const requester = (req as any).session?.user;
      if (!requester) return res.status(401).json({ message: "Unauthorized" });

      const targetUserId = req.params.id;
      if (!targetUserId?.trim()) {
        return res.status(400).json({ message: "Missing user id" });
      }

      // Reusar la lógica de storage para obtener owner + member
      const projects = await storage.getProjects(targetUserId);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      console.log("🔐 [LOGIN] Datos recibidos:", req.body);
      const { username, password } = loginSchema.parse(req.body);
      console.log("🔐 [LOGIN] Username:", username, "Password:", password);

      // Buscar usuario en la base de datos (método específico para login)
      const user = await storage.getUserForLogin(username);
      console.log("🔐 [LOGIN] Usuario encontrado en DB:", user ? { id: user.id, username: user.username } : "No encontrado");

      if (!user) {
        console.log("❌ [LOGIN] Usuario no existe");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verificar contraseña (por ahora texto plano)
      console.log("🔐 [LOGIN] Usuario encontrado en DB:", user);
      console.log("🔐 [LOGIN] User role from DB:", user.role);
      console.log("🔐 [LOGIN] User role type:", typeof user.role);
      console.log("🔐 [LOGIN] User object keys:", Object.keys(user));
      console.log("🔐 [LOGIN] User password_hash field:", user.password_hash);
      console.log("🔐 [LOGIN] User password_hash type:", typeof user.password_hash);
      console.log("🔐 [LOGIN] Has password_hash property:", 'password_hash' in user);
      
      // Acceder al password de diferentes maneras para debugging
      const passwordFromDot = user.password_hash;
      const passwordFromBracket = user['password_hash'];
      const passwordFromObject = (user as any).password_hash;
      
      console.log("🔐 [LOGIN] Password dot notation:", passwordFromDot);
      console.log("🔐 [LOGIN] Password bracket notation:", passwordFromBracket);
      console.log("🔐 [LOGIN] Password any cast:", passwordFromObject);
      
      const passwordMatch = passwordFromBracket === password || passwordFromObject === password;
      console.log("🔐 [LOGIN] Password match:", passwordMatch, "DB password:", passwordFromBracket, "Input password:", password);

      if (!passwordMatch) {
        console.log("❌ [LOGIN] Contraseña incorrecta");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("✅ [LOGIN] Login exitoso para usuario:", username);
      
      // Guardar usuario directamente en la sesión (sin regenerate por ahora)
      console.log("🔄 [LOGIN] Guardando usuario en sesión...");
      (req as any).session.user = { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        full_name: user.full_name,
        role: user.role || 'user'  // Incluir el role
      };
      
      console.log("✅ [LOGIN] Sesión guardada:", (req as any).session.user);
      console.log("🔍 [LOGIN] Session ID:", (req as any).session.id);
      console.log("🔍 [LOGIN] User role:", user.role);

      return res.json({
        message: "Login successful",
        token: "fake-jwt-token",
        user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role },
      });
    } catch (error) {
      console.log("❌ [LOGIN] Error en login:", error);
      if (!zodReply(res, error)) next(error);
    }
  });

  // -------- Admin Endpoints --------
  console.log("🔧 [ROUTES] Registering admin endpoints");
  
  // Test endpoint
  app.get("/api/admin/test", (req, res) => {
    console.log("🧪 [ADMIN] Test endpoint hit");
    res.json({ message: "Admin endpoints working", timestamp: new Date().toISOString() });
  });
  
  app.get("/api/admin/users", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      console.log("👥 [ADMIN] Users request from:", user?.username, "role:", user?.role);
      
      if (!user || user.role !== 'admin') {
        console.log("❌ [ADMIN] Access denied - not admin");
        return res.status(403).json({ message: "Admin access required" });
      }
      
      console.log("🔍 [ADMIN] Fetching all users from database...");
      const users = await storage.getAllUsers();
      console.log("🔍 [ADMIN] Raw users from DB:", users.length, users.map(u => ({ id: u.id, username: u.username, role: u.role })));
      
      // No devolver password_hash por seguridad
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        full_name: u.full_name,
        role: u.role
      }));
      
      console.log("👥 [ADMIN] Sending safe users:", safeUsers.length, safeUsers);
      console.log("👥 [ADMIN] Response headers:", res.getHeaders());
      res.json(safeUsers);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching users:", error);
      next(error);
    }
  });

  app.post("/api/admin/impersonate", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { userId } = req.body;
      (req as any).session.impersonateUserId = userId;
      
      console.log("👤 [ADMIN] Impersonating user:", userId);
      res.json({ 
        impersonateUserId: userId, 
        message: userId ? `Now viewing as user ${userId}` : "Back to admin view"
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/view-status", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      res.json({ 
        isAdmin: user?.role === 'admin',
        impersonateUserId,
        user: user ? { id: user.id, username: user.username, role: user.role } : null
      });
    } catch (error) {
      next(error);
    }
  });

  // Crear nuevo usuario (solo admins)
  app.post("/api/admin/users", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { username, email, full_name, password, role } = req.body;

      if (!username || !email || !full_name || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Verificar que el username no exista
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const newUser = await storage.createUser({
        username,
        email,
        full_name,
        password, // En un sistema real, esto debería ser hasheado
        role: role || 'user'
      });

      console.log("👤 [CREATE USER] Admin:", user.username, "created user:", username);
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  });

  // Actualizar usuario (solo admins)
  app.put("/api/admin/users/:id", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updates = req.body;

      // Si se está actualizando el username, verificar que no exista
      if (updates.username) {
        const existingUser = await storage.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("👤 [UPDATE USER] Admin:", user.username, "updated user:", updatedUser.username);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  // Eliminar usuario (solo admins)
  app.delete("/api/admin/users/:id", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;

      // No permitir que el admin se elimine a sí mismo
      if (user.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("👤 [DELETE USER] Admin:", user.username, "deleted user with ID:", id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // -------- Projects --------
  app.get("/api/projects", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      // Si es admin y está impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      
      const projects = await storage.getProjects(effectiveUserId);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/projects/:id", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const projectId = req.params.id;
      
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      
      // Verificar permisos si no es admin
      if (user && user.role !== 'admin') {
        const userRole = await storage.getUserProjectRole(projectId, user.id);
        if (!userRole) {
          return res.status(403).json({ message: "Access denied to this project" });
        }
      }
      
      res.json(project);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Si es admin impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      const isAdminCreation = user?.role === 'admin' && impersonateUserId;
      
      // Validar solo los campos que vienen del frontend (sin userId)
      const frontendSchema = insertProjectSchema.omit({ userId: true });
      const validated = frontendSchema.parse(req.body);
      const projectWithUser = { 
        ...validated, 
        userId: effectiveUserId,
        created_by_admin_id: isAdminCreation ? user.id : null,
        created_by_admin_username: isAdminCreation ? user.username : null
      };
      
      const project = await storage.createProject(projectWithUser as any);
      
      // Si fue creado por admin, agregar información adicional en la respuesta
      const response = isAdminCreation ? {
        ...project,
        _adminCreated: true,
        _adminUsername: user.username,
        _targetUsername: (await storage.getAllUsers()).find(u => u.id === impersonateUserId)?.username
      } : project;
      
      res.status(201).json(response);
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  app.put("/api/projects/:id", async (req, res, next) => {
    try {
      const validated = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validated);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  app.delete("/api/projects/:id", async (req, res, next) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) return res.status(404).json({ message: "Project not found" });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // -------- Project Members --------
  // Obtener todos los miembros de todos los proyectos del usuario (optimizado)
  app.get("/api/all-project-members", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      // Obtener todos los proyectos del usuario
      const projects = await storage.getProjects(user.id);
      const projectIds = projects.map(p => p.id);

      if (projectIds.length === 0) {
        return res.json([]);
      }

      // Obtener todos los miembros de esos proyectos en una sola query
      const allMembers = await storage.getAllProjectMembersByProjectIds(projectIds);
      
      res.json(allMembers);
    } catch (error) {
      next(error);
    }
  });

  // Obtener todos los project members (para filtrar proyectos por usuario)
  app.get("/api/project-members/all", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const members = await storage.getAllProjectMembers();
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  // Obtener miembros de un proyecto
  app.get("/api/projects/:id/members", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const projectId = req.params.id;
      
      // Verificar que el usuario tiene acceso al proyecto
      const userRole = await storage.getUserProjectRole(projectId, user.id);
      if (!userRole && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getProjectMembers(projectId);
      
      // Obtener información de usuarios para cada miembro
      const allUsers = await storage.getAllUsers();
      const membersWithUserInfo = members.map(member => {
        const userInfo = allUsers.find(u => u.id === member.userId);
        return {
          ...member,
          username: userInfo?.username,
          fullName: userInfo?.full_name,
          email: userInfo?.email
        };
      });

      res.json(membersWithUserInfo);
    } catch (error) {
      next(error);
    }
  });

  // Agregar miembro a un proyecto
  app.post("/api/projects/:id/members", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const projectId = req.params.id;
      const { userId, role = "member" } = req.body;

      // Verificar que el usuario es owner o admin del proyecto
      const userRole = await storage.getUserProjectRole(projectId, user.id);
      if (userRole !== "owner" && user.role !== 'admin') {
        return res.status(403).json({ message: "Only project owners can add members" });
      }

      // Verificar que el usuario a agregar existe
      const targetUser = await storage.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verificar que no es ya miembro
      const existingRole = await storage.getUserProjectRole(projectId, userId);
      if (existingRole) {
        return res.status(400).json({ message: "User is already a member of this project" });
      }

      const member = await storage.addProjectMember({
        projectId,
        userId,
        role
      });

      // Enviar respuesta inmediatamente
      res.status(201).json(member);

      // Crear notificaciones DESPUÉS de enviar la respuesta (sin bloquear)
      if ((storage as any).pool) {
        setImmediate(() => {
          (async () => {
            try {
              const project = await storage.getProject(projectId);
              const newUser = await storage.getUserById(userId);
              
              if (project && newUser) {
                // 1. Notificar al nuevo miembro
                await createNotification((storage as any).pool, {
                  userId: userId,
                  type: "project_invite",
                  title: "Added to project",
                  message: `You've been added as a ${role} to: ${project.name}`,
                  metadata: { projectId, role }
                });
                
                // 2. Notificar a todos los miembros existentes sobre el nuevo miembro
                const projectMembers = await storage.getProjectMembers(projectId);
                for (const member of projectMembers) {
                  // No notificar al nuevo miembro ni a quien lo agregó
                  if (member.userId !== userId && member.userId !== user.id) {
                    await createNotification((storage as any).pool, {
                      userId: member.userId,
                      type: "new_member_joined",
                      title: `New member in ${project.name}`,
                      message: `${newUser.username} joined ${project.name} as a ${role}`,
                      metadata: { projectId, newUserId: userId, newUsername: newUser.username }
                    });
                  }
                }
              }
            } catch (notifError) {
              console.error("❌ [NOTIFICATION] Error creating project member notifications:", notifError);
            }
          })();
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Actualizar rol de miembro
  app.put("/api/projects/:id/members/:userId", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { id: projectId, userId: targetUserId } = req.params;
      const { role } = req.body;

      // Verificar que el usuario es owner o admin del proyecto
      const userRole = await storage.getUserProjectRole(projectId, user.id);
      if (userRole !== "owner" && user.role !== 'admin') {
        return res.status(403).json({ message: "Only project owners can update member roles" });
      }

      const updatedMember = await storage.updateProjectMemberRole(projectId, targetUserId, role);
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(updatedMember);
    } catch (error) {
      next(error);
    }
  });

  // Remover miembro de proyecto
  app.delete("/api/projects/:id/members/:userId", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { id: projectId, userId: targetUserId } = req.params;

      // Verificar que el usuario es owner o admin del proyecto, o se está removiendo a sí mismo
      const userRole = await storage.getUserProjectRole(projectId, user.id);
      if (userRole !== "owner" && user.role !== 'admin' && user.id !== targetUserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Obtener proyecto antes de remover para notificación
      const project = await storage.getProject(projectId);

      const success = await storage.removeProjectMember(projectId, targetUserId);
      if (!success) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Enviar respuesta inmediatamente
      res.status(204).send();
      
      // Crear notificación DESPUÉS de enviar la respuesta
      if (project && (storage as any).pool) {
        setImmediate(() => {
          (async () => {
            try {
              // Notificar al usuario removido (a menos que se haya removido a sí mismo)
              if (user.id !== targetUserId) {
                await createNotification((storage as any).pool, {
                  userId: targetUserId,
                  type: "project_removed",
                  title: "Removed from project",
                  message: `You have been removed from project: ${project.name}`,
                  metadata: { projectId }
                });
              }
            } catch (notifError) {
              console.error("❌ [NOTIFICATION] Error creating project removed notification:", notifError);
            }
          })();
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // -------- Users (Public) --------
  // Endpoint público para obtener usuarios (para compartir proyectos)
  app.get("/api/users", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      console.log("👥 [USERS] Public users request from:", user.username, "role:", user.role);
      
      const users = await storage.getAllUsers();
      
      // Devolver solo información básica (sin password_hash)
      const publicUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        role: u.role
      }));
      
      console.log("👥 [USERS] Returning", publicUsers.length, "users");
      res.json(publicUsers);
    } catch (error) {
      console.error("❌ [USERS] Error:", error);
      next(error);
    }
  });

  app.get("/api/tasks", async (req, res, next) => {
    try {
      const { projectId: projectIdQ, status } = req.query as { projectId?: string; status?: string };
      const projectId = projectIdQ?.trim() ? projectIdQ : undefined;
      
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;

      let tasks = projectId
        ? await storage.getTasksByProject(projectId, effectiveUserId)
        : await storage.getTasks(effectiveUserId);

      let normalizedQueryStatus: DbStatus | undefined = undefined;
      if (status) {
        normalizedQueryStatus = normalizeStatus(status);
        tasks = tasks.filter(t => t.status === normalizedQueryStatus);
      }

      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tasks", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user?.id) {
        console.log("❌ [POST /api/tasks] No user in session");
        console.log("🔍 [POST /api/tasks] Session exists:", !!(req as any).session);
        console.log("🔍 [POST /api/tasks] Session ID:", (req as any).session?.id);
        console.log("🔍 [POST /api/tasks] Session user:", user);
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Si es admin impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      const isAdminCreation = user?.role === 'admin' && impersonateUserId;

      // 1) Normaliza status en el body entrante
      const body: any = { ...req.body };
      const rawStatus = body.status;
      body.status = normalizeStatus(body.status);

      // 2) Valida con Zod
      const validated = insertTaskSchema.parse(body);

      // 3) Si no se especifica assignedTo, asignar al owner del proyecto
      let assignedTo = validated.assignedTo;
      if (!assignedTo && validated.projectId) {
        const project = await storage.getProject(validated.projectId);
        assignedTo = project?.userId;
      }

      // 4) Reinyecta `status` normalizado, userId y assignedTo
      // Si focusUserId viene en el body, usarlo; si no, y focusToday es true, usar assignedTo o effectiveUserId
      let focusUserId = body.focusUserId;
      if (!focusUserId && body.focusToday) {
        focusUserId = assignedTo || effectiveUserId;
      }

      const payload = {
        ...validated,
        status: body.status as DbStatus,
        userId: effectiveUserId,
        assignedTo: assignedTo || effectiveUserId,
        focusToday: body.focusToday ? 1 : 0,
        focusUserId: focusUserId || null,
        focusDate: focusUserId ? new Date().toISOString().split('T')[0] : null,
        created_by_admin_id: isAdminCreation ? user.id : null,
        created_by_admin_username: isAdminCreation ? user.username : null
      };

      // 🔎 LOG: Qué llegó y qué guardamos
      console.log("🆕 [POST /api/tasks] crear task", {
        rawStatus,
        normalizedStatus: body.status,
        payloadStatus: payload.status,
        title: payload.title,
        projectId: payload.projectId ?? null,
        effectiveUserId,
        isAdminCreation,
        adminUser: user?.username,
        focusToday: payload.focusToday,
        focusUserId: payload.focusUserId,
        focusDate: payload.focusDate,
      });

      const task = await storage.createTask(payload as any);
      
      // Si fue creado por admin, agregar información adicional en la respuesta
      const response = isAdminCreation ? {
        ...task,
        _adminCreated: true,
        _adminUsername: user.username,
        _targetUsername: (await storage.getAllUsers()).find(u => u.id === impersonateUserId)?.username
      } : task;
      
      // Enviar respuesta inmediatamente
      res.status(201).json(response);
      
      // Crear notificaciones DESPUÉS de enviar la respuesta (sin bloquear)
      if (task.projectId && (storage as any).pool) {
        setImmediate(() => {
          (async () => {
            try {
              if (!task.projectId) return;
              
              const project = await storage.getProject(task.projectId);
              const projectMembers = await storage.getProjectMembers(task.projectId);
              const creator = await storage.getUserById(effectiveUserId);
              
              if (project && creator) {
                const notificationMessage = `${creator.username} created "${task.title}" in ${project.name}`;
                
                // Notificar al owner del proyecto si no es el creador de la tarea
                if (project.userId !== effectiveUserId) {
                  await createNotification((storage as any).pool, {
                    userId: project.userId,
                    type: "task_created",
                    title: `New task in ${project.name}`,
                    message: notificationMessage,
                    metadata: { projectId: task.projectId, taskId: task.id, createdBy: creator.username }
                  });
                }
                
                // Notificar a todos los colaboradores excepto al creador
                for (const member of projectMembers) {
                  if (member.userId !== effectiveUserId && member.userId !== project.userId) {
                    await createNotification((storage as any).pool, {
                      userId: member.userId,
                      type: "task_created",
                      title: `New task in ${project.name}`,
                      message: notificationMessage,
                      metadata: { projectId: task.projectId, taskId: task.id, createdBy: creator.username }
                    });
                  }
                }
                
                // Si la tarea tiene un assignedTo y es diferente al creador, notificar
                if (task.assignedTo && task.assignedTo !== effectiveUserId) {
                  await createNotification((storage as any).pool, {
                    userId: task.assignedTo,
                    type: "task_assigned",
                    title: `Task assigned in ${project.name}`,
                    message: `${creator.username} assigned you to "${task.title}"`,
                    metadata: { projectId: task.projectId, taskId: task.id, assignedBy: creator.username }
                  });
                }
              }
            } catch (notifError) {
              console.error("❌ [NOTIFICATION] Error creating task notifications:", notifError);
            }
          })();
        });
      }
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  app.put("/api/tasks/:id", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const body: any = { ...req.body };
      const rawStatus = body.status;
      if (body.status !== undefined) {
        body.status = normalizeStatus(body.status);
      }

      // Remove fields that are not in the schema before validation
      const { 
        focusToday, 
        focusDate, 
        focusUserId,
        completionNotes,
        created_by_username,
        created_by_full_name,
        assigned_to_username,
        assigned_to_full_name,
        source_type,
        order_index,
        ...bodyForValidation 
      } = body;
      
      const validated = insertTaskSchema.partial().parse(bodyForValidation);

      // Obtener tarea existente para posibles fallbacks
      const existingTask = await storage.getTask(req.params.id);

      // Calcular assignedTo si vino en el body.
      // Si viene vacío ("" | null), usar owner del proyecto (del body.projectId o de la tarea existente)
      let assignedToComputed: string | null | undefined = undefined;
      const hasAssignedTo = Object.prototype.hasOwnProperty.call(validated, "assignedTo");
      if (hasAssignedTo) {
        assignedToComputed = (validated as any).assignedTo ?? null;
        if (!assignedToComputed) {
          const projectIdForFallback = (validated as any).projectId ?? existingTask?.projectId;
          if (projectIdForFallback) {
            const project = await storage.getProject(projectIdForFallback);
            assignedToComputed = project?.userId ?? null;
          }
        }
      }

      const payload = {
        ...validated,
        ...(body.status !== undefined ? { status: body.status as DbStatus } : {}),
        ...(hasAssignedTo ? { assignedTo: assignedToComputed } : {}),
        ...(completionNotes !== undefined ? { completionNotes } : {}),
      };

      // Auto-manage Today's Focus based on status changes
      if (existingTask && body.status && existingTask.status !== body.status) {
        const today = new Date().toISOString().split('T')[0];
        
        // Add to focus when moved to in_progress (only if not already in focus)
        if (body.status === 'in_progress' && !existingTask.focusToday) {
          (payload as any).focusToday = true;
          (payload as any).focusDate = today;
          (payload as any).focusUserId = assignedToComputed || user.id;
        }
        
        // Note: When moving to todo/wishlist, we DON'T remove focus automatically
        // User must manually remove focus using the focus button
        // This allows tasks to stay in focus even when moved back to todo
      }

      // 🔎 LOG: Qué llegó y qué guardamos en update
      console.log("✏️  [PUT /api/tasks/:id] actualizar task", {
        id: req.params.id,
        rawStatus,
        normalizedStatus: body.status,
        payloadStatus: (payload as any).status,
        hasAssignedTo,
        assignedToInBody: (validated as any).assignedTo,
        assignedToComputed,
        payloadAssignedTo: (payload as any).assignedTo,
      });

      const task = await storage.updateTask(req.params.id, payload as any);
      if (!task) return res.status(404).json({ message: "Task not found" });
      
      // Enviar respuesta inmediatamente
      res.json(task);
      
      // Crear notificaciones DESPUÉS de enviar la respuesta (sin bloquear)
      if (existingTask && task.projectId && (storage as any).pool) {
        setImmediate(() => {
          (async () => {
            try {
              if (!task.projectId) return;
              
              const project = await storage.getProject(task.projectId);
              const projectMembers = await storage.getProjectMembers(task.projectId);
              const updatedBy = await storage.getUserById(user.id);
              
              if (!project || !updatedBy) return;
              
              // 1. Notificación de tarea completada (cuando cambia a done)
              if (task.status === "done" && existingTask.status !== "done") {
                const notificationMessage = `${updatedBy.username} completed "${task.title}" in ${project.name}`;
                
                if (project.userId !== user.id) {
                  await createNotification((storage as any).pool, {
                    userId: project.userId,
                    type: "task_completed",
                    title: `Task completed in ${project.name}`,
                    message: notificationMessage,
                    metadata: { projectId: task.projectId, taskId: task.id, completedBy: updatedBy.username }
                  });
                }
                
                for (const member of projectMembers) {
                  if (member.userId !== user.id && member.userId !== project.userId) {
                    await createNotification((storage as any).pool, {
                      userId: member.userId,
                      type: "task_completed",
                      title: `Task completed in ${project.name}`,
                      message: notificationMessage,
                      metadata: { projectId: task.projectId, taskId: task.id, completedBy: updatedBy.username }
                    });
                  }
                }
                
                if (task.assignedTo && task.assignedTo !== user.id) {
                  await createNotification((storage as any).pool, {
                    userId: task.assignedTo,
                    type: "task_completed",
                    title: `Your task was completed in ${project.name}`,
                    message: notificationMessage,
                    metadata: { projectId: task.projectId, taskId: task.id, completedBy: updatedBy.username }
                  });
                }
                
                // Verificar si todas las tareas del proyecto están completadas
                const allProjectTasks = await storage.getTasks(task.projectId);
                const allCompleted = allProjectTasks.length > 0 && allProjectTasks.every(t => t.status === "done");
                
                if (allCompleted) {
                  // Notificar a todos los miembros del proyecto que está completado
                  const projectCompletedMessage = `🎉 Congratulations! All tasks in ${project.name} are completed!`;
                  
                  if (project.userId) {
                    await createNotification((storage as any).pool, {
                      userId: project.userId,
                      type: "project_completed",
                      title: `Project completed: ${project.name}`,
                      message: projectCompletedMessage,
                      metadata: { projectId: task.projectId, totalTasks: allProjectTasks.length }
                    });
                  }
                  
                  for (const member of projectMembers) {
                    if (member.userId !== project.userId) {
                      await createNotification((storage as any).pool, {
                        userId: member.userId,
                        type: "project_completed",
                        title: `Project completed: ${project.name}`,
                        message: projectCompletedMessage,
                        metadata: { projectId: task.projectId, totalTasks: allProjectTasks.length }
                      });
                    }
                  }
                }
              }
              
              // 2. Notificación de cambio de estado (cualquier cambio de columna)
              else if (existingTask.status !== task.status) {
                const statusMap: Record<string, string> = {
                  wishlist: "WISHLIST",
                  todo: "TODO",
                  in_progress: "IN PROGRESS",
                  done: "DONE"
                };
                const notificationMessage = `${updatedBy.username} moved "${task.title}" from ${statusMap[existingTask.status]} to ${statusMap[task.status]}`;
                
                // Notificar al asignado si no es quien lo movió
                if (task.assignedTo && task.assignedTo !== user.id) {
                  await createNotification((storage as any).pool, {
                    userId: task.assignedTo,
                    type: "status_changed",
                    title: `Task moved in ${project.name}`,
                    message: notificationMessage,
                    metadata: { 
                      projectId: task.projectId, 
                      taskId: task.id, 
                      changedBy: updatedBy.username,
                      oldStatus: existingTask.status,
                      newStatus: task.status
                    }
                  });
                }
              }
              
              // 3. Notificación de tarea editada (cambios en título o descripción)
              if (existingTask.title !== task.title || existingTask.description !== task.description) {
                const notificationMessage = `${updatedBy.username} updated "${task.title}" in ${project.name}`;
                
                // Notificar al asignado si no es quien lo editó
                if (task.assignedTo && task.assignedTo !== user.id) {
                  await createNotification((storage as any).pool, {
                    userId: task.assignedTo,
                    type: "task_updated",
                    title: `Task updated in ${project.name}`,
                    message: notificationMessage,
                    metadata: { projectId: task.projectId, taskId: task.id, updatedBy: updatedBy.username }
                  });
                }
              }
              
            } catch (notifError) {
              console.error("❌ [NOTIFICATION] Error creating task update notifications:", notifError);
            }
          })();
        });
      }
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  app.delete("/api/tasks/:id", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Obtener tarea antes de eliminar para notificaciones
      const task = await storage.getTask(req.params.id);
      
      const success = await storage.deleteTask(req.params.id);
      if (!success) return res.status(404).json({ message: "Task not found" });
      
      // Enviar respuesta inmediatamente
      res.status(204).send();
      
      // Crear notificación DESPUÉS de enviar la respuesta
      if (task && task.projectId && (storage as any).pool) {
        setImmediate(() => {
          (async () => {
            try {
              if (!task.projectId) return;
              
              const project = await storage.getProject(task.projectId);
              const deletedBy = await storage.getUserById(user.id);
              
              if (project && deletedBy) {
                const notificationMessage = `${deletedBy.username} deleted task "${task.title}" from ${project.name}`;
                
                // Notificar al asignado si no es quien la eliminó
                if (task.assignedTo && task.assignedTo !== user.id) {
                  await createNotification((storage as any).pool, {
                    userId: task.assignedTo,
                    type: "task_deleted",
                    title: `Task deleted in ${project.name}`,
                    message: notificationMessage,
                    metadata: { projectId: task.projectId, deletedBy: deletedBy.username }
                  });
                }
              }
            } catch (notifError) {
              console.error("❌ [NOTIFICATION] Error creating task deleted notification:", notifError);
            }
          })();
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // -------- Today's Focus --------
  app.get("/api/projects/:projectId/todays-focus", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { projectId } = req.params;
      const tasks = await storage.getTodaysFocusTasks(projectId, user.id);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  // Get team focus - all focus tasks grouped by user
  app.get("/api/projects/:projectId/team-focus", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { projectId } = req.params;
      
      // Verify user has access to project
      const userRole = await storage.getUserProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const teamFocus = await storage.getTeamFocusTasks(projectId);
      res.json(teamFocus);
    } catch (error) {
      next(error);
    }
  });

  // Toggle focus_today for a task
  app.patch("/api/tasks/:id/toggle-focus", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const task = await storage.toggleTaskFocus(id, user.id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard: Get My Focus tasks (all projects)
  app.get("/api/dashboard/my-focus", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      
      // Get all focus tasks for the user across all projects
      const tasks = await storage.getDashboardMyFocus(effectiveUserId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard: Get Team Focus tasks (all collaborative projects)
  app.get("/api/dashboard/team-focus", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      
      // Get team focus from all collaborative projects
      const teamFocus = await storage.getDashboardTeamFocus(effectiveUserId);
      res.json(teamFocus);
    } catch (error) {
      next(error);
    }
  });

  // -------- Wishlist --------
  app.get("/api/wishlist", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      // Si es admin y está impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      
      const items = await storage.getWishlistItems(effectiveUserId, false);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/wishlist", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Si es admin impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      const isAdminCreation = user?.role === 'admin' && impersonateUserId;
      
      const validated = insertWishlistItemSchema.parse(req.body);
      const itemWithUser = { 
        ...validated, 
        userId: effectiveUserId,
        created_by_admin_id: isAdminCreation ? user.id : null,
        created_by_admin_username: isAdminCreation ? user.username : null
      };
      
      const item = await storage.createWishlistItem(itemWithUser as any);
      
      // Si fue creado por admin, agregar información adicional en la respuesta
      const response = isAdminCreation ? {
        ...item,
        _adminCreated: true,
        _adminUsername: user.username,
        _targetUsername: (await storage.getAllUsers()).find(u => u.id === impersonateUserId)?.username
      } : item;
      
      res.status(201).json(response);
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  app.delete("/api/wishlist/:id", async (req, res, next) => {
    try {
      const success = await storage.deleteWishlistItem(req.params.id);
      if (!success) return res.status(404).json({ message: "Wishlist item not found" });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/wishlist/:id/promote", async (req, res, next) => {
    try {
      const project = await storage.promoteWishlistItemToProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Wishlist item not found" });
      res.json(project);
    } catch (error) {
      next(error);
    }
  });

  // -------- Reminders --------
  app.get("/api/reminders", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      // Si es admin y está impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      
      console.log("🔍 [REMINDERS] User:", user?.username);
      console.log("🔍 [REMINDERS] Impersonating:", impersonateUserId);
      console.log("🔍 [REMINDERS] Effective userId:", effectiveUserId);
      
      const reminders = await storage.getReminders(effectiveUserId, false);
      console.log("📋 [REMINDERS] Found reminders:", reminders.length);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/reminders", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user?.id) {
        console.log("❌ [CREATE REMINDER] No user found in session");
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Si es admin impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      const isAdminCreation = user?.role === 'admin' && impersonateUserId;
      
      console.log("📝 [CREATE REMINDER] User:", user?.username);
      console.log("📝 [CREATE REMINDER] Impersonating:", impersonateUserId);
      console.log("📝 [CREATE REMINDER] Effective userId:", effectiveUserId);
      console.log("📝 [CREATE REMINDER] Admin creation:", isAdminCreation);
      
      console.log("📥 Backend - Datos recibidos del frontend:", req.body);
      
      const validated = insertReminderSchema.parse(req.body);
      const reminderWithUser = { 
        ...validated, 
        userId: effectiveUserId,
        created_by_admin_id: isAdminCreation ? user.id : null,
        created_by_admin_username: isAdminCreation ? user.username : null
      };
      console.log("🆕 [CREATE REMINDER] Final payload:", reminderWithUser);
      
      const reminder = await storage.createReminder(reminderWithUser as any);
      
      // Si fue creado por admin, agregar información adicional en la respuesta
      const response = isAdminCreation ? {
        ...reminder,
        _adminCreated: true,
        _adminUsername: user.username,
        _targetUsername: (await storage.getAllUsers()).find(u => u.id === impersonateUserId)?.username
      } : reminder;
      
      res.status(201).json(response);
    } catch (error) {
      console.log("❌ Backend - Error en validación:", error);
      if (!zodReply(res, error)) next(error);
    }
  });

  app.get("/api/reminders/:id", async (req, res, next) => {
    try {
      const reminder = await storage.getReminder(req.params.id);
      if (!reminder) return res.status(404).json({ message: "Reminder not found" });
      res.json(reminder);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/reminders/:id", async (req, res, next) => {
    try {
      const validated = insertReminderSchema.partial().parse(req.body);
      const reminder = await storage.updateReminder(req.params.id, validated);
      if (!reminder) return res.status(404).json({ message: "Reminder not found" });
      res.json(reminder);
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  app.delete("/api/reminders/:id", async (req, res, next) => {
    try {
      const success = await storage.deleteReminder(req.params.id);
      if (!success) return res.status(404).json({ message: "Reminder not found" });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // -------- Quick Notes --------
  app.get("/api/quick-notes", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      // Si es admin y está impersonando, usar el userId de impersonación
      // Si es admin en su vista personal, usar su propio userId (no isAdminView)
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      
      console.log("🔍 [QUICK-NOTES] User:", user?.username, "ID:", user?.id);
      console.log("🔍 [QUICK-NOTES] Impersonating:", impersonateUserId);
      console.log("🔍 [QUICK-NOTES] Effective userId:", effectiveUserId);
      
      // Siempre filtrar por userId, nunca mostrar todas las notas
      const notes = await storage.getQuickNotes(effectiveUserId, false);
      console.log("📋 [QUICK-NOTES] Found notes:", notes.length);
      console.log("📋 [QUICK-NOTES] Notes details:", notes.map(n => ({ 
        id: n.id, 
        content: n.content?.substring(0, 30) + "...", 
        userId: (n as any).userId, 
        projectId: n.projectId,
        noteType: n.noteType 
      })));
      res.json(notes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/quick-notes", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Si es admin impersonando, usar el userId de impersonación
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      const isAdminCreation = user?.role === 'admin' && impersonateUserId;
      
      console.log("📝 [CREATE QUICK-NOTE] User:", user?.username);
      console.log("📝 [CREATE QUICK-NOTE] Impersonating:", impersonateUserId);
      console.log("📝 [CREATE QUICK-NOTE] Effective userId:", effectiveUserId);
      console.log("📝 [CREATE QUICK-NOTE] Admin creation:", isAdminCreation);
      console.log("📝 [CREATE QUICK-NOTE] Request body:", req.body);
      
      const validated = insertQuickNoteSchema.parse(req.body);
      console.log("📝 [CREATE QUICK-NOTE] Validated data:", validated);
      console.log("📝 [CREATE QUICK-NOTE] ProjectId from body:", req.body.projectId);
      console.log("📝 [CREATE QUICK-NOTE] NoteType from body:", req.body.noteType);
      const noteWithUser = { 
        ...validated, 
        userId: effectiveUserId,
        created_by_admin_id: isAdminCreation ? user.id : null,
        created_by_admin_username: isAdminCreation ? user.username : null
      };
      
      const note = await storage.createQuickNote(noteWithUser as any);
      
      // Si fue creado por admin, agregar información adicional en la respuesta
      const response = isAdminCreation ? {
        ...note,
        _adminCreated: true,
        _adminUsername: user.username,
        _targetUsername: (await storage.getAllUsers()).find(u => u.id === impersonateUserId)?.username
      } : note;
      
      res.status(201).json(response);
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  // Obtener notas archivadas
  app.get("/api/quick-notes/archived", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      // Si es admin y está impersonando, usar el userId de impersonación
      // Si es admin en su vista personal, usar su propio userId (no isAdminView)
      const effectiveUserId = user?.role === 'admin' && impersonateUserId ? impersonateUserId : user?.id;
      
      console.log("📦 [ARCHIVED-NOTES] User:", user?.username);
      console.log("📦 [ARCHIVED-NOTES] Effective userId:", effectiveUserId);
      
      // Siempre filtrar por userId, nunca mostrar todas las notas archivadas
      const notes = await storage.getArchivedQuickNotes(effectiveUserId, false);
      console.log("📦 [ARCHIVED-NOTES] Found archived notes:", notes.length);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/quick-notes/:id", async (req, res, next) => {
    try {
      const note = await storage.getQuickNote(req.params.id);
      if (!note) return res.status(404).json({ message: "Quick note not found" });
      res.json(note);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/quick-notes/:id", async (req, res, next) => {
    try {
      const validated = insertQuickNoteSchema.partial().parse(req.body);
      const note = await storage.updateQuickNote(req.params.id, validated);
      if (!note) return res.status(404).json({ message: "Quick note not found" });
      res.json(note);
    } catch (error) {
      if (!zodReply(res, error)) next(error);
    }
  });

  app.delete("/api/quick-notes/:id", async (req, res, next) => {
    try {
      const success = await storage.deleteQuickNote(req.params.id);
      if (!success) return res.status(404).json({ message: "Quick note not found" });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Get quick notes by project
  app.get("/api/quick-notes/project/:projectId", async (req, res, next) => {
    try {
      const user = (req as any).session?.user;
      const impersonateUserId = (req as any).session?.impersonateUserId;
      
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const targetUserId = impersonateUserId || user.id;
      const isAdminView = user.role === "admin" && !impersonateUserId;

      const notes = await storage.getQuickNotesByProject(req.params.projectId, targetUserId, isAdminView);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  });

  // -------- Notifications --------
  app.use("/api/notifications", notificationsRouter);

  // -------- Scheduled Tasks --------
  app.use("/api/scheduled-tasks", scheduledTasksRouter);

  // -------- Attachments --------
  registerAttachmentRoutes(app, storage);

  // -------- Chat --------
  registerChatRoutes(app, storage);

  const httpServer = createServer(app);
  return httpServer;
}

export * from "./storage";

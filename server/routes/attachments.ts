import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type { IStorage } from "../storage";
import { createNotification } from "./notifications";

// Configurar multer para almacenamiento de archivos
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    // Multer procesa el archivo antes que el body, así que usamos un directorio temporal
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de archivos permitidos
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos de archivo permitidos
  const allowedMimes = [
    // Imágenes
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Texto
    'text/plain', 'text/csv',
    // Comprimidos
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/x-7z-compressed',
    // Otros
    'application/json',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
  }
});

export function registerAttachmentRoutes(app: Express, storage: IStorage) {
  
  // IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros genéricos
  
  // Ver/Abrir un archivo (inline en el navegador)
  app.get("/api/attachments/view/:id", async (req: Request, res: Response) => {
    try {
      console.log('👁️ [ATTACHMENTS] View request:', {
        id: req.params.id,
        user: (req as any).session?.user?.username
      });

      const user = (req as any).session?.user;
      if (!user) {
        console.log('❌ [ATTACHMENTS] Unauthorized - no user session');
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const attachment = await storage.getAttachment(id);

      if (!attachment) {
        console.log('❌ [ATTACHMENTS] Attachment not found:', id);
        return res.status(404).json({ message: "Attachment not found" });
      }

      console.log('✅ [ATTACHMENTS] Found attachment:', {
        id: attachment.id,
        fileName: attachment.fileName,
        filePath: attachment.filePath,
        fileType: attachment.fileType
      });

      // Verificar que el archivo existe
      if (!fs.existsSync(attachment.filePath)) {
        console.log('❌ [ATTACHMENTS] File not found on disk:', attachment.filePath);
        return res.status(404).json({ message: "File not found on server" });
      }

      // Enviar el archivo para visualización inline
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`);
      res.sendFile(attachment.filePath);
      
      console.log('✅ [ATTACHMENTS] File sent successfully');
    } catch (error: any) {
      console.error("❌ [ATTACHMENTS] Error viewing file:", error);
      res.status(500).json({ message: error.message || "Failed to view file" });
    }
  });

  // Descargar un archivo (fuerza descarga)
  app.get("/api/attachments/download/:id", async (req: Request, res: Response) => {
    try {
      console.log('⬇️ [ATTACHMENTS] Download request:', {
        id: req.params.id,
        user: (req as any).session?.user?.username
      });

      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const attachment = await storage.getAttachment(id);

      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // Verificar que el archivo existe
      if (!fs.existsSync(attachment.filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      // Enviar el archivo para descarga
      res.download(attachment.filePath, attachment.fileName);
    } catch (error) {
      console.error("❌ [ATTACHMENTS] Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Obtener attachments de una entidad (task o project)
  app.get("/api/attachments/:entityType/:entityId", async (req: Request, res: Response) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { entityType, entityId } = req.params;
      
      if (entityType !== 'task' && entityType !== 'project') {
        return res.status(400).json({ message: "Invalid entity type. Must be 'task' or 'project'" });
      }

      const attachments = await storage.getAttachments(entityType as 'task' | 'project', entityId);
      
      // Agregar información del usuario que subió cada archivo
      const allUsers = await storage.getAllUsers();
      const attachmentsWithUserInfo = attachments.map(att => {
        const uploader = allUsers.find(u => u.id === att.uploadedBy);
        return {
          ...att,
          uploaderUsername: uploader?.username,
          uploaderFullName: uploader?.full_name
        };
      });

      res.json(attachmentsWithUserInfo);
    } catch (error) {
      console.error("❌ [ATTACHMENTS] Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  // Subir un archivo
  app.post("/api/attachments/upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { entityType, entityId, description } = req.body;

      console.log('📥 [ATTACHMENTS] Upload request:', {
        entityType,
        entityId,
        fileName: req.file.originalname,
        tempPath: req.file.path,
        user: user.username
      });

      if (!entityType || !entityId) {
        // Eliminar el archivo subido si falta información
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Entity type and ID are required" });
      }

      if (entityType !== 'task' && entityType !== 'project') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Invalid entity type" });
      }

      // Verificar que el usuario tenga acceso a la entidad y obtener info para notificaciones
      let task: any = null;
      let project: any = null;
      let projectMembers: any[] = [];

      if (entityType === 'task') {
        task = await storage.getTask(entityId);
        if (!task) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ message: "Task not found" });
        }
        // Obtener el proyecto de la task para notificaciones
        if (task.projectId) {
          project = await storage.getProject(task.projectId);
          projectMembers = await storage.getProjectMembers(task.projectId);
        }
      } else if (entityType === 'project') {
        project = await storage.getProject(entityId);
        if (!project) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ message: "Project not found" });
        }
        projectMembers = await storage.getProjectMembers(entityId);
      }

      // Mover archivo de temp a la carpeta correcta
      const finalDir = path.join(process.cwd(), 'uploads', entityType + 's', entityId);
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }

      const finalPath = path.join(finalDir, path.basename(req.file.path));
      fs.renameSync(req.file.path, finalPath);

      // Determinar si es una imagen
      const isImage = req.file.mimetype.startsWith('image/');

      // Guardar en la base de datos
      const attachment = await storage.createAttachment({
        fileName: req.file.originalname,
        filePath: finalPath,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        fileExtension: path.extname(req.file.originalname),
        entityType: entityType as 'task' | 'project',
        entityId: entityId,
        uploadedBy: user.id,
        description: description || null,
        isImage: isImage
      });

      console.log(`✅ [ATTACHMENTS] File uploaded: ${req.file.originalname} by ${user.username} to ${finalPath}`);

      // Crear notificaciones
      const pool = (storage as any).pool;
      const fileIcon = isImage ? '🖼️' : '📎';
      
      if (entityType === 'task' && task && project) {
        // Notificación para archivo subido en task
        const taskTitle = task.title || 'Untitled task';
        const projectName = project.name || 'Unknown project';
        
        // Notificar al owner del proyecto si no es quien subió
        if (project.userId && project.userId !== user.id) {
          await createNotification(pool, {
            userId: project.userId,
            type: 'file_uploaded',
            title: `${fileIcon} File uploaded in ${projectName}`,
            message: `${user.username} uploaded "${req.file.originalname}" to task "${taskTitle}"`,
            metadata: {
              projectId: project.id,
              projectName: project.name,
              taskId: task.id,
              taskTitle: task.title,
              attachmentId: attachment.id,
              fileName: req.file.originalname,
              uploadedBy: user.username
            }
          });
        }

        // Notificar a los miembros del proyecto (excepto quien subió y el owner)
        for (const member of projectMembers) {
          if (member.userId !== user.id && member.userId !== project.userId) {
            await createNotification(pool, {
              userId: member.userId,
              type: 'file_uploaded',
              title: `${fileIcon} File uploaded in ${projectName}`,
              message: `${user.username} uploaded "${req.file.originalname}" to task "${taskTitle}"`,
              metadata: {
                projectId: project.id,
                projectName: project.name,
                taskId: task.id,
                taskTitle: task.title,
                attachmentId: attachment.id,
                fileName: req.file.originalname,
                uploadedBy: user.username
              }
            });
          }
        }

        // Notificar al asignado de la task si existe y no es quien subió
        if (task.assignedTo && task.assignedTo !== user.id) {
          await createNotification(pool, {
            userId: task.assignedTo,
            type: 'file_uploaded',
            title: `${fileIcon} File uploaded to your task`,
            message: `${user.username} uploaded "${req.file.originalname}" to "${taskTitle}"`,
            metadata: {
              projectId: project.id,
              projectName: project.name,
              taskId: task.id,
              taskTitle: task.title,
              attachmentId: attachment.id,
              fileName: req.file.originalname,
              uploadedBy: user.username
            }
          });
        }
      } else if (entityType === 'project' && project) {
        // Notificación para archivo subido en project
        const projectName = project.name || 'Unknown project';
        
        // Notificar al owner del proyecto si no es quien subió
        if (project.userId && project.userId !== user.id) {
          await createNotification(pool, {
            userId: project.userId,
            type: 'file_uploaded',
            title: `${fileIcon} File uploaded in ${projectName}`,
            message: `${user.username} uploaded "${req.file.originalname}" to the project`,
            metadata: {
              projectId: project.id,
              projectName: project.name,
              attachmentId: attachment.id,
              fileName: req.file.originalname,
              uploadedBy: user.username
            }
          });
        }

        // Notificar a los miembros del proyecto (excepto quien subió y el owner)
        for (const member of projectMembers) {
          if (member.userId !== user.id && member.userId !== project.userId) {
            await createNotification(pool, {
              userId: member.userId,
              type: 'file_uploaded',
              title: `${fileIcon} File uploaded in ${projectName}`,
              message: `${user.username} uploaded "${req.file.originalname}" to the project`,
              metadata: {
                projectId: project.id,
                projectName: project.name,
                attachmentId: attachment.id,
                fileName: req.file.originalname,
                uploadedBy: user.username
              }
            });
          }
        }
      }

      console.log(`📬 [ATTACHMENTS] Notifications sent for file upload`);

      res.status(201).json(attachment);
    } catch (error) {
      console.error("❌ [ATTACHMENTS] Error uploading file:", error);
      
      // Eliminar el archivo si hubo error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Eliminar un archivo
  app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
    try {
      const user = (req as any).session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const attachment = await storage.getAttachment(id);

      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // Solo el usuario que subió el archivo o un admin puede eliminarlo
      if (attachment.uploadedBy !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to delete this file" });
      }

      // Eliminar el archivo del sistema de archivos
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }

      // Eliminar de la base de datos
      const deleted = await storage.deleteAttachment(id);

      if (!deleted) {
        return res.status(404).json({ message: "Failed to delete attachment" });
      }

      console.log(`✅ [ATTACHMENTS] File deleted: ${attachment.fileName} by ${user.username}`);

      res.status(204).send();
    } catch (error) {
      console.error("❌ [ATTACHMENTS] Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });
}

# 📎 Attachments Feature - Documentation

## Overview
Sistema completo de gestión de archivos adjuntos para Tasks y Projects en ScrumFlow.

## ✅ Implementación Completada

### 1. **Base de Datos**
- ✅ Tabla `attachments` creada con todos los campos necesarios
- ✅ Soporte polimórfico para tasks y projects
- ✅ Tracking de usuario que sube el archivo
- ✅ Índices optimizados para consultas rápidas

### 2. **Backend (Server)**

#### Schema (`shared/schema.ts`)
- ✅ Definición de tabla `attachments` con Drizzle ORM
- ✅ Tipos TypeScript: `Attachment`, `InsertAttachment`
- ✅ Validación con Zod

#### Storage (`server/storage.ts`)
- ✅ `getAttachments(entityType, entityId)` - Obtener archivos
- ✅ `getAttachment(id)` - Obtener un archivo específico
- ✅ `createAttachment(attachment)` - Crear registro
- ✅ `deleteAttachment(id)` - Eliminar registro

#### Routes (`server/routes/attachments.ts`)
- ✅ `GET /api/attachments/:entityType/:entityId` - Listar archivos
- ✅ `POST /api/attachments/upload` - Subir archivo (con multer)
- ✅ `GET /api/attachments/download/:id` - Descargar archivo
- ✅ `DELETE /api/attachments/:id` - Eliminar archivo

#### Configuración
- ✅ Multer configurado para manejo de archivos
- ✅ Límite de 50MB por archivo
- ✅ Filtro de tipos de archivo permitidos
- ✅ Estructura de carpetas: `uploads/tasks/` y `uploads/projects/`
- ✅ Nombres de archivo únicos con UUID

### 3. **Frontend (Client)**

#### Componentes Creados

**`AttachmentList`** (`components/attachments/attachment-list.tsx`)
- ✅ Lista completa de attachments
- ✅ Upload con drag & drop visual
- ✅ Preview de archivos
- ✅ Descarga de archivos
- ✅ Eliminación con confirmación
- ✅ Información del usuario que subió
- ✅ Formato de tamaño de archivo
- ✅ Iconos por tipo de archivo

**`AttachmentCount`** (`components/attachments/attachment-count.tsx`)
- ✅ Badge con contador de archivos
- ✅ Icono de paperclip
- ✅ Se oculta si no hay archivos

**`TaskAttachmentsModal`** (`components/attachments/task-attachments-modal.tsx`)
- ✅ Modal para gestionar attachments de una task
- ✅ Integra AttachmentList
- ✅ Título con nombre de la task

#### Integraciones

**Project Detail Page**
- ✅ Sección de attachments del proyecto
- ✅ Ubicada después de Quick Notes y Today's Focus
- ✅ Antes del Kanban Board

**Task Card (Kanban)**
- ✅ Botón de attachments en la barra de acciones
- ✅ Badge con contador de archivos en el footer
- ✅ Modal para gestionar attachments
- ✅ Icono de paperclip

### 4. **Dependencias Instaladas**
- ✅ `multer@^1.4.5-lts.1` - Manejo de uploads
- ✅ `@types/multer@^1.4.12` - TypeScript types

## 📁 Estructura de Archivos

```
uploads/
├── tasks/
│   └── [taskId]/
│       ├── filename-uuid.pdf
│       └── image-uuid.png
└── projects/
    └── [projectId]/
        ├── document-uuid.docx
        └── spec-uuid.pdf
```

## 🎯 Tipos de Archivo Soportados

### Imágenes
- JPEG, JPG, PNG, GIF, WebP, SVG

### Documentos
- PDF
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)

### Texto
- TXT, CSV

### Comprimidos
- ZIP, RAR, 7Z

### Otros
- JSON

## 🔒 Seguridad

- ✅ Autenticación requerida para todas las operaciones
- ✅ Solo el usuario que subió o admin puede eliminar
- ✅ Validación de tipo de archivo
- ✅ Límite de tamaño de archivo (50MB)
- ✅ Nombres de archivo sanitizados
- ✅ UUIDs para evitar colisiones

## 🚀 Uso

### Subir Archivo en Project
1. Ir a Project Detail
2. Scroll hasta la sección "Attachments"
3. Click en el área de upload o drag & drop
4. Seleccionar archivo
5. Click "Upload"

### Subir Archivo en Task
1. En el Kanban board, click en el botón de paperclip en la task
2. Se abre el modal de attachments
3. Click en el área de upload o drag & drop
4. Seleccionar archivo
5. Click "Upload"

### Descargar Archivo
- Click en el botón de download (⬇️) junto al archivo

### Eliminar Archivo
- Click en el botón de delete (🗑️) junto al archivo
- Confirmar la eliminación

## 📊 Base de Datos

### Tabla: attachments

```sql
CREATE TABLE attachments (
  id CHAR(36) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(20) NOT NULL,
  entity_type ENUM('task', 'project') NOT NULL,
  entity_id CHAR(36) NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  description TEXT,
  is_image TINYINT(1) DEFAULT 0,
  uploaded_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🎨 UI/UX Features

- ✅ Animaciones suaves
- ✅ Hover effects
- ✅ Loading states
- ✅ Error handling con toasts
- ✅ Responsive design
- ✅ Iconos por tipo de archivo
- ✅ Preview de información del archivo
- ✅ Badges con contador
- ✅ Modal con scroll

## 🔄 API Endpoints

### GET `/api/attachments/:entityType/:entityId`
Obtener todos los attachments de una entidad.

**Parámetros:**
- `entityType`: 'task' | 'project'
- `entityId`: UUID de la entidad

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "uploadedBy": "user-uuid",
    "uploaderUsername": "john",
    "uploaderFullName": "John Doe",
    "uploadedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### POST `/api/attachments/upload`
Subir un archivo.

**Body (FormData):**
- `file`: File
- `entityType`: 'task' | 'project'
- `entityId`: UUID
- `description`: string (opcional)

**Respuesta:**
```json
{
  "id": "uuid",
  "fileName": "document.pdf",
  "filePath": "/uploads/tasks/task-id/document-uuid.pdf",
  "fileSize": 1024000,
  "fileType": "application/pdf",
  "uploadedBy": "user-uuid",
  "uploadedAt": "2025-01-01T00:00:00.000Z"
}
```

### GET `/api/attachments/download/:id`
Descargar un archivo.

**Respuesta:** File download

### DELETE `/api/attachments/:id`
Eliminar un archivo.

**Respuesta:** 204 No Content

## 📝 Notas

- Los archivos se almacenan en el sistema de archivos del servidor
- Los metadatos se guardan en la base de datos
- Al eliminar un attachment, se elimina tanto el archivo como el registro
- Los archivos se organizan por tipo de entidad y ID
- Cache de 30 segundos para el contador de attachments

## 🎉 Feature Completo

El sistema de attachments está completamente funcional y listo para usar en producción.

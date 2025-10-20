# 📝 Sistema de Notas Compartidas - Guía de Uso

## 🎯 Descripción
Sistema de notas que permite crear y compartir notas entre usuarios y proyectos de forma flexible.

## ✨ Características

### 1. **Botón Flotante de Notas**
- **Ubicación**: Esquina inferior derecha (junto al botón "New Project")
- **Color**: Amarillo con icono de nota adhesiva
- **Disponible en**:
  - Dashboard principal
  - Páginas de detalle de proyectos

### 2. **Tipos de Asignación**

#### **General (All Users)**
- La nota es visible para todos los usuarios del sistema
- Puede asignarse opcionalmente a un proyecto específico
- Útil para anuncios o recordatorios generales

#### **Usuario Específico**
- La nota se asigna a un usuario particular
- Opciones adicionales:
  - **Sin proyecto**: Nota personal general para el usuario
  - **Con proyecto del usuario**: Nota vinculada a un proyecto específico del usuario

### 3. **Opciones de Personalización**
- **5 colores disponibles**: 🟡 Amarillo, 🔵 Azul, 🟢 Verde, 🩷 Rosa, 🟣 Morado
- **Contenido**: Texto libre con soporte para múltiples líneas

## 🚀 Cómo Usar

### Crear una Nota General
1. Click en el botón flotante amarillo (🗒️)
2. Escribir el contenido de la nota
3. Seleccionar color (opcional)
4. En "Assign To", dejar seleccionado "General (All Users)"
5. Opcionalmente, seleccionar un proyecto
6. Click en "Create Note"

### Crear una Nota para Usuario Específico
1. Click en el botón flotante amarillo (🗒️)
2. Escribir el contenido de la nota
3. Seleccionar color (opcional)
4. En "Assign To", seleccionar "Specific User"
5. Elegir el usuario destinatario
6. Opcionalmente, asignar a un proyecto del usuario
7. Click en "Create Note"

### Crear una Nota desde un Proyecto
1. Entrar al detalle de un proyecto
2. Click en el botón flotante amarillo (🗒️)
3. El proyecto actual se pre-seleccionará automáticamente
4. Elegir tipo de asignación (General o Usuario específico)
5. Click en "Create Note"

## 🔧 Configuración Técnica

### Migración de Base de Datos
Ejecutar la migración para agregar el campo `assigned_to_user_id`:

```bash
# Opción 1: Usando drizzle-kit
npm run db:push

# Opción 2: Ejecutar manualmente el SQL
# Archivo: migrations/add_assigned_to_user_id_to_quick_notes.sql
```

### Archivos Modificados
- **Frontend**:
  - `client/src/components/modals/create-shared-note-modal.tsx` (nuevo)
  - `client/src/components/ui/floating-note-button.tsx` (nuevo)
  - `client/src/pages/dashboard.tsx` (actualizado)
  - `client/src/pages/project-detail.tsx` (actualizado)

- **Backend**:
  - `shared/schema.ts` (campo `assignedToUserId` agregado)
  - `server/storage.ts` (métodos actualizados)
  - `server/routes.ts` (soporte para asignación)

- **Base de Datos**:
  - `migrations/add_assigned_to_user_id_to_quick_notes.sql` (nueva columna)

## 📊 Lógica de Visibilidad

### Usuario Regular
- Ve sus propias notas
- Ve notas asignadas específicamente a él
- Ve notas de proyectos donde es owner o miembro
- Ve notas generales (sin usuario asignado)

### Usuario Admin
- Puede crear notas para cualquier usuario
- Puede ver todas las notas del sistema (en modo admin)
- Puede impersonar usuarios para crear notas en su nombre

## 🎨 Interfaz de Usuario

### Modal de Creación
- **Campo de contenido**: Textarea con placeholder
- **Selector de color**: Botones visuales con emojis
- **Tipo de asignación**: Dropdown con 2 opciones
- **Selector de usuario**: Aparece solo si se elige "Specific User"
- **Selector de proyecto**: Dinámico según el tipo de asignación

### Botón Flotante
- **Posición**: `bottom-6 right-24` (fixed)
- **z-index**: 40 (por debajo de modales)
- **Animaciones**: Hover con scale y sombra
- **Gradiente**: Amarillo (from-yellow-400 to-yellow-500)

## 🔐 Seguridad
- Todas las notas requieren autenticación
- Los usuarios solo ven notas relevantes para ellos
- Las notas asignadas a usuarios específicos son privadas
- Validación de permisos en backend

## 📝 Notas Técnicas
- El campo `assignedToUserId` es nullable (permite notas generales)
- Si una nota tiene `assignedToUserId`, solo ese usuario la ve
- Si no tiene `assignedToUserId`, es visible según las reglas de proyecto
- El `noteType` se determina automáticamente: 'dashboard' o 'project'

## 🐛 Troubleshooting

### La nota no aparece
- Verificar que la migración se ejecutó correctamente
- Revisar logs del servidor para errores
- Confirmar que el usuario tiene permisos

### El botón flotante no se ve
- Verificar que el componente está importado
- Revisar z-index y posicionamiento
- Comprobar que no hay errores de compilación

### Error al crear nota
- Verificar que el campo `assigned_to_user_id` existe en la BD
- Revisar que el schema está actualizado
- Confirmar que el usuario está autenticado

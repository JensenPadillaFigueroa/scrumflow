import { Badge } from "@/components/ui/badge";
import { User, Users } from "lucide-react";

interface CollaboratorBadgeProps {
  createdByUsername?: string | null;
  createdByFullName?: string | null;
  createdByUserId?: string | null;
  projectOwnerId?: string | null;
  currentUsername?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function CollaboratorBadge({ 
  createdByUsername, 
  createdByFullName,
  createdByUserId,
  projectOwnerId,
  currentUsername,
  size = "sm",
  showIcon = true
}: CollaboratorBadgeProps) {
  // No mostrar badge si no hay información del creador
  if (!createdByUsername || !createdByUserId) {
    return null;
  }

  // Mostrar badge solo si el creador es diferente al owner del proyecto
  // Esto indica que fue creado por un colaborador
  if (!projectOwnerId || createdByUserId === projectOwnerId) {
    return null;
  }

  const displayName = createdByFullName || createdByUsername;
  const isSmall = size === "sm";

  return (
    <Badge 
      className={`
        bg-purple-100 text-purple-800 border-purple-300 
        ${isSmall ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'}
        flex items-center gap-1 w-fit
      `}
      title={`Created by ${displayName}`}
    >
      {showIcon && (
        <Users className={`${isSmall ? 'h-3 w-3' : 'h-4 w-4'}`} />
      )}
      <span className="font-medium">
        {createdByUsername}
      </span>
    </Badge>
  );
}

/**
 * Badge específico para mostrar en tarjetas de tareas
 */
export function TaskCollaboratorBadge({ 
  createdByUsername, 
  createdByFullName,
  createdByUserId,
  projectOwnerId,
  currentUsername 
}: Omit<CollaboratorBadgeProps, 'size' | 'showIcon'>) {
  return (
    <CollaboratorBadge
      createdByUsername={createdByUsername}
      createdByFullName={createdByFullName}
      createdByUserId={createdByUserId}
      projectOwnerId={projectOwnerId}
      currentUsername={currentUsername}
      size="sm"
      showIcon={true}
    />
  );
}

/**
 * Badge específico para mostrar en notas
 */
export function NoteCollaboratorBadge({ 
  createdByUsername, 
  createdByFullName,
  createdByUserId,
  projectOwnerId,
  currentUsername 
}: Omit<CollaboratorBadgeProps, 'size' | 'showIcon'>) {
  // Do not show the badge if the viewer is the creator (redundant info)
  if (currentUsername && createdByUsername && currentUsername === createdByUsername) {
    return null;
  }

  return (
    <CollaboratorBadge
      createdByUsername={createdByUsername}
      createdByFullName={createdByFullName}
      createdByUserId={createdByUserId}
      projectOwnerId={projectOwnerId}
      currentUsername={currentUsername}
      size="sm"
      showIcon={false}
    />
  );
}

/**
 * Badge para Quick Notes (dashboard): muestra siempre al creador
 */
export function DashboardCreatorBadge({
  createdByUsername,
  createdByFullName,
  createdByUserId,
  currentUserId,
}: {
  createdByUsername?: string | null;
  createdByFullName?: string | null;
  createdByUserId?: string | null;
  currentUserId?: string;
}) {
  if (!createdByUsername) return null;
  
  // Ocultar si el viewer es el creador (comparación por userId - más preciso)
  if (currentUserId && createdByUserId && createdByUserId === currentUserId) return null;

  const displayName = createdByFullName || createdByUsername;

  return (
    <Badge
      className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-300/50 text-[10px] px-2 py-0.5 flex items-center gap-1.5 w-fit shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
      title={`Created by ${displayName}`}
    >
      <User className="h-2.5 w-2.5" />
      <span className="font-semibold uppercase">{createdByUsername}</span>
    </Badge>
  );
}

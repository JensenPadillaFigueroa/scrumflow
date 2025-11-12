import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface AdminCreatedBadgeProps {
  createdByAdminUsername?: string | null;
  currentUsername?: string;
  className?: string;
}

export function AdminCreatedBadge({ createdByAdminUsername, currentUsername, className }: AdminCreatedBadgeProps) {
  if (!createdByAdminUsername) {
    return null;
  }

  // Ocultar si el viewer es el mismo que el admin creador (redundante)
  if (currentUsername && createdByAdminUsername === currentUsername) {
    return null;
  }

  return (
    <Badge 
      variant="secondary" 
      className={`text-xs flex items-center gap-1 ${className || ''}`}
    >
      <Shield className="h-3 w-3" />
      Created by {createdByAdminUsername}
    </Badge>
  );
}

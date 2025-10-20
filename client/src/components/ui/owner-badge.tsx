import { Badge } from "@/components/ui/badge";
import { User, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface OwnerBadgeProps {
  ownerUsername?: string;
  ownerFullName?: string;
  className?: string;
}

export function OwnerBadge({ ownerUsername, ownerFullName, className }: OwnerBadgeProps) {
  // Obtener el usuario actual de la sesión
  const { data: sessionData } = useQuery<{ user: { username: string } | null }>({
    queryKey: ["/api/session"],
  });

  if (!ownerUsername) return null;

  const currentUsername = sessionData?.user?.username;
  const isOwnProject = currentUsername === ownerUsername;
  
  // Obtener solo el primer nombre si hay múltiples palabras
  const getFirstName = (name: string) => {
    return name.split(' ')[0];
  };
  
  const displayName = ownerFullName 
    ? getFirstName(ownerFullName) 
    : ownerUsername;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${
        isOwnProject 
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
          : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
      } transition-colors ${className}`}
    >
      {isOwnProject ? (
        <>
          <Crown className="h-3 w-3 mr-1" />
          Your Project
        </>
      ) : (
        <>
          <User className="h-3 w-3 mr-1" />
          Created by {displayName}
        </>
      )}
    </Badge>
  );
}

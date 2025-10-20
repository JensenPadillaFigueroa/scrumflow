import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Users, Clock } from "lucide-react";

interface SyncIndicatorProps {
  isOnline?: boolean;
  lastSyncTime?: Date;
  collaboratorCount?: number;
  isPolling?: boolean;
}

export default function SyncIndicator({ 
  isOnline = true, 
  lastSyncTime, 
  collaboratorCount = 0,
  isPolling = false 
}: SyncIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  // Actualizar el tiempo transcurrido cada minuto
  useEffect(() => {
    if (!lastSyncTime) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - lastSyncTime.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) {
        setTimeAgo("just now");
      } else if (minutes < 60) {
        setTimeAgo(`${minutes}m ago`);
      } else {
        const hours = Math.floor(minutes / 60);
        setTimeAgo(`${hours}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const getSyncStatus = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: "Offline",
        variant: "destructive" as const,
        className: "bg-red-100 text-red-800 border-red-300"
      };
    }

    if (isPolling) {
      return {
        icon: Wifi,
        text: "Syncing...",
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
      };
    }

    return {
      icon: Wifi,
      text: "Synced",
      variant: "secondary" as const,
      className: "bg-green-100 text-green-800 border-green-300"
    };
  };

  const status = getSyncStatus();
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      {/* Estado de sincronización */}
      <Badge className={status.className}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {status.text}
      </Badge>

      {/* Número de colaboradores */}
      {collaboratorCount > 0 && (
        <Badge variant="outline" className="bg-gray-50">
          <Users className="h-3 w-3 mr-1" />
          {collaboratorCount} {collaboratorCount === 1 ? 'collaborator' : 'collaborators'}
        </Badge>
      )}

      {/* Última sincronización */}
      {lastSyncTime && timeAgo && (
        <Badge variant="outline" className="bg-gray-50">
          <Clock className="h-3 w-3 mr-1" />
          {timeAgo}
        </Badge>
      )}
    </div>
  );
}

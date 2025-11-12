import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export function useDesktopNotifications() {
  const shownNotificationIds = useRef<Set<string>>(new Set());
  const previousNotificationIds = useRef<Set<string>>(new Set());

  // Solicitar permiso para notificaciones del sistema
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch notifications
  const { data: notificationData } = useQuery<{
    unreadCount: number;
    notifications: Notification[];
  }>({
    queryKey: ["/api/notifications"],
    refetchInterval: 15000, // Cada 15 segundos
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const notifications = notificationData?.notifications || [];

  // Mostrar notificación de escritorio cuando hay nuevas notificaciones
  useEffect(() => {
    if (!notificationData) return;

    // Solo mostrar si hay permiso
    if ("Notification" in window && Notification.permission === "granted") {
      // Obtener IDs actuales de todas las notificaciones
      const currentNotificationIds = new Set(notifications.map(n => n.id));
      
      // Detectar notificaciones nuevas (que no estaban en la lista anterior)
      const newNotifications = notifications.filter(notification => {
        return !previousNotificationIds.current.has(notification.id) &&
               !shownNotificationIds.current.has(notification.id);
      });
      
      // Mostrar solo las notificaciones nuevas
      if (newNotifications.length > 0) {
        // Ordenar por fecha (más reciente primero)
        const sortedNotifications = [...newNotifications].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        sortedNotifications.forEach(notification => {
          // Marcar como mostrada en Windows
          shownNotificationIds.current.add(notification.id);

          // Crear notificación del sistema
          const desktopNotification = new Notification(notification.title, {
            body: notification.message,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: notification.id,
            requireInteraction: false,
            silent: false,
          });

          // Cuando hacen click en la notificación, abrir la app
          desktopNotification.onclick = () => {
            window.focus();
            desktopNotification.close();
            
            // Navegar a una página específica según el tipo
            if (notification.metadata?.projectId) {
              window.location.href = `/projects/${notification.metadata.projectId}`;
            }
          };

          // Auto-cerrar después de 5 segundos
          setTimeout(() => {
            desktopNotification.close();
          }, 5000);
        });
      }
      
      // Actualizar la lista de IDs anteriores
      previousNotificationIds.current = currentNotificationIds;
    }
  }, [notifications, notificationData]);

  // Función para solicitar permiso manualmente
  const requestPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  };

  // Función para verificar si hay permiso
  const hasPermission = () => {
    return "Notification" in window && Notification.permission === "granted";
  };

  // Función para verificar si las notificaciones están soportadas
  const isSupported = () => {
    return "Notification" in window;
  };

  return {
    requestPermission,
    hasPermission,
    isSupported,
    permission: "Notification" in window ? Notification.permission : "denied",
  };
}

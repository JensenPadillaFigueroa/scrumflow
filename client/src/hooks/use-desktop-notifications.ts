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
  const previousUnreadCount = useRef<number>(0);
  const shownNotificationIds = useRef<Set<string>>(new Set());

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
  const unreadCount = notificationData?.unreadCount || 0;

  // Mostrar notificación de escritorio cuando hay nuevas notificaciones
  useEffect(() => {
    if (!notificationData) return;

    // Solo mostrar si hay permiso
    if ("Notification" in window && Notification.permission === "granted") {
      // Detectar nuevas notificaciones no leídas
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Detectar si hay un aumento en el contador (nueva notificación)
      const hasNewNotifications = unreadCount > previousUnreadCount.current;
      
      // Si hay nuevas notificaciones, mostrar solo las más recientes
      if (hasNewNotifications) {
        // Ordenar por fecha (más reciente primero)
        const sortedNotifications = [...unreadNotifications].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Mostrar solo las notificaciones nuevas (diferencia en el contador)
        const newCount = unreadCount - previousUnreadCount.current;
        const newNotifications = sortedNotifications.slice(0, newCount);
        
        newNotifications.forEach(notification => {
          // Si ya mostramos esta notificación, skip
          if (shownNotificationIds.current.has(notification.id)) {
            return;
          }

          // Marcar como mostrada
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
    }

    previousUnreadCount.current = unreadCount;
  }, [notifications, unreadCount, notificationData]);

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

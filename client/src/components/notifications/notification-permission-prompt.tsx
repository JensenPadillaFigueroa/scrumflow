import { useState, useEffect } from "react";
import { Bell, X, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDesktopNotifications } from "@/hooks/use-desktop-notifications";
import { useToast } from "@/hooks/use-toast";

export default function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTestButton, setShowTestButton] = useState(false);
  const { requestPermission, hasPermission, isSupported, permission } = useDesktopNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Mostrar el prompt solo si:
    // 1. Las notificaciones están soportadas
    // 2. El usuario no ha dado permiso aún
    // 3. No ha rechazado el permiso
    if (isSupported() && permission === "default") {
      // Esperar 3 segundos antes de mostrar el prompt
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPrompt(false);
      setShowTestButton(true);
      toast({
        title: "Notifications enabled!",
        description: "You'll now receive desktop notifications.",
      });
    }
  };

  const handleTestNotification = () => {
    if (hasPermission()) {
      const notification = new Notification("🎉 Test Notification", {
        body: "Desktop notifications are working! You'll receive updates like this.",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: false,
        silent: false,
      });

      setTimeout(() => {
        notification.close();
      }, 5000);

      toast({
        title: "Test notification sent!",
        description: "Check your system tray.",
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Guardar en localStorage para no volver a mostrar
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  // No mostrar si ya fue rechazado anteriormente
  if (localStorage.getItem("notification-prompt-dismissed") === "true") {
    return null;
  }

  // Mostrar botón de test si tiene permiso
  if (showTestButton && hasPermission()) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleTestNotification}
          variant="outline"
          size="sm"
          className="shadow-lg"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test Notification
        </Button>
      </div>
    );
  }

  // No mostrar si ya tiene permiso o no está soportado
  if (!showPrompt || hasPermission() || !isSupported()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
      <Card className="w-80 shadow-2xl border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Enable Desktop Notifications</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            Get notified about new tasks, file uploads, and project updates even when you're not looking at ScrumFlow.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            onClick={handleEnableNotifications}
            className="flex-1"
            size="sm"
          >
            Enable Notifications
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
          >
            Not Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

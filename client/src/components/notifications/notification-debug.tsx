import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotificationDebug() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log("Permission requested, result:", result);
    }
  };

  const sendTestNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      console.log("🔔 Sending test notification...");
      
      try {
        const notification = new Notification("🧪 Test from ScrumFlow", {
          body: "If you see this in Windows, notifications are working!",
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          requireInteraction: false,
          silent: false,
          tag: "test-" + Date.now(),
        });

        console.log("🔔 Notification object created:", notification);

        notification.onshow = () => {
          console.log("✅ Notification shown successfully!");
        };

        notification.onclick = () => {
          console.log("🔔 Notification clicked!");
          window.focus();
          notification.close();
        };

        notification.onerror = (error) => {
          console.error("❌ Notification error:", error);
        };

        notification.onclose = () => {
          console.log("🔔 Notification closed");
        };

        setTimeout(() => {
          console.log("🔔 Auto-closing notification...");
          notification.close();
        }, 5000);

        console.log("🔔 Test notification sent successfully!");
        
        // Verificar configuración de Windows
        console.log("📋 Windows Notification Settings:");
        console.log("- Check: Windows Settings → System → Notifications");
        console.log("- Ensure: Focus Assist is OFF");
        console.log("- Ensure: Browser notifications are allowed in Windows");
        
      } catch (error) {
        console.error("❌ Error creating notification:", error);
      }
    } else {
      console.error("❌ Cannot send notification. Permission:", Notification.permission);
    }
  };

  const getPermissionColor = () => {
    switch (permission) {
      case "granted": return "bg-green-500";
      case "denied": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 w-80 z-50 shadow-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          🔔 Notification Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium">Browser Support:</span>
            <Badge variant={isSupported ? "default" : "destructive"}>
              {isSupported ? "✓ Supported" : "✗ Not Supported"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-medium">Permission:</span>
            <Badge className={getPermissionColor()}>
              {permission}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {permission === "default" && (
            <Button
              onClick={requestPermission}
              size="sm"
              className="w-full"
            >
              Request Permission
            </Button>
          )}
          
          {permission === "granted" && (
            <Button
              onClick={sendTestNotification}
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Send Test Notification
            </Button>
          )}
          
          {permission === "denied" && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Notifications blocked. Enable in browser settings.
            </div>
          )}
        </div>

        <div className="text-[10px] text-gray-500 border-t pt-2 space-y-1">
          <p className="font-semibold">Troubleshooting:</p>
          <p>• Press F12 → Check Console for 🔔</p>
          <p>• Windows Settings → Notifications</p>
          <p>• Turn OFF Focus Assist</p>
          <p>• Check browser is allowed in Windows</p>
          <p>• Try: Win+A to open Action Center</p>
        </div>
      </CardContent>
    </Card>
  );
}

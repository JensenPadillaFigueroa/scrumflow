import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import NotificationList from "./notification-list.tsx";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications from backend with auto-refresh
  const { data: notificationData } = useQuery<{
    unreadCount: number;
    notifications: any[];
  }>({
    queryKey: ["/api/notifications"],
    refetchInterval: 15000, // Refetch every 15 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not focused
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;
  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative p-2 hover:bg-gray-100 transition-all duration-300 hover:scale-110 rounded-full",
            className
          )}
          data-testid="button-notifications"
        >
          <Bell className={cn(
            "h-5 w-5 transition-all duration-300",
            hasUnread && "text-primary-blue animate-pulse"
          )} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce shadow-lg">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 overflow-visible p-0 shadow-lg border-slate-200"
        data-testid="dropdown-notifications"
        sideOffset={5}
      >
        <NotificationList 
          notifications={notifications}
          onClose={() => setIsOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useMutation } from "@tanstack/react-query";
import { CheckCheck, Trash2, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

interface NotificationListProps {
  notifications: Notification[];
  onClose: () => void;
}

export default function NotificationList({ notifications, onClose }: NotificationListProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("PUT", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/my-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-focus"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/my-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-focus"] });
      toast({ title: "Success", description: "All notifications marked as read." });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/my-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-focus"] });
      toast({ title: "Deleted", description: "Notification removed." });
    },
  });

  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/my-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-focus"] });
      toast({ title: "Success", description: "All notifications deleted." });
      setCurrentPage(1); // Reset to first page
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to delete notifications.", 
        variant: "destructive" 
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "📋";
      case "task_created":
        return "✨";
      case "task_completed":
        return "✅";
      case "task_deleted":
        return "🗑️";
      case "task_updated":
        return "✏️";
      case "status_changed":
        return "🔄";
      case "project_invite":
        return "📨";
      case "project_removed":
        return "👋";
      case "project_completed":
        return "🎉";
      case "new_member_joined":
        return "👥";
      case "mention":
        return "💬";
      default:
        return "🔔";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Navigate based on notification type
    if (notification.metadata?.projectId) {
      window.location.href = `/projects/${notification.metadata.projectId}`;
      onClose();
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center">
        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No notifications yet</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Pagination calculations
  const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNotifications = notifications.slice(startIndex, endIndex);
  const showPagination = notifications.length > ITEMS_PER_PAGE;

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-primary-blue" />
          Notifications
          {unreadCount > 0 && (
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">
              {unreadCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-7 px-2 text-[11px] text-primary-blue hover:text-blue-700 hover:bg-blue-50"
              title="Mark all as read"
            >
              <CheckCheck className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm(`Delete all ${notifications.length} notifications?`)) {
                deleteAllNotificationsMutation.mutate();
              }
            }}
            disabled={deleteAllNotificationsMutation.isPending}
            className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete all notifications"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Notification List with Scroll */}
      <div className="overflow-y-auto max-h-[450px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="divide-y divide-slate-100 pb-2">
          {paginatedNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 hover:bg-gray-50 cursor-pointer group transition-colors ${
                !notification.read ? "bg-blue-50/30" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
              data-testid={`notification-${notification.id}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="text-lg flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${!notification.read ? "text-gray-900" : "text-gray-700"}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 bg-primary-blue rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation.mutate(notification.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Controls */}
      {showPagination && (
        <div className="px-3 py-2 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-7 px-2 text-[11px] hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          
          <span className="text-[11px] text-gray-600 font-medium">
            {currentPage} / {totalPages}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-7 px-2 text-[11px] hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

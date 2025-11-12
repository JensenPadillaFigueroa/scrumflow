import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import { OwnerBadge } from "@/components/ui/owner-badge";
import { ProjectTypeBadge } from "@/components/ui/project-type-badge";
import { Folder, CheckCircle, Clock, Heart, ArrowRight, User, Shield, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReminderList from "@/components/reminders/reminder-list";
import QuickNotes from "@/components/notes/quick-notes";
import DashboardFocus from "@/components/dashboard/dashboard-focus";
import FloatingNoteButton from "@/components/ui/floating-note-button";
import NotificationBell from "@/components/notifications/notification-bell";
import NotificationPermissionPrompt from "@/components/notifications/notification-permission-prompt";
import { useToast } from "@/hooks/use-toast";
import type { Project, Task, WishlistItem } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin view status
  const { data: adminStatus } = useQuery<{
    isAdmin: boolean;
    impersonateUserId?: string;
    user: { id: string; username: string; role: string } | null;
  }>({
    queryKey: ["/api/admin/view-status"],
  });

  // Users list for admin
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<Array<{
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: string;
  }>>({
    queryKey: ["/api/admin/users"],
    enabled: adminStatus?.isAdmin === true,
    queryFn: async () => {
      console.log("🔄 [QUERY] Fetching users with TanStack Query");
      const response = await fetch("/api/admin/users");
      console.log("🔄 [QUERY] Response status:", response.status);
      console.log("🔄 [QUERY] Response ok:", response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log("🔄 [QUERY] Response text:", text);
      
      try {
        const data = JSON.parse(text);
        console.log("🔄 [QUERY] Parsed data:", data);
        return data;
      } catch (parseError) {
        console.error("🔄 [QUERY] JSON parse error:", parseError);
        throw new Error(`Invalid JSON response: ${text}`);
      }
    },
  });

  // Debug logs
  console.log("🔍 [DEBUG] Admin status:", adminStatus);
  console.log("🔍 [DEBUG] Users loading:", usersLoading);
  console.log("🔍 [DEBUG] Users error:", usersError);
  console.log("🔍 [DEBUG] Users data:", users);

  // Manual fetch test
  React.useEffect(() => {
    if (adminStatus?.isAdmin) {
      console.log("🧪 [DEBUG] Testing manual fetch to /api/admin/users");
      fetch("/api/admin/users")
        .then(res => {
          console.log("🧪 [DEBUG] Response status:", res.status);
          console.log("🧪 [DEBUG] Response headers:", res.headers);
          console.log("🧪 [DEBUG] Content-Type:", res.headers.get('content-type'));
          return res.text(); // Get as text first to see what we're getting
        })
        .then(text => {
          console.log("🧪 [DEBUG] Raw response text:", text);
          try {
            const json = JSON.parse(text);
            console.log("🧪 [DEBUG] Parsed JSON:", json);
          } catch (e) {
            console.error("🧪 [DEBUG] Failed to parse as JSON:", e);
          }
        })
        .catch(err => console.error("🧪 [DEBUG] Fetch error:", err));
    }
  }, [adminStatus?.isAdmin]);

  // Helper function to show admin creation notifications
  const showAdminCreationNotification = (response: any, itemType: string) => {
    if (response._adminCreated) {
      toast({
        title: `${itemType} created by Admin`,
        description: `${response._adminUsername} created this ${itemType.toLowerCase()} for ${response._targetUsername}`,
        variant: "default",
      });
    }
  };

  // Impersonate user mutation
  const impersonateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to impersonate user");
      return res.json();
    },
    onSuccess: (data) => {
      const targetUser = users.find(u => u.id === data.impersonateUserId);
      toast({ 
        title: data.impersonateUserId 
          ? `Now viewing as ${targetUser?.username || 'user'}` 
          : "Back to your own view",
        description: data.message 
      });
      // Refresh all data
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/view-status"] });
    },
    onError: () => {
      toast({ 
        title: "Failed to switch user view", 
        variant: "destructive" 
      });
    }
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: wishlistItems = [], isLoading: wishlistLoading } = useQuery<WishlistItem[]>({
    queryKey: ["/api/wishlist"],
  });


  const activeTasks = tasks.filter(task => task.status !== "done");
  
  // Debug: Log all data
  console.log("📋 All Projects:", projects.map(p => ({ id: p.id, name: p.name })));
  console.log("📋 All Tasks:", tasks.map(t => ({ id: t.id, title: t.title, projectId: t.projectId, status: t.status })));

  // Calculate completed projects (100% completion rate)
  const completedProjects = projects.filter(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    console.log(`🔍 Project "${project.name}" (ID: ${project.id}):`, {
      totalTasks: projectTasks.length,
      taskStatuses: projectTasks.map(t => ({ title: t.title, status: t.status, projectId: t.projectId }))
    });
    
    if (projectTasks.length === 0) {
      console.log(`❌ Project "${project.name}" has no tasks, excluding from completed`);
      return false;
    }
    
    const completedProjectTasks = projectTasks.filter(task => task.status === "done");
    const isCompleted = completedProjectTasks.length === projectTasks.length;
    
    console.log(`📊 Project "${project.name}": ${completedProjectTasks.length}/${projectTasks.length} completed = ${isCompleted ? '✅ COMPLETED' : '❌ NOT COMPLETED'}`);
    
    return isCompleted;
  });
  
  console.log(`🎯 Total completed projects: ${completedProjects.length}`, completedProjects.map(p => p.name));

  const isLoading = projectsLoading || tasksLoading || wishlistLoading;

  if (isLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-[450px] rounded-xl" />
          <Skeleton className="h-[450px] rounded-xl" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[500px] rounded-xl" />
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 lg:pt-6 relative overflow-hidden" data-testid="page-dashboard">
      {/* Elementos decorativos flotantes */}
      <div className="absolute top-10 right-10 w-16 h-16 bg-blue-200/20 rounded-full animate-bounce-slow"></div>
      <div className="absolute top-32 right-32 w-12 h-12 bg-emerald-200/20 rounded-full animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-20 right-20 w-20 h-20 bg-purple-200/20 rounded-full animate-bounce-slow" style={{animationDelay: '2s'}}></div>
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="animate-fade-in-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 transition-all duration-300 hover:text-blue-600 hover:scale-105 cursor-default">Dashboard</h2>
            <p className="text-sm sm:text-base text-gray-600 transition-all duration-300 hover:text-gray-700 hover:translate-x-1">Overview of your projects and recent activity</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600 flex-wrap">
              <NotificationBell />
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="break-words">
                  Welcome back{adminStatus?.user?.username ? `, ${adminStatus.user.username.charAt(0).toUpperCase() + adminStatus.user.username.slice(1)}` : ''}!
                </span>
              </div>
              {adminStatus?.isAdmin && adminStatus?.impersonateUserId && (
                <Badge variant="default" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Viewing as {users.find(u => u.id === adminStatus.impersonateUserId)?.username || 'user'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {adminStatus?.isAdmin && (
                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                  <Select
                    value={adminStatus.impersonateUserId || adminStatus.user?.id || ""}
                    onValueChange={(value) => {
                      console.log("🔄 [DEBUG] Changing to user:", value);
                      const targetUserId = value === adminStatus.user?.id ? null : value;
                      impersonateMutation.mutate(targetUserId);
                    }}
                    disabled={impersonateMutation.isPending || usersLoading}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="truncate">
                            {impersonateMutation.isPending 
                              ? "Switching..." 
                              : usersLoading
                                ? "Loading..."
                                : adminStatus.impersonateUserId
                                  ? `As ${users.find(u => u.id === adminStatus.impersonateUserId)?.username || 'user'}`
                                  : "Your View"
                            }
                          </span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={adminStatus.user?.id || ""}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Your View ({adminStatus.user?.username})
                        </div>
                      </SelectItem>
                      {usersLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading users...
                        </SelectItem>
                      ) : users.length === 0 ? (
                        <SelectItem value="no-users" disabled>
                          No users found
                        </SelectItem>
                      ) : (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {user.full_name} ({user.username})
                              {user.role === 'admin' && <Shield className="h-3 w-3 ml-1" />}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {usersError && (
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  )}
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card 
          className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" 
          style={{animationDelay: '0.1s'}}
          onClick={() => setLocation('/projects')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-blue-200 group-hover:scale-110 group-hover:rotate-3">
                <Folder className="text-primary-blue h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-blue-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" data-testid="stat-total-projects">{projects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" 
          style={{animationDelay: '0.2s'}}
          onClick={() => setLocation('/projects')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-amber-200 group-hover:scale-110 group-hover:rotate-3">
                <Clock className="text-warning-amber h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-amber-600">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-amber-700 group-hover:scale-110" data-testid="stat-active-tasks">{activeTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" 
          style={{animationDelay: '0.3s'}}
          onClick={() => setLocation('/projects')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200 group-hover:scale-110 group-hover:rotate-3">
                <CheckCircle className="text-success-green h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-emerald-600">Completed Projects</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-emerald-700 group-hover:scale-110" data-testid="stat-completed-projects">{completedProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" 
          style={{animationDelay: '0.4s'}}
          onClick={() => setLocation('/wishlist')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-rose-200 group-hover:scale-110 group-hover:rotate-3">
                <Heart className="text-rose-500 h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-rose-600">Wishlist Items</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-rose-700 group-hover:scale-110" data-testid="stat-wishlist-items">{wishlistItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Focus and Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's Focus */}
        <DashboardFocus />

        {/* Reminders Section */}
        <ReminderList />
      </div>

      {/* Quick Notes and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Notes */}
        <QuickNotes />

        {/* Recent Activity */}
        <Card className="min-h-[500px] group transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No activity yet</p>
                <p className="text-sm text-gray-400">Start creating tasks to see activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task) => {
                  const project = projects.find(p => p.id === task.projectId);
                  return (
                    <div key={task.id} className="flex items-start" data-testid={`activity-${task.id}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        task.status === "finished" ? "bg-green-100" : 
                        task.status === "in-process" ? "bg-amber-100" : "bg-blue-100"
                      }`}>
                        {task.status === "finished" ? (
                          <CheckCircle className="text-success-green h-4 w-4" />
                        ) : task.status === "in-process" ? (
                          <Clock className="text-warning-amber h-4 w-4" />
                        ) : (
                          <Folder className="text-primary-blue h-4 w-4" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-900">
                          Task "{task.title}" {task.status === "finished" ? "completed" : "created"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {project?.name || "Unknown Project"} • {new Date(task.createdAt!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Note Button */}
      <FloatingNoteButton />
      
      {/* Desktop Notification Permission Prompt */}
      <NotificationPermissionPrompt />
    </div>
  );
}

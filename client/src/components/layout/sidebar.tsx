import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Folder, Heart, Columns, LayoutDashboard, Plus, X, Menu, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateProjectModal from "@/components/modals/create-project-modal";
import { queryClient } from "@/lib/queryClient";

export default function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Check admin status
  const { data: adminStatus } = useQuery<{
    isAdmin: boolean;
    impersonateUserId?: string;
    user: { id: string; username: string; role: string } | null;
  }>({
    queryKey: ["/api/admin/view-status"],
  });

  const baseNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/projects", label: "Projects", icon: Folder },
    { path: "/wishlist", label: "Wishlist", icon: Heart },
    // { path: "/kanban", label: "Kanban Board", icon: Columns },
  ];

  // Add User Management for admins
  const navItems = adminStatus?.isAdmin 
    ? [...baseNavItems, { path: "/admin/users", label: "User Management", icon: Users }]
    : baseNavItems;

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-slate-200 p-4 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsOpen(true)}
            className="text-gray-600 hover:text-gray-900 transition-all duration-300 hover:scale-110 hover:rotate-3"
            data-testid="button-open-sidebar"
          >
            <Menu className="h-6 w-6 transition-transform duration-300" />
          </button>
          <div className="w-4 h-4 flex items-center justify-center">
            <img src="/tekpro-icon-transparente.png" alt="Company Logo" className="h-4 w-4" />
          </div>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          data-testid="overlay-sidebar"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-white shadow-sm border-r border-slate-200 fixed h-full z-50 lg:z-10 lg:translate-x-0 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="w-full flex justify-center">
              <img src="/tekpro-logo.png" alt="Company Logo" className="h-9" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden transition-all duration-300 hover:scale-110 hover:rotate-90"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-sidebar"
            >
              <X className="h-4 w-4 transition-transform duration-300" />
            </Button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={cn(
                    "group w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive(item.path)
                      ? "bg-blue-50 text-primary-blue border-l-4 border-primary-blue"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md"
                  )}
                  onClick={() => setIsOpen(false)}
                  data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="h-4 w-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3" />
                  <span className="transition-all duration-300 group-hover:translate-x-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-slate-200 space-y-2">
            <button
              onClick={() => setShowCreateProject(true)}
              className="group w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
              data-testid="button-new-project"
            >
              <Plus className="h-4 w-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-90" />
              <span className="transition-all duration-300 group-hover:translate-x-1">New Project</span>
            </button>
            
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="group w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 transition-all duration-300 group-hover:rotate-12" />
              <span className="transition-all duration-300 group-hover:translate-x-1">
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      <CreateProjectModal 
        open={showCreateProject} 
        onOpenChange={setShowCreateProject} 
      />
    </>
  );
}

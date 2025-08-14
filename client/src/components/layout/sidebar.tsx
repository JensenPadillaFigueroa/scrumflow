import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Folder, Heart, Columns, LayoutDashboard, Plus, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateProjectModal from "@/components/modals/create-project-modal";

export default function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/projects", label: "Projects", icon: Folder },
    { path: "/wishlist", label: "Wishlist", icon: Heart },
    { path: "/kanban", label: "Kanban Board", icon: Columns },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-slate-200 p-4 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsOpen(true)}
            className="text-gray-600 hover:text-gray-900"
            data-testid="button-open-sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">ProjectFlow</h1>
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
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-blue rounded-lg flex items-center justify-center">
                <LayoutDashboard className="text-white h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ProjectFlow</h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <a 
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.path)
                        ? "bg-blue-50 text-primary-blue border-l-4 border-primary-blue"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    onClick={() => setIsOpen(false)}
                    data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <Button
              onClick={() => setShowCreateProject(true)}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium bg-primary-blue text-white hover:bg-blue-600"
              data-testid="button-new-project"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
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

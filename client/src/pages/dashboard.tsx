import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, CheckCircle, Clock, Heart, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, Task, WishlistItem } from "@shared/schema";

export default function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: wishlistItems = [], isLoading: wishlistLoading } = useQuery<WishlistItem[]>({
    queryKey: ["/api/wishlist"],
  });

  const activeTasks = tasks.filter(task => task.status !== "finished");
  const completedTasks = tasks.filter(task => task.status === "finished");

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 lg:pt-6" data-testid="page-dashboard">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Overview of your projects and recent activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Folder className="text-primary-blue h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-projects">{projects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="text-warning-amber h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-active-tasks">{activeTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-success-green h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-completed-tasks">{completedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                <Heart className="text-rose-500 h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wishlist Items</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-wishlist-items">{wishlistItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Projects</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm" data-testid="link-view-all-projects">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No projects yet</p>
                <p className="text-sm text-gray-400">Create your first project to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 3).map((project) => {
                  const projectTasks = tasks.filter(task => task.projectId === project.id);
                  const completedProjectTasks = projectTasks.filter(task => task.status === "finished");
                  const progress = projectTasks.length > 0 ? (completedProjectTasks.length / projectTasks.length) * 100 : 0;
                  
                  const getCategoryColor = (category: string) => {
                    switch (category.toLowerCase()) {
                      case "development": return "bg-green-100 text-green-800";
                      case "design": return "bg-blue-100 text-blue-800";
                      case "marketing": return "bg-purple-100 text-purple-800";
                      case "research": return "bg-orange-100 text-orange-800";
                      case "data": return "bg-indigo-100 text-indigo-800";
                      default: return "bg-gray-100 text-gray-800";
                    }
                  };

                  return (
                    <div key={project.id} className="flex items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50" data-testid={`project-card-${project.id}`}>
                      <div className="w-10 h-10 bg-primary-blue rounded-lg flex items-center justify-center">
                        <Folder className="text-white h-4 w-4" />
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className={getCategoryColor(project.category)}>
                            {project.category}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-primary-blue h-1.5 rounded-full" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
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
    </div>
  );
}

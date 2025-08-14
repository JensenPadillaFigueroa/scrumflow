import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Folder, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import CreateProjectModal from "@/components/modals/create-project-modal";
import type { Project, Task } from "@shared/schema";

export default function Projects() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { toast } = useToast();

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Project deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This will also delete all associated tasks.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "development": return "💻";
      case "design": return "🎨";
      case "marketing": return "📈";
      case "research": return "🔬";
      case "data": return "📊";
      default: return "📁";
    }
  };

  const isLoading = projectsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 lg:pt-6" data-testid="page-projects">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">Manage all your projects in one place</p>
        </div>
        <Button
          onClick={() => setShowCreateProject(true)}
          className="bg-primary-blue text-white hover:bg-blue-600"
          data-testid="button-new-project"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first project</p>
          <Button
            onClick={() => setShowCreateProject(true)}
            className="bg-primary-blue text-white hover:bg-blue-600"
            data-testid="button-create-first-project"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const projectTasks = tasks.filter(task => task.projectId === project.id);
            const completedTasks = projectTasks.filter(task => task.status === "finished");
            const progress = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

            return (
              <Card
                key={project.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                data-testid={`project-card-${project.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary-blue rounded-lg flex items-center justify-center text-xl">
                      {getCategoryIcon(project.category)}
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-600"
                        data-testid={`button-edit-${project.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                        disabled={deleteProjectMutation.isPending}
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid={`text-project-name-${project.id}`}>
                    {project.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3" data-testid={`text-project-description-${project.id}`}>
                    {project.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={getCategoryColor(project.category)} data-testid={`badge-category-${project.id}`}>
                      {project.category}
                    </Badge>
                    <span className="text-xs text-gray-500" data-testid={`text-task-count-${project.id}`}>
                      {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="mt-4 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-blue h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                      data-testid={`progress-bar-${project.id}`}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2" data-testid={`text-progress-${project.id}`}>
                    {Math.round(progress)}% Complete
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateProjectModal 
        open={showCreateProject} 
        onOpenChange={setShowCreateProject} 
      />
    </div>
  );
}

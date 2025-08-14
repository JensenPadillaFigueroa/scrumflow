import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Task, Project } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  project?: Project;
  color: "slate" | "amber" | "emerald" | "purple";
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

export default function TaskCard({ task, project, color, onStatusChange }: TaskCardProps) {
  const { toast } = useToast();

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
  };

  const getBorderColor = () => {
    switch (color) {
      case "slate": return "border-slate-200";
      case "amber": return "border-amber-200";
      case "emerald": return "border-emerald-200";
      case "purple": return "border-purple-200";
    }
  };

  const getProjectBadgeColor = (category?: string) => {
    if (!category) return "bg-gray-100 text-gray-800";
    
    switch (category.toLowerCase()) {
      case "development": return "bg-green-100 text-green-800";
      case "design": return "bg-blue-100 text-blue-800";
      case "marketing": return "bg-purple-100 text-purple-800";
      case "research": return "bg-orange-100 text-orange-800";
      case "data": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };



  const isFinished = task.status === "finished";

  // Define stage progression
  const getNextStage = (currentStatus: string) => {
    switch (currentStatus) {
      case "wishlist": return "todo";
      case "todo": return "in-process";
      case "in-process": return "finished";
      default: return null;
    }
  };

  const getPreviousStage = (currentStatus: string) => {
    switch (currentStatus) {
      case "finished": return "in-process";
      case "in-process": return "todo";
      case "todo": return "wishlist";
      default: return null;
    }
  };

  const handleMoveNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStage = getNextStage(task.status);
    if (nextStage && onStatusChange) {
      onStatusChange(task.id, nextStage);
    }
  };

  const handleMovePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    const previousStage = getPreviousStage(task.status);
    if (previousStage && onStatusChange) {
      onStatusChange(task.id, previousStage);
    }
  };

  const canMoveNext = getNextStage(task.status) !== null;
  const canMovePrevious = getPreviousStage(task.status) !== null;

  return (
    <Card
      className={`cursor-move hover:shadow-md transition-shadow group ${getBorderColor()} ${isFinished ? 'opacity-75' : ''}`}
      draggable={!isFinished}
      onDragStart={handleDragStart}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className={`text-sm font-medium text-gray-900 ${isFinished ? 'line-through' : ''}`} data-testid={`text-task-title-${task.id}`}>
            {task.title}
          </h4>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canMovePrevious && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-blue-600 h-6 w-6 p-0"
                onClick={handleMovePrevious}
                title="Move to previous stage"
                data-testid={`button-move-previous-${task.id}`}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            )}
            {canMoveNext && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-blue-600 h-6 w-6 p-0"
                onClick={handleMoveNext}
                title="Move to next stage"
                data-testid={`button-move-next-${task.id}`}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            {!isFinished && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
                data-testid={`button-edit-task-${task.id}`}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
              onClick={handleDeleteTask}
              disabled={deleteTaskMutation.isPending}
              data-testid={`button-delete-task-${task.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-3" data-testid={`text-task-description-${task.id}`}>
          {task.description}
        </p>

        {task.status === "in-process" && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs text-gray-700">65%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-1.5">
              <div className="bg-warning-amber h-1.5 rounded-full" style={{ width: '65%' }} />
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          {project && (
            <Badge 
              className={`text-xs ${getProjectBadgeColor(project.category)}`}
              data-testid={`badge-project-${task.id}`}
            >
              {project.name}
            </Badge>
          )}
          <div className="flex items-center space-x-2">

            {isFinished && (
              <span className="text-xs text-gray-400" data-testid={`text-completed-date-${task.id}`}>
                Completed {new Date(task.createdAt!).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

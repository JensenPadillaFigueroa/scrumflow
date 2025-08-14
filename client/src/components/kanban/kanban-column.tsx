import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import TaskCard from "./task-card";
import type { Task, Project } from "@shared/schema";

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  projects: Project[];
  count: number;
  color: "slate" | "amber" | "emerald" | "purple";
}

export default function KanbanColumn({ title, status, tasks, projects, count, color }: KanbanColumnProps) {
  const { toast } = useToast();

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      await apiRequest("PUT", `/api/tasks/${taskId}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find(t => t.id === taskId) || 
                 projects.flatMap(p => tasks.filter(t => t.projectId === p.id)).find(t => t.id === taskId);
    
    if (task && task.status !== status) {
      updateTaskMutation.mutate({ taskId, newStatus: status });
    }
  };

  const getColumnStyles = () => {
    switch (color) {
      case "slate":
        return {
          bg: "bg-slate-100",
          dotColor: "bg-slate-500",
          badgeColor: "bg-slate-200 text-slate-700",
          plusColor: "text-slate-500 hover:text-slate-700"
        };
      case "amber":
        return {
          bg: "bg-amber-50",
          dotColor: "bg-warning-amber",
          badgeColor: "bg-amber-200 text-amber-700",
          plusColor: "text-amber-500 hover:text-amber-700"
        };
      case "emerald":
        return {
          bg: "bg-emerald-50",
          dotColor: "bg-success-green",
          badgeColor: "bg-emerald-200 text-emerald-700",
          plusColor: "text-emerald-500 hover:text-emerald-700"
        };
      case "purple":
        return {
          bg: "bg-purple-50",
          dotColor: "bg-purple-500",
          badgeColor: "bg-purple-200 text-purple-700",
          plusColor: "text-purple-500 hover:text-purple-700"
        };
    }
  };

  const styles = getColumnStyles();

  return (
    <div className={`${styles.bg} rounded-xl p-4`} data-testid={`kanban-column-${status}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 ${styles.dotColor} rounded-full`} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className={`${styles.badgeColor} text-xs font-medium px-2 py-1 rounded-full`} data-testid={`text-task-count-${status}`}>
            {count}
          </span>
        </div>
        <Button variant="ghost" size="sm" className={styles.plusColor}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div 
        className="space-y-3 min-h-96"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-testid={`drop-zone-${status}`}
      >
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No tasks</p>
          </div>
        ) : (
          tasks.map((task) => {
            const project = projects.find(p => p.id === task.projectId);
            return (
              <TaskCard
                key={task.id}
                task={task}
                project={project}
                color={color}
                onStatusChange={(taskId, newStatus) => 
                  updateTaskMutation.mutate({ taskId, newStatus })
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}

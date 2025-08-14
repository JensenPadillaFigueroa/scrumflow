import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Columns } from "lucide-react";
import KanbanColumn from "@/components/kanban/kanban-column";
import CreateTaskModal from "@/components/modals/create-task-modal";
import type { Project, Task } from "@shared/schema";

export default function Kanban() {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Filter tasks by selected project if one is selected
  const tasks = selectedProject && selectedProject !== "all"
    ? allTasks.filter(task => task.projectId === selectedProject)
    : allTasks;

  const todoTasks = tasks.filter(task => task.status === "todo");
  const inProcessTasks = tasks.filter(task => task.status === "in-process");
  const finishedTasks = tasks.filter(task => task.status === "finished");

  const isLoading = projectsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 lg:pt-6" data-testid="page-kanban">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Kanban Board</h2>
          <p className="text-gray-600">Manage tasks across different stages</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48" data-testid="select-project-filter">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowCreateTask(true)}
            className="bg-primary-blue text-white hover:bg-blue-600"
            data-testid="button-new-task"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <Columns className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Create a project first to start managing tasks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-96">
          <KanbanColumn
            title="To-Do"
            status="todo"
            tasks={todoTasks}
            projects={projects}
            count={todoTasks.length}
            color="slate"
          />
          <KanbanColumn
            title="In Process"
            status="in-process"
            tasks={inProcessTasks}
            projects={projects}
            count={inProcessTasks.length}
            color="amber"
          />
          <KanbanColumn
            title="Finished"
            status="finished"
            tasks={finishedTasks}
            projects={projects}
            count={finishedTasks.length}
            color="emerald"
          />
        </div>
      )}

      <CreateTaskModal 
        open={showCreateTask} 
        onOpenChange={setShowCreateTask}
        defaultProject={selectedProject}
      />
    </div>
  );
}

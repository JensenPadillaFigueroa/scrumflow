import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Clock, CheckCircle, Folder, Edit2 } from "lucide-react";
import { Link } from "wouter";
import KanbanColumn from "@/components/kanban/kanban-column";
import CreateTaskModal from "@/components/modals/create-task-modal";
import type { Project, Task } from "@shared/schema";

export default function ProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showCreateTask, setShowCreateTask] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        throw new Error("Project not found");
      }
      return response.json();
    },
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Filter tasks for this project
  const projectTasks = allTasks.filter(task => task.projectId === id);
  const todoTasks = projectTasks.filter(task => task.status === "todo");
  const inProcessTasks = projectTasks.filter(task => task.status === "in-process");
  const finishedTasks = projectTasks.filter(task => task.status === "finished");

  const isLoading = projectLoading || tasksLoading;

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

  if (isLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <div className="flex items-center space-x-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <div className="text-center py-16">
          <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
          <p className="text-gray-500 mb-6">The project you're looking for doesn't exist</p>
          <Link href="/projects">
            <Button className="bg-primary-blue text-white hover:bg-blue-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = projectTasks.length > 0 ? (finishedTasks.length / projectTasks.length) * 100 : 0;

  return (
    <div className="p-6 pt-20 lg:pt-6" data-testid="page-project-detail">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start space-x-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm" data-testid="button-back-to-projects">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="w-16 h-16 bg-primary-blue rounded-xl flex items-center justify-center text-2xl">
            {getCategoryIcon(project.category)}
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900" data-testid="text-project-name">
                {project.name}
              </h2>
              <Badge className={getCategoryColor(project.category)} data-testid="badge-project-category">
                {project.category}
              </Badge>
            </div>
            <p className="text-gray-600 mb-4" data-testid="text-project-description">
              {project.description}
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''} total
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}% complete
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" data-testid="button-edit-project">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Project
          </Button>
          <Button
            onClick={() => setShowCreateTask(true)}
            className="bg-primary-blue text-white hover:bg-blue-600"
            data-testid="button-add-task"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <Clock className="text-slate-600 h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">To-Do</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-todo-tasks">{todoTasks.length}</p>
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
                <p className="text-sm font-medium text-gray-600">In Process</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-inprocess-tasks">{inProcessTasks.length}</p>
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
                <p className="text-sm font-medium text-gray-600">Finished</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-finished-tasks">{finishedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm text-gray-600">Overall Completion</span>
            <span className="text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-primary-blue h-3 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
              data-testid="progress-bar-overall"
            />
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-96">
        <KanbanColumn
          title="To-Do"
          status="todo"
          tasks={todoTasks}
          projects={[project]}
          count={todoTasks.length}
          color="slate"
        />
        <KanbanColumn
          title="In Process"
          status="in-process"
          tasks={inProcessTasks}
          projects={[project]}
          count={inProcessTasks.length}
          color="amber"
        />
        <KanbanColumn
          title="Finished"
          status="finished"
          tasks={finishedTasks}
          projects={[project]}
          count={finishedTasks.length}
          color="emerald"
        />
      </div>

      <CreateTaskModal 
        open={showCreateTask} 
        onOpenChange={setShowCreateTask}
        defaultProject={id}
      />
    </div>
  );
}
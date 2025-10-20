import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Clock, CheckCircle, Folder, Edit2, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import { OwnerBadge } from "@/components/ui/owner-badge";
import NotificationBell from "@/components/notifications/notification-bell";
import KanbanColumn from "@/components/kanban/kanban-column";
import CreateTaskModal from "@/components/modals/create-task-modal";
import ProjectQuickNotes from "@/components/notes/project-quick-notes";
import ProjectMembers from "@/components/project/project-members";
import TodaysFocus from "@/components/project/todays-focus";
import SyncIndicator from "@/components/project/sync-indicator";
import FloatingNoteButton from "@/components/ui/floating-note-button";
import TaskCalendar from "@/components/calendar/task-calendar";
import { useProjectSync } from "@/hooks/use-project-sync";
import type { Project, Task } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UiStatus = "wishlist" | "todo" | "in-process" | "finished";

export default function ProjectDetail() {
  const { id } = useParams();
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // Hook para sincronización automática del proyecto
  const { forceSync } = useProjectSync({ 
    projectId: id!, 
    enabled: true,
    pollInterval: 5000 // 5 segundos para proyectos compartidos
  });
  const [defaultStatusUi, setDefaultStatusUi] = useState<UiStatus>("wishlist");

  // Función para scroll suave a la sección del kanban
  const scrollToKanban = (status: string) => {
    const kanbanSection = document.getElementById('kanban-section');
    if (kanbanSection) {
      kanbanSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ---- Edit Project modal state ----
  const [showEditProject, setShowEditProject] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const { toast } = useToast();

  // Obtener miembros para el indicador de sync
  const { data: members = [] } = useQuery({
    queryKey: [`/api/projects/${id}/members`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!id
  });

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error("Project not found");
      return response.json();
    },
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Filtrar tasks del proyecto (DB statuses: "wishlist" | "todo" | "in_progress" | "done")
  const projectTasks = allTasks.filter(task => task.projectId === id);
  const wishlistTasks = projectTasks.filter(task => task.status === "wishlist");
  const todoTasks      = projectTasks.filter(task => task.status === "todo");
  const inProcessTasks = projectTasks.filter(task => task.status === "in_progress"); // DB
  const finishedTasks  = projectTasks.filter(task => task.status === "done");        // DB

  const isLoading = projectLoading || tasksLoading;

  const getCategoryColor = (category: string) => {
    switch ((category || "").toLowerCase()) {
      case "development": return "bg-green-100 text-green-800";
      case "design": return "bg-blue-100 text-blue-800";
      case "marketing": return "bg-purple-100 text-purple-800";
      case "research": return "bg-orange-100 text-orange-800";
      case "data": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch ((category || "").toLowerCase()) {
      case "development": return "💻";
      case "implementations": return "⚙️";
      case "software-installation": return "💿";
      case "hardware-installation": return "🖥️";
      case "training": return "📚";
      case "design": return "🎨";
      case "data": return "📊";
      case "research": return "🔬";
      case "marketing": return "📈";
      case "other": return "📋";
      default: return "📁";
    }
  };

  // ---- Edit Project mutation ----
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      if (!project) return;
      await apiRequest("PUT", `/api/projects/${project.id}`, {
        name: draftName.trim(),
        description: draftDescription.trim() || null,
        category: draftCategory.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Saved", description: "Project updated successfully." });
      setShowEditProject(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Pre-carga de datos al abrir el modal
  const openEditModal = () => {
    if (!project) return;
    setDraftName(project.name ?? "");
    setDraftDescription(project.description ?? "");
    setDraftCategory(project.category ?? "");
    setShowEditProject(true);
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
          {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-24 rounded-xl" />))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-96 rounded-xl" />))}
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

  // Progreso: done / total
  const progress = projectTasks.length > 0
    ? (finishedTasks.length / projectTasks.length) * 100
    : 0;

  return (
    <div className="p-6 pt-20 lg:pt-6 relative overflow-hidden" data-testid="page-project-detail">
      {/* Elementos decorativos flotantes */}
      <div className="absolute top-10 right-10 w-16 h-16 bg-blue-200/20 rounded-full animate-bounce-slow"></div>
      <div className="absolute top-32 right-32 w-12 h-12 bg-emerald-200/20 rounded-full animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-20 right-20 w-20 h-20 bg-purple-200/20 rounded-full animate-bounce-slow" style={{animationDelay: '2s'}}></div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8 animate-fade-in-up">
        <div className="flex items-start space-x-3 sm:space-x-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm" data-testid="button-back-to-projects" className="transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:bg-blue-50">
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 hover:-translate-x-1" />
            </Button>
          </Link>
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-blue rounded-xl flex items-center justify-center text-xl sm:text-2xl transition-all duration-300 hover:scale-110 hover:rotate-3 hover:bg-blue-600 hover:shadow-lg animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            <span className="transition-transform duration-300 hover:scale-125">{getCategoryIcon(project.category)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 transition-all duration-300 hover:text-blue-600 hover:scale-105 hover:-translate-y-1 hover:rotate-1 cursor-default animate-fade-in-left break-words mb-3" data-testid="text-project-name" style={{animationDelay: '0.2s'}}>
              {project.name}
            </h2>
            
            {/* Todos los badges en horizontal */}
            <div className="flex items-center gap-2 flex-wrap mb-2 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              <div className="transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:rotate-2">
                <OwnerBadge 
                  ownerUsername={(project as any).owner_username}
                  ownerFullName={(project as any).owner_full_name}
                />
              </div>
              <div className="transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:-rotate-2">
                <AdminCreatedBadge 
                  createdByAdminUsername={(project as any).created_by_admin_username}
                />
              </div>
              <div className="transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:rotate-1">
                <SyncIndicator 
                  collaboratorCount={members.length}
                  lastSyncTime={new Date()}
                  isOnline={true}
                />
              </div>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 mb-2 transition-all duration-300 hover:text-gray-900 hover:translate-x-1 hover:scale-105 animate-fade-in-left break-words cursor-default" data-testid="text-project-description" style={{animationDelay: '0.4s'}}>
              {project.description}
            </p>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs sm:text-sm">
              <span className="text-gray-500 transition-all duration-300 hover:text-blue-600 hover:scale-110 hover:-translate-y-0.5 cursor-default">
                {projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""} total
              </span>
              <span className="text-gray-500 transition-all duration-300 hover:text-green-600 hover:scale-110 hover:-translate-y-0.5 cursor-default">
                {Math.round(progress)}% complete
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-up w-full lg:w-auto" style={{animationDelay: '0.5s'}}>
          <NotificationBell />
          <Button
            variant="outline"
            size="sm"
            onClick={openEditModal}
            data-testid="button-edit-project"
            className="group transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 hover:bg-blue-50 flex-1 lg:flex-none"
          >
            <Edit2 className="h-4 w-4 sm:mr-2 transition-transform duration-300 group-hover:rotate-12" />
            <span className="hidden xs:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={forceSync}
            title="Sync project with collaborators"
            data-testid="button-sync-project"
            className="group transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md hover:border-green-300 hover:bg-green-50 flex-1 lg:flex-none"
          >
            <RefreshCw className="h-4 w-4 sm:mr-2 transition-transform duration-300 group-hover:rotate-180" />
            <span className="hidden xs:inline">Sync</span>
          </Button>
          <Button
            onClick={() => { setDefaultStatusUi("wishlist"); setShowCreateTask(true); }}
            className="group bg-primary-blue text-white hover:bg-blue-600 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg flex-1 lg:flex-none"
            data-testid="button-add-task"
          >
            <Plus className="h-4 w-4 sm:mr-2 transition-transform duration-300 group-hover:rotate-90" />
            <span className="hidden xs:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.6s'}} onClick={() => scrollToKanban('wishlist')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-purple-200 group-hover:scale-110 group-hover:rotate-3">
                <Folder className="text-purple-600 h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-purple-600">Wishlist</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-purple-700 group-hover:scale-110" data-testid="stat-wishlist-tasks">{wishlistTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-slate-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.7s'}} onClick={() => scrollToKanban('todo')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-slate-200 group-hover:scale-110 group-hover:rotate-3">
                <Clock className="text-slate-600 h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-slate-600">To-Do</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-slate-700 group-hover:scale-110" data-testid="stat-todo-tasks">{todoTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.8s'}} onClick={() => scrollToKanban('in-process')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-amber-200 group-hover:scale-110 group-hover:rotate-3">
                <Clock className="text-warning-amber h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-amber-600">In Process</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-amber-700 group-hover:scale-110" data-testid="stat-inprocess-tasks">{inProcessTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.9s'}} onClick={() => scrollToKanban('finished')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200 group-hover:scale-110 group-hover:rotate-3">
                <CheckCircle className="text-success-green h-5 w-5 transition-all duration-300 group-hover:scale-125" />
              </div>
              <div className="ml-4 transition-all duration-300 group-hover:translate-x-1">
                <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-emerald-600">Finished</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-emerald-700 group-hover:scale-110" data-testid="stat-finished-tasks">{finishedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar and Members */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mb-6">
        <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 animate-fade-in-up" style={{animationDelay: '1s'}}>
          <CardHeader>
            <CardTitle className="transition-colors duration-300 group-hover:text-blue-600">Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">Overall Completion</span>
              <span className="text-sm font-medium text-gray-900 transition-all duration-300 group-hover:text-blue-600 group-hover:scale-110">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 transition-all duration-300 group-hover:bg-gray-300">
              <div
                className="bg-primary-blue h-3 rounded-full transition-all duration-500 group-hover:bg-blue-600"
                style={{ width: `${progress}%` }}
                data-testid="progress-bar-overall"
              />
            </div>
          </CardContent>
        </Card>
        
        <ProjectMembers 
          projectId={id!}
          isOwner={true} // TODO: Determinar si el usuario actual es owner
        />
      </div>

      {/* Project Quick Notes and Today's Focus (with Team Focus tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ProjectQuickNotes 
          projectId={id!} 
          projectName={project?.name || "Project"}
          projectOwnerId={project?.userId}
        />
        <TodaysFocus projectId={id!} />
      </div>
      
      {/* Task Calendar - Only show if enabled */}
      {/* HIDDEN: Calendar in development */}
      {false && Boolean(project?.scheduleEnabled) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TaskCalendar projectId={id!} />
        </div>
      )}
      
      {/* Kanban Board */}
      <Card id="kanban-section" className="scroll-mt-20 group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-up bg-gradient-to-br from-gray-50 to-gray-100/50" style={{animationDelay: '0.5s'}}>
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 transition-all duration-300 group-hover:text-purple-600">
            <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full transition-all duration-300 group-hover:h-10 group-hover:shadow-lg group-hover:shadow-purple-500/50"></div>
            Task Board
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1 ml-4">Organize and track your project tasks</p>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-96">
        <KanbanColumn
          title="Wishlist"
          status="wishlist"
          tasks={wishlistTasks}
          projects={[project]}
          count={wishlistTasks.length}
          color="slate"
          allTasks={projectTasks}
          onCreateTask={(defaultStatus) => { setDefaultStatusUi(defaultStatus as UiStatus); setShowCreateTask(true); }}
        />
        <KanbanColumn
          title="To-Do"
          status="todo"
          tasks={todoTasks}
          projects={[project]}
          count={todoTasks.length}
          color="amber"
          allTasks={projectTasks}
          onCreateTask={(defaultStatus) => { setDefaultStatusUi(defaultStatus as UiStatus); setShowCreateTask(true); }}
        />
        <KanbanColumn
          title="In Process"
          status="in-process"
          tasks={inProcessTasks}
          projects={[project]}
          count={inProcessTasks.length}
          color="purple"
          allTasks={projectTasks}
          onCreateTask={(defaultStatus) => { setDefaultStatusUi(defaultStatus as UiStatus); setShowCreateTask(true); }}
        />
        <KanbanColumn
          title="Finished"
          status="finished"
          tasks={finishedTasks}
          projects={[project]}
          count={finishedTasks.length}
          color="emerald"
          allTasks={projectTasks}
          onCreateTask={(defaultStatus) => { setDefaultStatusUi(defaultStatus as UiStatus); setShowCreateTask(true); }}
        />
          </div>
        </CardContent>
      </Card>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        defaultProject={id}
        defaultStatus={defaultStatusUi}
      />

      {/* Edit Project Modal */}
      <Dialog open={showEditProject} onOpenChange={setShowEditProject}>
        <DialogContent className="w-full max-w-md mx-4" data-testid="modal-edit-project">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Project name"
                data-testid="input-project-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Describe the project"
                rows={3}
                data-testid="textarea-project-description"
              />
            </div>

            <div>
  <label className="text-sm font-medium">Category</label>
  <select
    value={draftCategory}
    onChange={(e) => setDraftCategory(e.target.value)}
    className="w-full border border-gray-300 rounded-md p-2 text-sm"
    data-testid="select-project-category"
  >
    <option value="">Select category</option>
    <option value="development">Development 💻</option>
    <option value="design">Design 🎨</option>
    <option value="marketing">Marketing 📈</option>
    <option value="research">Research 🔬</option>
    <option value="data">Data 📊</option>
  </select>
</div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEditProject(false)}
                data-testid="button-cancel-edit-project"
              >
                Cancel
              </Button>
              <Button
                className="bg-primary-blue text-white hover:bg-blue-600"
                onClick={() => updateProjectMutation.mutate()}
                disabled={updateProjectMutation.isPending || !draftName.trim()}
                data-testid="button-save-edit-project"
              >
                {updateProjectMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Note Button */}
      <FloatingNoteButton defaultProjectId={project.id} />
    </div>
  );
}

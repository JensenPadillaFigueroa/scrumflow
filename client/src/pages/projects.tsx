import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Folder, Edit2, Trash2, Save, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import { OwnerBadge } from "@/components/ui/owner-badge";
import { ProjectTypeBadge } from "@/components/ui/project-type-badge";
import { CollaboratorsPreview } from "@/components/project/collaborators-preview";
import { PaginationControls } from "@/components/ui/pagination-controls";
import NotificationBell from "@/components/notifications/notification-bell";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import CreateProjectModal from "@/components/modals/create-project-modal";
import type { Project, Task } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Projects() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // draft de edición
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCategory, setDraftCategory] = useState("");

  // Paginación
  const [soloPage, setSoloPage] = useState(1);
  const [collabPage, setCollabPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const itemsPerPage = 6; // 6 proyectos por página (2 filas de 3)

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Obtener todos los usuarios para mostrar colaboradores
  const { data: allUsers = [] } = useQuery<Array<{ id: string; username: string; full_name: string }>>({
    queryKey: ["/api/users"],
  });

  // Obtener usuario actual de la sesión
  const { data: sessionData, isLoading: sessionLoading } = useQuery<{ user: { id: string; username: string } | null }>({
    queryKey: ["/api/session"],
  });
  const currentUserId = sessionData?.user?.id;

  // Obtener todos los miembros de proyectos para verificar colaboradores (optimizado con un solo endpoint)
  const { data: allProjectMembers = [], isLoading: membersLoading } = useQuery<Array<{ projectId: string; userId: string }>>({
    queryKey: ["/api/all-project-members"],
    enabled: projects.length > 0,
    staleTime: 0, // Siempre considerar los datos como obsoletos
    refetchOnMount: true, // Refetch cuando el componente se monta
    refetchOnWindowFocus: true, // Refetch cuando la ventana recibe foco
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-project-members"] });
      toast({ title: "Deleted", description: "Project deleted successfully." });
      setConfirmDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, name, description, category }: { id: string; name: string; description?: string; category?: string }) => {
      await apiRequest("PUT", `/api/projects/${id}`, {
        name,
        description: description ?? null,
        category: category ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Saved", description: "Project updated successfully." });
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startEdit = (e: React.MouseEvent, p: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(null);
    setEditingId(p.id);
    setDraftName(p.name);
    setDraftDescription(p.description ?? "");
    setDraftCategory(p.category ?? "");
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
  };

  const saveEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    updateProjectMutation.mutate({
      id,
      name: draftName.trim(),
      description: draftDescription.trim(),
      category: draftCategory.trim(),
    });
  };

  const askDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
    setConfirmDeleteId(id);
    setDeleteConfirmText(""); // Reset el texto de confirmación
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(null);
    setDeleteConfirmText("");
  };

  const confirmDelete = (e: React.MouseEvent, id: string, taskCount: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Si el proyecto tiene 1 o más tareas, requiere escribir DELETE
    if (taskCount >= 1 && deleteConfirmText.toUpperCase() !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: 'Please type "DELETE" to confirm',
        variant: "destructive",
      });
      return;
    }
    
    deleteProjectMutation.mutate(id);
    setDeleteConfirmText("");
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

  // Esperar a que TODAS las queries terminen antes de categorizar
  const isLoading = projectsLoading || tasksLoading || sessionLoading || (projects.length > 0 && membersLoading);

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
    <div className="p-6 pt-20 lg:pt-6 relative overflow-hidden" data-testid="page-projects">
      {/* Elementos decorativos flotantes */}
      <div className="absolute top-10 right-10 w-16 h-16 bg-blue-200/20 rounded-full animate-bounce-slow"></div>
      <div className="absolute top-32 right-32 w-12 h-12 bg-purple-200/20 rounded-full animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-20 right-20 w-20 h-20 bg-green-200/20 rounded-full animate-bounce-slow" style={{animationDelay: '2s'}}></div>
      
      <div className="flex flex-col gap-4 mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-all duration-300 hover:text-blue-600">Projects</h1>
            <p className="text-gray-600 transition-colors duration-300 hover:text-gray-700">Manage and organize your projects</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button
              onClick={() => setShowCreateProject(true)}
              className="group bg-primary-blue text-white hover:bg-blue-600 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg animate-fade-in-up"
              data-testid="button-new-project"
              style={{animationDelay: '0.2s'}}
            >
              <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              New Project
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Input
            type="text"
            placeholder="Search projects by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Reset pages when searching
              setSoloPage(1);
              setCollabPage(1);
              setCompletedPage(1);
            }}
            className="pl-10 pr-4 py-2 w-full"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4 transition-all duration-300 hover:scale-110 hover:text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2 transition-colors duration-300 hover:text-blue-600">No projects yet</h3>
          <p className="text-gray-500 mb-6 transition-colors duration-300 hover:text-gray-600">Get started by creating your first project</p>
          <Button
            onClick={() => setShowCreateProject(true)}
            className="group bg-primary-blue text-white hover:bg-blue-600 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg"
            data-testid="button-create-first-project"
          >
            <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            Create Project
          </Button>
        </div>
      ) : (
        <>
          {/* Función para renderizar un proyecto */}
          {(() => {
            // Función para verificar si un proyecto tiene colaboradores
            const hasCollaborators = (projectId: string) => {
              return allProjectMembers.filter(m => m.projectId === projectId).length > 0;
            };
            
            // Función para verificar si un proyecto está completado
            const isProjectCompleted = (project: Project) => {
              const projectTasks = tasks.filter(task => task.projectId === project.id);
              if (projectTasks.length === 0) return false;
              const completedTasks = projectTasks.filter(task => String(task.status).toLowerCase() === "done");
              return completedTasks.length === projectTasks.length;
            };

            // Función para filtrar por búsqueda
            const filterBySearch = (projectList: Project[]) => {
              if (!searchQuery.trim()) return projectList;
              const query = searchQuery.toLowerCase();
              return projectList.filter(p => 
                p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
              );
            };

            // Categorizar proyectos
            const myProjects = projects.filter(p => p.userId === currentUserId);
            const notMyProjects = projects.filter(p => p.userId !== currentUserId);

            // Separar mis proyectos: solo míos (sin colaboradores) vs con colaboradores
            const mySoloProjects = filterBySearch(myProjects.filter(p => !hasCollaborators(p.id) && !isProjectCompleted(p)));
            const myCollabProjects = filterBySearch(myProjects.filter(p => hasCollaborators(p.id) && !isProjectCompleted(p)));
            
            // Proyectos donde soy colaborador (no owner)
            const collabProjects = filterBySearch(notMyProjects.filter(p => !isProjectCompleted(p)));
            
            // Todos los proyectos colaborativos activos
            const allCollabProjects = [...myCollabProjects, ...collabProjects];
            
            // Proyectos completados (todos)
            const completedProjects = filterBySearch(projects.filter(p => isProjectCompleted(p)));

            // Función para renderizar un proyecto
            const renderProject = (project: Project) => {
            const projectTasks = tasks.filter(task => task.projectId === project.id);
            // ✅ usar status de DB correcto
            const completedTasks = projectTasks.filter(task => String(task.status).toLowerCase() === "done");
            const progress = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

            const isEditingThis = editingId === project.id;
            const isConfirmingThis = confirmDeleteId === project.id;

            // Si se está editando o confirmando, no envolver el Card con Link para evitar navegación accidental
            const CardInner = (
              <Card className={`group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 animate-fade-in-up ${isEditingThis || isConfirmingThis ? "cursor-default hover:shadow-lg hover:scale-100 hover:translate-y-0" : "cursor-pointer hover:shadow-blue-500/20"}`} data-testid={`project-card-${project.id}`} style={{animationDelay: `${0.1 * (projects.indexOf(project) % 6)}s`}}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    {/* Logo + Nombre */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-primary-blue rounded-lg flex items-center justify-center text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-blue-600 flex-shrink-0">
                        <span className="transition-transform duration-300 group-hover:scale-125">{getCategoryIcon(project.category ?? "")}</span>
                      </div>
                      
                      {!isEditingThis ? (
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 transition-all duration-300 group-hover:text-blue-600 group-hover:scale-105 truncate mb-2" data-testid={`text-project-name-${project.id}`}>
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <OwnerBadge 
                              ownerUsername={(project as any).owner_username}
                              ownerFullName={(project as any).owner_full_name}
                            />
                            <ProjectTypeBadge 
                              isCollaborative={hasCollaborators(project.id)}
                              memberCount={allProjectMembers.filter(m => m.projectId === project.id).length}
                            />
                            <AdminCreatedBadge 
                              createdByAdminUsername={(project as any).created_by_admin_username}
                            />
                          </div>
                        </div>
                      ) : (
                        <Input
                          className="flex-1"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value.slice(0, 35))}
                          placeholder="Project name"
                          maxLength={35}
                          data-testid={`input-project-name-${project.id}`}
                        />
                      )}
                      {isEditingThis && (
                        <span className="text-xs text-gray-400 ml-2">
                          {draftName.length}/35
                        </span>
                      )}
                    </div>

                    {/* actions */}
                    <div className="flex space-x-2 flex-shrink-0 ml-2">
                      {!isConfirmingThis && !isEditingThis && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                          onClick={(e) => startEdit(e, project)}
                          data-testid={`button-edit-${project.id}`}
                        >
                          <Edit2 className="h-4 w-4 transition-transform duration-300 hover:rotate-12" />
                        </Button>
                      )}

                      {isEditingThis && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                            onClick={(e) => saveEdit(e, project.id)}
                            disabled={updateProjectMutation.isPending}
                            data-testid={`button-save-${project.id}`}
                          >
                            <Save className="h-4 w-4 transition-transform duration-300 hover:rotate-12" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110 hover:rotate-90"
                            onClick={cancelEdit}
                            disabled={updateProjectMutation.isPending}
                            data-testid={`button-cancel-edit-${project.id}`}
                          >
                            <X className="h-4 w-4 transition-transform duration-300" />
                          </Button>
                        </>
                      )}

                      {!isEditingThis && !isConfirmingThis && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-500 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                          onClick={(e) => askDelete(e, project.id)}
                          disabled={deleteProjectMutation.isPending}
                          data-testid={`button-delete-${project.id}`}
                        >
                          <Trash2 className="h-4 w-4 transition-transform duration-300 hover:rotate-12" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* descripción */}
                  {!isEditingThis ? (
                    <p className="text-sm text-gray-600 mb-4 truncate transition-colors duration-300 group-hover:text-gray-700" data-testid={`text-project-description-${project.id}`}>
                      {project.description}
                    </p>
                  ) : (
                    <div className="mb-3">
                      <Textarea
                        className="text-sm"
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value.slice(0, 150))}
                        rows={3}
                        placeholder="Description"
                        maxLength={150}
                        data-testid={`textarea-project-description-${project.id}`}
                      />
                      <div className="flex justify-end mt-1">
                        <span className="text-xs text-gray-400">
                          {draftDescription.length}/150
                        </span>
                      </div>
                    </div>
                  )}

                  {/* categoría, tasks y colaboradores */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {!isEditingThis ? (
                        <>
                          <Badge 
                            variant="outline"
                            className="text-xs font-semibold bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-300 hover:from-slate-100 hover:to-gray-100 transition-all shadow-sm"
                            data-testid={`badge-category-${project.id}`}
                          >
                            <span className="mr-1">{getCategoryIcon(project.category ?? "")}</span>
                            {project.category ?? "uncategorized"}
                          </Badge>
                          <span className="text-xs text-gray-500" data-testid={`text-task-count-${project.id}`}>
                            {projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}
                          </span>
                        </>
                      ) : (
                        <select
                          className="h-8 w-40 border border-gray-300 rounded-md text-sm"
                          value={draftCategory}
                          onChange={(e) => setDraftCategory(e.target.value)}
                          data-testid={`select-project-category-${project.id}`}
                        >
                          <option value="">Select category</option>
                          <option value="development">Development 💻</option>
                          <option value="implementations">Implementations 🔧</option>
                          <option value="software-installation">Tekpro Software Installation 💿</option>
                          <option value="hardware-installation">Hardware Installation 🖥️</option>
                          <option value="training">Training 📚</option>
                          <option value="design">Design 🎨</option>
                          <option value="data">Data 📊</option>
                          <option value="research">Research 🔬</option>
                          <option value="marketing">Marketing 📈</option>
                        </select>
                      )}
                      
                      {/* Colaboradores al lado de tasks */}
                      {!isEditingThis && (
                        <CollaboratorsPreview projectId={project.id} />
                      )}
                    </div>
                  </div>

                  {/* confirmación de borrado inline */}
                  {!isEditingThis && isConfirmingThis && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-red-700 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-semibold">Delete "{project.name}"?</span>
                      </div>
                      <p className="text-xs text-red-600 mb-3">
                        This will permanently delete {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''} and all associated data.
                      </p>
                      
                      {/* Input de confirmación para proyectos con 1 o más tareas */}
                      {projectTasks.length >= 1 && (
                        <div className="mb-3">
                          <label className="text-xs text-red-700 font-semibold block mb-1">
                            Type <span className="bg-red-200 px-1 rounded">DELETE</span> to confirm:
                          </label>
                          <Input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="h-8 text-sm border-red-300 focus:border-red-500"
                            autoFocus
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3"
                          onClick={cancelDelete}
                          disabled={deleteProjectMutation.isPending}
                          data-testid={`button-cancel-delete-${project.id}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-3"
                          onClick={(e) => confirmDelete(e, project.id, projectTasks.length)}
                          disabled={deleteProjectMutation.isPending || (projectTasks.length >= 1 && deleteConfirmText.toUpperCase() !== "DELETE")}
                          data-testid={`button-confirm-delete-${project.id}`}
                        >
                          {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* progreso */}
                  <div className="mt-4 bg-gray-200 rounded-full h-2 transition-all duration-300 group-hover:bg-gray-300">
                    <div
                      className="bg-primary-blue h-2 rounded-full transition-all duration-500 group-hover:bg-blue-600"
                      style={{ width: `${progress}%` }}
                      data-testid={`progress-bar-${project.id}`}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 transition-colors duration-300 group-hover:text-gray-600" data-testid={`text-progress-${project.id}`}>
                    {Math.round(progress)}% Complete
                  </p>
                </CardContent>
              </Card>
            );

            // Si no hay edición/confirmación, permitimos click a detalle con <Link>.
            return isEditingThis || isConfirmingThis ? (
              <div key={project.id}>{CardInner}</div>
            ) : (
              <Link key={project.id} href={`/projects/${project.id}`} className="block">
                {CardInner}
              </Link>
            );
            };

            // Paginación
            const paginateProjects = (projects: Project[], page: number) => {
              const startIndex = (page - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              return projects.slice(startIndex, endIndex);
            };

            const soloTotalPages = Math.ceil(mySoloProjects.length / itemsPerPage);
            const collabTotalPages = Math.ceil(allCollabProjects.length / itemsPerPage);
            const completedTotalPages = Math.ceil(completedProjects.length / itemsPerPage);

            return (
              <div className="space-y-8">
                {/* My Solo Projects (sin colaboradores) */}
                {mySoloProjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">Your Projects</h3>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {mySoloProjects.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginateProjects(mySoloProjects, soloPage).map(renderProject)}
                    </div>
                    <PaginationControls
                      currentPage={soloPage}
                      totalPages={soloTotalPages}
                      onPageChange={setSoloPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={mySoloProjects.length}
                    />
                  </div>
                )}

                {/* Collaborative Projects (tuyos con colaboradores + donde eres colaborador) */}
                {allCollabProjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">Collaborative Projects</h3>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        {allCollabProjects.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginateProjects(allCollabProjects, collabPage).map(renderProject)}
                    </div>
                    <PaginationControls
                      currentPage={collabPage}
                      totalPages={collabTotalPages}
                      onPageChange={setCollabPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={allCollabProjects.length}
                    />
                  </div>
                )}

                {/* Completed Projects (todos) */}
                {completedProjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">Completed Projects</h3>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        {completedProjects.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginateProjects(completedProjects, completedPage).map(renderProject)}
                    </div>
                    <PaginationControls
                      currentPage={completedPage}
                      totalPages={completedTotalPages}
                      onPageChange={setCompletedPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={completedProjects.length}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      <CreateProjectModal
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
      />
    </div>
  );
}

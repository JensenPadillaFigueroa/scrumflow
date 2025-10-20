import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, ChevronLeft, ChevronRight, Save, X, Flame, FileText } from "lucide-react";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import { AssignedBadge } from "@/components/ui/assigned-badge";
import { TaskCollaboratorBadge } from "@/components/ui/collaborator-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Task, Project } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  project?: Project;
  color: "slate" | "amber" | "emerald" | "purple";
  /** newStatus usa vocabulario UI: "wishlist" | "todo" | "in-process" | "finished" */
  onStatusChange?: (taskId: string, newStatus: string) => void;
  /** Reordenamiento intra-columna: sourceId (arrastrado) -> targetId (tarjeta objetivo) con posición */
  onReorder?: (sourceId: string, targetId: string, position: "before" | "after") => void;
  /** Deshabilita hints y drop en tarjeta (usa drop-zone de la columna) */
  disableReorderHints?: boolean;
}

/** DB -> UI */
function toUiStatus(s: string | undefined | null): "wishlist" | "todo" | "in-process" | "finished" {
  if (!s) return "todo";
  const v = String(s).toLowerCase();
  if (v === "in_progress" || v === "in-progress" || v === "in process") return "in-process";
  if (v === "done" || v === "finished" || v === "complete" || v === "completed") return "finished";
  if (v === "wishlist") return "wishlist";
  return "todo";
}

/** UI -> DB */
function uiToDbStatus(s: string): "wishlist" | "todo" | "in_progress" | "done" {
  const v = String(s).toLowerCase();
  if (v === "in-process" || v === "in progress" || v === "in_progress") return "in_progress";
  if (v === "finished" || v === "done" || v === "complete" || v === "completed") return "done";
  if (v === "wishlist") return "wishlist";
  return "todo";
}

export default function TaskCard({ task, project, color, onStatusChange, onReorder, disableReorderHints }: TaskCardProps) {
  const { toast } = useToast();

  // Toggle focus mutation
  const toggleFocusMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}/toggle-focus`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to toggle focus');
      return res.json();
    },
    onSuccess: (updatedTask) => {
      // Invalidate and refetch tasks immediately
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tasks'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${task.projectId}/todays-focus`],
        refetchType: 'active'
      });
      
      // Force refetch
      queryClient.refetchQueries({ queryKey: ['/api/tasks'] });
      
      toast({
        title: updatedTask.focusToday ? "Added to Today's Focus" : "Removed from Today's Focus",
        description: updatedTask.focusToday ? "Task added to your focus for today" : "Task removed from focus",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update focus status",
        variant: "destructive",
      });
    },
  });

  // Obtener usuario actual para el badge de colaborador
  const { data: currentUser } = useQuery({
    queryKey: ["/api/session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      return data.user;
    }
  });

  // Datos para asignación (assignee)
  const selectedProjectId = project?.id;
  const { data: users = [] } = useQuery<Array<{ id: string; username: string; full_name: string }>>({
    queryKey: ["/api/users"],
  });
  const { data: projectMembers = [] } = useQuery<Array<{ userId: string }>>({
    queryKey: [`/api/projects/${selectedProjectId}/members`],
    enabled: !!selectedProjectId,
  });
  const isCollaborative = (projectMembers?.length ?? 0) > 0;
  // Filtrar usuarios disponibles: si es colaborativo, mostrar miembros (sin el owner, ya está en "Project Owner")
  // Si no es colaborativo, no mostrar ningún usuario adicional (solo "Project Owner" como opción)
  const availableUsers = isCollaborative
    ? users.filter(u => u.id !== project?.userId && projectMembers.some(m => m.userId === u.id))
    : [];

  // ---- State para edición/borrado inline ----
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editUiStatus, setEditUiStatus] = useState<"wishlist" | "todo" | "in-process" | "finished">(toUiStatus(task.status));
  const [editAssignedTo, setEditAssignedTo] = useState<string | null>(task.assignedTo ?? null);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const maxNotesLength = 250;

  // Ref para drag image personalizado
  const dragImageRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const [dropHint, setDropHint] = useState<"above" | "below" | null>(null);
  const lastHintRef = useRef<"above" | "below" | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const dropClearTimeoutRef = useRef<number | null>(null);

  // Sincroniza el form cuando cambie la task (por re-fetch)
  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditUiStatus(toUiStatus(task.status));
    setEditAssignedTo(task.assignedTo ?? null);
  }, [task.id, task.title, task.description, task.status]);

  const uiStatus = toUiStatus(task.status);

  useEffect(() => {
    console.log("[TaskCard] mount/update", { id: task.id, dbStatus: task.status, uiStatus });
  }, [task.id, task.status, uiStatus]);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Deleted", description: "Task deleted successfully." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => setIsConfirmingDelete(false),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (payload: { id: string; title?: string; description?: string; status?: string; assignedTo?: string | null }) => {
      const body = {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.status !== undefined ? { status: uiToDbStatus(payload.status) } : {}),
        ...(payload.assignedTo !== undefined ? { assignedTo: payload.assignedTo } : {}),
      };
      console.log("🔄 [TaskCard] Updating task:", payload.id, body);
      const res = await apiRequest("PUT", `/api/tasks/${payload.id}`, body);
      const updated = await res.json();
      console.log("✅ [TaskCard] Updated task response:", updated);
      return updated; // updated task with joins (assigned_to_username, etc.)
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });

      const prev = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];

      // Compute optimistic fields
      const newDbStatus = payload.status !== undefined ? uiToDbStatus(payload.status) : undefined;
      const fallbackOwnerId = project?.userId ?? null;
      const optimisticAssignedTo =
        payload.assignedTo !== undefined
          ? (payload.assignedTo ?? fallbackOwnerId)
          : undefined;
      const optimisticAssignedUser = optimisticAssignedTo
        ? users.find((u) => u.id === optimisticAssignedTo)
        : undefined;

      const next = prev.map((t) =>
        t.id === payload.id
          ? {
              ...t,
              ...(payload.title !== undefined ? { title: payload.title } : {}),
              ...(payload.description !== undefined ? { description: payload.description } : {}),
              ...(newDbStatus !== undefined ? { status: newDbStatus } : {}),
              ...(optimisticAssignedTo !== undefined ? { assignedTo: optimisticAssignedTo } : {}),
              ...(optimisticAssignedUser
                ? {
                    assigned_to_username: optimisticAssignedUser.username,
                    assigned_to_full_name: optimisticAssignedUser.full_name,
                  }
                : {}),
            }
          : t
      );

      queryClient.setQueryData(["/api/tasks"], next);

      return { previousTasks: prev } as { previousTasks: any[] };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/tasks"], context.previousTasks);
      }
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (updated) => {
      // Replace with server truth (includes joined fields)
      const prev = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];
      const next = prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));
      queryClient.setQueryData(["/api/tasks"], next);
      toast({ title: "Saved", description: "Task updated successfully." });
      setIsEditing(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTaskMutation.mutate(task.id);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsConfirmingDelete(false);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("💾 [TaskCard] Saving edit:", {
      id: task.id,
      title: editTitle,
      description: editDescription,
      status: editUiStatus,
      assignedTo: editAssignedTo,
    });
    updateTaskMutation.mutate({
      id: task.id,
      title: editTitle,
      description: editDescription,
      status: editUiStatus,
      assignedTo: editAssignedTo,
    });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditUiStatus(toUiStatus(task.status));
    setEditAssignedTo(task.assignedTo ?? null);
  };

  // Evitar selección de texto antes de que comience el drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || isConfirmingDelete) return;
    try { document.body.style.userSelect = "none"; } catch {}
  };

  const handleMouseUp = (_e: React.MouseEvent) => {
    if (isDragging) return; // dragEnd limpiará
    try { document.body.style.userSelect = ""; } catch {}
  };

  const handleMouseLeave = (_e: React.MouseEvent) => {
    if (isDragging) return; // dragEnd limpiará
    try { document.body.style.userSelect = ""; } catch {}
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";

    const target = e.currentTarget as HTMLElement;
    // Sugerencia visual en el elemento original
    target.style.opacity = "0.6";
    target.style.transition = "transform 120ms ease";
    target.style.transform = "rotate(3deg) scale(1.05)";
    target.style.boxShadow = "0 12px 24px rgba(0,0,0,0.18)";
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    try { document.body.style.userSelect = "none"; } catch {}

    // Crear imagen de arrastre personalizada
    const clone = target.cloneNode(true) as HTMLDivElement;
    clone.style.pointerEvents = "none";
    clone.style.position = "absolute";
    clone.style.top = "-9999px";
    clone.style.left = "-9999px";
    clone.style.width = `${target.getBoundingClientRect().width}px`;
    clone.style.transform = "rotate(2deg) scale(1.02)";
    clone.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
    document.body.appendChild(clone);
    dragImageRef.current = clone;
    e.dataTransfer.setDragImage(clone, Math.min(40, clone.offsetWidth / 4), 20);
    // Señal global: comenzó drag en Kanban
    try {
      (document.body as any).dataset.kanbanDragging = "1";
      window.dispatchEvent(new CustomEvent("kanban:drag", { detail: { dragging: true } }));
    } catch {}
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!isDragging) return;
    const target = e.currentTarget as HTMLElement;
    const startX = dragStartXRef.current ?? e.clientX;
    const dx = e.clientX - startX;
    // Map horizontal movement to a -5deg .. 5deg rotation
    const deg = Math.max(-5, Math.min(5, dx * 0.06));
    target.style.transform = `rotate(${deg}deg) scale(1.05)`;
    target.style.opacity = "0.4";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Restaurar el estado visual original con transición suave
    const target = e.currentTarget as HTMLElement;
    target.style.transition = "all 0.2s ease-out";
    target.style.transform = "";
    target.style.opacity = "";
    target.style.zIndex = "";
    target.style.boxShadow = "";

    // Limpiar transición después de la animación
    setTimeout(() => {
      target.style.transition = "";
    }, 200);

    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
    setIsDragging(false);
    dragStartXRef.current = null;
    try { document.body.style.userSelect = ""; } catch {}
    // Señal global: terminó drag en Kanban
    try {
      (document.body as any).dataset.kanbanDragging = "0";
      window.dispatchEvent(new CustomEvent("kanban:drag", { detail: { dragging: false } }));
    } catch {}
  };

  // Permitir drop sobre la tarjeta para reordenar dentro de la misma columna
  const handleCardDragOver = (e: React.DragEvent) => {
    if (isEditing || isConfirmingDelete) return;
    if (disableReorderHints) return; // dejar que la columna maneje el drop
    // Si es la misma tarjeta que se está arrastrando, no mostrar hint
    if (isDragging) {
      if (dropHint) setDropHint(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // @ts-ignore
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    if (dropClearTimeoutRef.current) {
      clearTimeout(dropClearTimeoutRef.current);
      dropClearTimeoutRef.current = null;
    }
    // rAF para evitar demasiados re-renders y dead-zone para evitar "brinco"
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const clientY = e.clientY;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const topZone = rect.top + rect.height * 0.35;   // 35% superior -> "above"
    const bottomZone = rect.top + rect.height * 0.65; // 65% inferior -> "below"
    rafIdRef.current = requestAnimationFrame(() => {
      let next: "above" | "below" | null = lastHintRef.current;
      if (clientY < topZone) next = "above";
      else if (clientY > bottomZone) next = "below";
      // En zona muerta (35-65%), mantenemos el último hint para evitar parpadeo
      if (next !== dropHint) {
        lastHintRef.current = next;
        setDropHint(next);
      }
    });
  };

  const handleCardDrop = (e: React.DragEvent) => {
    if (isEditing || isConfirmingDelete) return;
    if (disableReorderHints) return; // no reordenar por tarjeta en columnas bloqueadas
    if (isDragging) return; // No permitir drop sobre sí misma
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === task.id) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const isAbove = e.clientY < rect.top + rect.height / 2;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (dropClearTimeoutRef.current) {
      clearTimeout(dropClearTimeoutRef.current);
      dropClearTimeoutRef.current = null;
    }
    setDropHint(null);
    lastHintRef.current = null;
    onReorder?.(sourceId, task.id, isAbove ? "before" : "after");
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    if (isEditing || isConfirmingDelete) return;
    // Solo limpiar si realmente salimos del elemento
    const el = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as HTMLElement;
    if (related && el.contains(related)) return;
    
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (dropClearTimeoutRef.current) clearTimeout(dropClearTimeoutRef.current);
    dropClearTimeoutRef.current = window.setTimeout(() => {
      setDropHint(null);
      lastHintRef.current = null;
      dropClearTimeoutRef.current = null;
    }, 60);
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
    switch ((category || "").toLowerCase()) {
      case "development": return "bg-green-100 text-green-800";
      case "design": return "bg-blue-100 text-blue-800";
      case "marketing": return "bg-purple-100 text-purple-800";
      case "research": return "bg-orange-100 text-orange-800";
      case "data": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isFinished = uiStatus === "finished";

  const getNextStage = (currentUiStatus: string) => {
    switch (currentUiStatus) {
      case "wishlist": return "todo";
      case "todo": return "in-process";
      case "in-process": return "finished";
      default: return null;
    }
  };

  const getPreviousStage = (currentUiStatus: string) => {
    switch (currentUiStatus) {
      case "finished": return "in-process";
      case "in-process": return "todo";
      case "todo": return "wishlist";
      default: return null;
    }
  };

  const handleMoveNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing || isConfirmingDelete) return;
    const nextStage = getNextStage(uiStatus);
    if (nextStage && onStatusChange) onStatusChange(task.id, nextStage);
  };

  const handleMovePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing || isConfirmingDelete) return;
    const prev = getPreviousStage(uiStatus);
    if (prev && onStatusChange) onStatusChange(task.id, prev);
  };

  const canMoveNext = getNextStage(uiStatus) !== null;
  const canMovePrevious = getPreviousStage(uiStatus) !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.9 }}
      style={{ willChange: "transform, opacity" }}
    >
    <Card
      className={`relative cursor-${isEditing || isConfirmingDelete ? "default" : "move"} transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 group border-l-4 ${getBorderColor()} ${isFinished ? "opacity-75 bg-gray-50/50" : "bg-white"} ${(dropHint && !isDragging) ? "outline outline-2 outline-blue-400/40 ring-2 ring-blue-100" : ""} ${(dropHint === "above" && !isDragging) ? "mt-1.5" : (dropHint === "below" && !isDragging) ? "mb-1.5" : ""} transition-[margin,shadow,background] ease-out duration-150 overflow-hidden`}
      draggable={!(isEditing || isConfirmingDelete)}
      onDragStart={isEditing || isConfirmingDelete ? undefined : handleDragStart}
      onDrag={isEditing || isConfirmingDelete ? undefined : handleDrag}
      onDragEnd={isEditing || isConfirmingDelete ? undefined : handleDragEnd}
      onDragOver={isEditing || isConfirmingDelete ? undefined : handleCardDragOver}
      onDrop={isEditing || isConfirmingDelete ? undefined : handleCardDrop}
      onDragLeave={isEditing || isConfirmingDelete ? undefined : handleCardDragLeave}
      onMouseDown={isEditing || isConfirmingDelete ? undefined : handleMouseDown}
      onMouseUp={isEditing || isConfirmingDelete ? undefined : handleMouseUp}
      onMouseLeave={isEditing || isConfirmingDelete ? undefined : handleMouseLeave}
      data-testid={`task-card-${task.id}`}
      style={{ willChange: isEditing || isConfirmingDelete ? undefined : ("transform, opacity" as any), userSelect: isDragging ? "none" : undefined, WebkitUserSelect: isDragging ? "none" : undefined }}
    >
      {dropHint === "above" && !isDragging && !disableReorderHints && (
        <>
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all duration-100 ease-out pointer-events-none animate-in fade-in-0 slide-in-from-top-1" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] pointer-events-none animate-in zoom-in-50" />
        </>
      )}
      {dropHint === "below" && !isDragging && !disableReorderHints && (
        <>
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all duration-100 ease-out pointer-events-none animate-in fade-in-0 slide-in-from-bottom-1" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] pointer-events-none animate-in zoom-in-50" />
        </>
      )}
      <CardContent className="p-4 relative">
        {/* Barra de estado sutil en la parte superior */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${isFinished ? "bg-emerald-400" : "bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-0 group-hover:opacity-100"} transition-opacity duration-300`} />
        {/* Header + actions */}
        <div className="flex items-start justify-between mb-3">
          {!isEditing ? (
            <div className="flex-1 min-w-0 pr-1">
              <h4
                className={`text-sm font-semibold text-gray-900 transition-colors duration-300 group-hover:text-blue-700 ${isFinished ? "line-through text-gray-500" : ""} truncate`}
                data-testid={`text-task-title-${task.id}`}
                title={task.title}
              >
                {task.title}
              </h4>
            </div>
          ) : (
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Task Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value.slice(0, 25))}
                placeholder="Enter task title"
                maxLength={25}
                className="h-9 text-sm border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                data-testid={`input-edit-title-${task.id}`}
              />
              <p className="text-xs text-gray-500 mt-1">{editTitle.length}/25 characters</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-0.5 flex-shrink-0">
            {!isEditing && !isConfirmingDelete && canMovePrevious && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-6 w-6 p-0 transition-all duration-200 hover:scale-105 rounded-full"
                onClick={handleMovePrevious}
                title="Move to previous stage"
                data-testid={`button-move-previous-${task.id}`}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            )}
            {!isEditing && !isConfirmingDelete && canMoveNext && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-6 w-6 p-0 transition-all duration-200 hover:scale-105 rounded-full"
                onClick={handleMoveNext}
                title="Move to next stage"
                data-testid={`button-move-next-${task.id}`}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}

            {/* Edit / Save - Cancel */}
            {!isConfirmingDelete && !isFinished && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-amber-600 hover:bg-amber-50 h-6 w-6 p-0 transition-all duration-200 hover:scale-105 rounded-full"
                onClick={handleEditClick}
                data-testid={`button-edit-task-${task.id}`}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-6 w-6 p-0 transition-all duration-200 hover:scale-105 rounded-full"
                  onClick={handleSaveEdit}
                  disabled={isBusy}
                  data-testid={`button-save-task-${task.id}`}
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 h-6 w-6 p-0 transition-all duration-200 hover:scale-105 rounded-full"
                  onClick={handleCancelEdit}
                  disabled={isBusy}
                  data-testid={`button-cancel-edit-${task.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}

            {/* Add to Focus */}
            {!isEditing && !isConfirmingDelete && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 transition-all duration-200 hover:scale-105 rounded-full ${
                  task.focusToday 
                    ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50' 
                    : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                }`}
                onClick={() => toggleFocusMutation.mutate()}
                disabled={isBusy || toggleFocusMutation.isPending}
                title={task.focusToday ? "Remove from Today's Focus" : "Add to Today's Focus"}
                data-testid={`button-focus-task-${task.id}`}
              >
                <Flame className={`h-3 w-3 ${task.focusToday ? 'animate-pulse' : ''}`} />
              </Button>
            )}

            {/* Delete / inline confirm */}
            {!isEditing && !isConfirmingDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0 transition-all duration-200 hover:scale-105 rounded-full"
                onClick={handleDeleteClick}
                disabled={isBusy}
                data-testid={`button-delete-task-${task.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Inline delete confirm */}
        {isConfirmingDelete && (
          <div className="mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-2">
            <span className="text-xs text-red-700 break-words">
              Delete "{task.title.length > 10 ? task.title.substring(0, 10) + '...' : task.title}"? This action cannot be undone.
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2"
                onClick={handleConfirmDelete}
                disabled={isBusy}
                data-testid={`button-confirm-delete-${task.id}`}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={handleCancelDelete}
                disabled={isBusy}
                data-testid={`button-cancel-delete-${task.id}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Completion Notes (for finished tasks) or Description */}
        {!isEditing ? (
          <>
            {isFinished && task.completionNotes ? (
              // Show completion notes for finished tasks
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-green-700">✓ Solution</span>
                    {task.description && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline">
                            (view description)
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-80 p-3 z-50">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Original Description:</p>
                          <div className="max-h-60 overflow-y-auto pr-2">
                            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed break-words">
                              {task.description}
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  {task.completionNotes.length > maxNotesLength && (
                    <button
                      onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {isNotesExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200 break-words overflow-wrap-anywhere whitespace-pre-wrap leading-relaxed">
                  {isNotesExpanded || task.completionNotes.length <= maxNotesLength
                    ? task.completionNotes
                    : `${task.completionNotes.substring(0, maxNotesLength)}...`}
                </p>
              </div>
            ) : (
              // Show description for non-finished or tasks without completion notes
              <p className="text-xs text-gray-600 mb-3 transition-colors duration-300 group-hover:text-gray-800 break-words overflow-wrap-anywhere whitespace-pre-wrap leading-relaxed" data-testid={`text-task-description-${task.id}`}>
                {task.description}
              </p>
            )}
          </>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              className="text-xs border-blue-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
              placeholder="Describe the task..."
              data-testid={`textarea-edit-description-${task.id}`}
            />
            <p className="text-xs text-gray-500 mt-1">{editDescription.length}/500 characters</p>
          </div>
        )}

        {/* Status-specific content */}
        {!isEditing && uiStatus === "in-process" && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs text-gray-700">65%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-1.5">
              <div className="bg-warning-amber h-1.5 rounded-full" style={{ width: "65%" }} />
            </div>
          </div>
        )}

        {/* Assignee selector (solo en edición y si hay colaboradores) */}
        {isEditing && isCollaborative && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned To</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 w-full text-xs justify-between border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                  data-testid={`select-edit-assignee-${task.id}`}
                >
                  <span className="truncate">
                    {(() => {
                      if (!editAssignedTo) return "Project Owner (default)";
                      const user = users.find(u => u.id === editAssignedTo);
                      return user ? `${user.full_name || user.username} (@${user.username})` : "Unknown user";
                    })()}
                  </span>
                  <span className="ml-2 text-gray-400">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-full min-w-[240px]">
                <DropdownMenuItem 
                  onClick={() => setEditAssignedTo(null)}
                  className="cursor-pointer hover:bg-blue-50"
                >
                  <span className="font-medium">Project Owner</span>
                  <span className="ml-auto text-xs text-gray-500">(default)</span>
                </DropdownMenuItem>
                {availableUsers.map((u) => (
                  <DropdownMenuItem 
                    key={u.id} 
                    onClick={() => setEditAssignedTo(u.id)}
                    className="cursor-pointer hover:bg-blue-50"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{u.full_name || u.username}</span>
                      <span className="text-xs text-gray-500">@{u.username}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Status selector (solo en edición) */}
        {isEditing && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 w-full text-xs justify-between border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                  data-testid={`select-edit-status-${task.id}`}
                >
                  <span className="flex items-center gap-2">
                    {editUiStatus === "wishlist" && <><span className="w-2 h-2 rounded-full bg-purple-500"></span>Wishlist</>}
                    {editUiStatus === "todo" && <><span className="w-2 h-2 rounded-full bg-slate-500"></span>To-Do</>}
                    {editUiStatus === "in-process" && <><span className="w-2 h-2 rounded-full bg-amber-500"></span>In Process</>}
                    {editUiStatus === "finished" && <><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Finished</>}
                  </span>
                  <span className="ml-2 text-gray-400">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-full min-w-[180px]">
                <DropdownMenuItem 
                  onClick={() => setEditUiStatus("wishlist")}
                  className="cursor-pointer hover:bg-purple-50"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                  Wishlist
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setEditUiStatus("todo")}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
                  To-Do
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setEditUiStatus("in-process")}
                  className="cursor-pointer hover:bg-amber-50"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                  In Process
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setEditUiStatus("finished")}
                  className="cursor-pointer hover:bg-emerald-50"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                  Finished
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Created by badges */}
            <AdminCreatedBadge 
              createdByAdminUsername={(task as any).created_by_admin_username}
            />
            <TaskCollaboratorBadge
              createdByUsername={(task as any).created_by_username}
              createdByFullName={(task as any).created_by_full_name}
              createdByUserId={(task as any).userId}
              projectOwnerId={project?.userId}
              currentUsername={currentUser?.username}
            />
            {/* Assigned badge - solo mostrar si hay colaboradores */}
            {isCollaborative && (
              <AssignedBadge 
                assignedToUsername={(task as any).assigned_to_username}
                assignedToFullName={(task as any).assigned_to_full_name}
              />
            )}
          </div>
          {/* Completed date - mostrar en línea separada si está finished */}
          {!isEditing && isFinished && (
            <div className="mt-2 text-xs text-gray-400" data-testid={`text-completed-date-${task.id}`}>
              ✓ Completed {new Date(task.createdAt!).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}

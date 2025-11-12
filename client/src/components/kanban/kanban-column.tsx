import { useEffect, useMemo, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TaskCard from "./task-card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import CompletionNotesModal from "./completion-notes-modal";
import type { Task, Project } from "@shared/schema";

interface KanbanColumnProps {
  title: string;
  /** UI status de la columna: "wishlist" | "todo" | "in-process" | "finished" */
  status: string;
  /** Las tasks llegan con status de DB: "wishlist" | "todo" | "in_progress" | "done" */
  tasks: Task[];
  projects: Project[];
  /** Se recalcula localmente; si lo pasas será ignorado para evitar desfasajes. */
  count: number;
  color: "slate" | "amber" | "emerald" | "purple";
  /** Pasa SIEMPRE el arreglo completo aquí si puedes (ideal). */
  allTasks?: Task[];
  /** Recibe el status UI por defecto para el modal */
  onCreateTask?: (defaultStatusUi: "wishlist" | "todo" | "in-process" | "finished") => void;
}

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

/** UI -> DB (para updates PUT) */
function uiToDbStatus(s: string): "wishlist" | "todo" | "in_progress" | "done" {
  const raw = norm(s).replace(/\s+/g, "-");
  if (raw === "wishlist") return "wishlist";
  if (raw === "in-process" || raw === "in_progress") return "in_progress";
  if (raw === "finished" || raw === "done" || raw === "completed" || raw === "complete") return "done";
  return "todo";
}

export default function KanbanColumn({
  title,
  status,
  tasks,
  projects,
  color,
  allTasks,
  onCreateTask
}: KanbanColumnProps) {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const dropTimeoutRef = useRef<number | null>(null);
  const isProcessingDropRef = useRef(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [isAmending, setIsAmending] = useState(false);
  
  // Invalidation gate: delay invalidate during drag to keep DnD fluid
  const invalidateTasksWhenIdle = () => {
    try {
      // @ts-ignore
      const dragging = (document.body as any)?.dataset?.kanbanDragging === "1";
      if (dragging) {
        const handler = (ev: any) => {
          if (!ev?.detail?.dragging) {
            window.removeEventListener("kanban:drag", handler);
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            }, 80);
          }
        };
        window.addEventListener("kanban:drag", handler);
      } else {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }, 80);
      }
    } catch {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
  };

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // 10 tareas por página
  
  // Nota: el total de páginas y el slice se calculan después de ordenar por orderIndex

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      await apiRequest("PUT", `/api/tasks/${taskId}`, { status: uiToDbStatus(newStatus) });
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      const previous = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];
      const targetDb = uiToDbStatus(newStatus);
      const optimistic = previous.map(t => (t.id === taskId ? { ...t, status: targetDb } : t));
      queryClient.setQueryData(["/api/tasks"], optimistic);
      return { previous } as { previous: any[] };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["/api/tasks"], ctx.previous);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      invalidateTasksWhenIdle();
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Mostrar indicador de destino y comunicar intención de mover
    // @ts-ignore
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (_e: React.DragEvent) => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    // Prevenir drops múltiples
    if (isProcessingDropRef.current) return;
    
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    // Tomar del cache global para evitar inconsistencias al cargar
    const all = (queryClient.getQueryData<any[]>(["/api/tasks"]) || []) as any[];
    let moved = all.find(t => t.id === taskId);
    if (!moved) {
      const fallback = (allTasks ?? tasks) || [];
      moved = fallback.find((t: any) => t.id === taskId);
    }
    if (!moved) return;

    const currentDb = norm(moved.status);
    const targetDb = uiToDbStatus(status);

    // Si no hay cambio de columna ni proyecto, ignorar
    if (currentDb === targetDb) {
      // Mismo status, no hacer nada en drop de columna (solo card-to-card reorder)
      return;
    }

    // Check if moving to "finished" status
    const isMovingToFinished = targetDb === "done";
    const wasAlreadyFinished = currentDb === "done";
    
    // If moving TO finished, show completion modal
    if (isMovingToFinished && !wasAlreadyFinished) {
      setTaskToComplete(moved);
      setIsAmending(false);
      setCompletionModalOpen(true);
      isProcessingDropRef.current = false;
      return;
    }
    
    // If moving back TO finished after being moved out, show amend modal
    if (isMovingToFinished && wasAlreadyFinished && moved.completionNotes) {
      setTaskToComplete(moved);
      setIsAmending(true);
      setCompletionModalOpen(true);
      isProcessingDropRef.current = false;
      return;
    }

    // A partir de aquí procesamos el drop; bloquear reentradas
    isProcessingDropRef.current = true;

    const sameProjectId = moved.projectId ?? null;
    
    // Construir la lista destino desde cache: mismo status y mismo proyecto
    const fullTargetList = all
      .filter(t => t.id !== moved.id && norm(t.status) === targetDb && String(t.projectId ?? '') === String(sameProjectId ?? ''))
      .sort((a, b) => {
        const ai = (a.orderIndex ?? Number.POSITIVE_INFINITY) as number;
        const bi = (b.orderIndex ?? Number.POSITIVE_INFINITY) as number;
        if (ai !== bi) return ai - bi;
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });

    // Insertar al PRINCIPIO
    const newOrder = [moved, ...fullTargetList];
    const updates = newOrder.map((t, i) => ({ id: t.id, orderIndex: i + 1, status: targetDb }));

    // Optimista en cache: actualizar status + orderIndex de todas las afectadas
    const prev = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];
    const next = prev.map(t => {
      const u = updates.find(u => u.id === t.id);
      if (u) {
        return { ...t, status: u.status, orderIndex: u.orderIndex };
      }
      return t;
    });
    queryClient.setQueryData(["/api/tasks"], next);

    // Persistir al backend: solo la tarea movida (con status + orderIndex)
    // Las demás solo necesitan orderIndex si cambiaron
    const promises: Promise<any>[] = [];
    promises.push(apiRequest("PUT", `/api/tasks/${moved.id}`, { status: targetDb, orderIndex: 1 }));
    for (let i = 1; i < updates.length; i++) {
      const u = updates[i];
      // Solo actualizar orderIndex de las demás si cambió
      const existing = all.find(t => t.id === u.id);
      if (existing && existing.orderIndex !== u.orderIndex) {
        promises.push(apiRequest("PUT", `/api/tasks/${u.id}`, { orderIndex: u.orderIndex }));
      }
    }

    Promise.all(promises)
      .then(() => {
        // Invalidar cuando no haya drag activo para evitar saltos durante DnD
        invalidateTasksWhenIdle();
        isProcessingDropRef.current = false;
      })
      .catch((err) => {
        console.error("[DROP] Error moving task:", err);
        queryClient.setQueryData(["/api/tasks"], prev);
        toast({ title: "Error", description: "Failed to move task.", variant: "destructive" });
        isProcessingDropRef.current = false;
      });
  };

  const styles = (() => {
    switch (color) {
      case "slate":
        return { bg: "bg-slate-100", dotColor: "bg-slate-500", badgeColor: "bg-slate-200 text-slate-700", plusColor: "text-slate-500 hover:text-slate-700", ring: "ring-slate-300 border-slate-300" };
      case "amber":
        return { bg: "bg-amber-50", dotColor: "bg-warning-amber", badgeColor: "bg-amber-200 text-amber-700", plusColor: "text-amber-500 hover:text-amber-700", ring: "ring-amber-300 border-amber-300" };
      case "emerald":
        return { bg: "bg-emerald-50", dotColor: "bg-success-green", badgeColor: "bg-emerald-200 text-emerald-700", plusColor: "text-emerald-500 hover:text-emerald-700", ring: "ring-emerald-300 border-emerald-300" };
      case "purple":
        return { bg: "bg-purple-50", dotColor: "bg-purple-500", badgeColor: "bg-purple-200 text-purple-700", plusColor: "text-purple-500 hover:text-purple-700", ring: "ring-purple-300 border-purple-300" };
    }
  })();

  const uiCol = norm(status).replace(/\s+/g, "-");
  const dbTarget: "wishlist" | "todo" | "in_progress" | "done" =
    uiCol === "in-process" ? "in_progress"
    : uiCol === "finished" ? "done"
    : uiCol === "wishlist" ? "wishlist"
    : "todo";

  const sourceTasks = allTasks ?? tasks;

  const tasksForThisColumn = useMemo(
    () => (sourceTasks ?? []).filter(t => norm(t.status) === dbTarget),
    [sourceTasks, dbTarget]
  );

  // Orden estable: orderIndex ASC (nulls al final), luego createdAt DESC
  const orderedTasksForThisColumn = useMemo(() => {
    const copy = [...tasksForThisColumn];
    copy.sort((a: any, b: any) => {
      const ai = a.orderIndex ?? Number.POSITIVE_INFINITY;
      const bi = b.orderIndex ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
    return copy;
  }, [tasksForThisColumn]);

  // Paginación basada en orden
  const totalPages = Math.ceil(orderedTasksForThisColumn.length / itemsPerPage);
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleTasks = orderedTasksForThisColumn.slice(startIndex, endIndex);

  useEffect(() => {
    console.log("[KanbanColumn] render", {
      column: { ui: status, dbTarget },
      totalInSource: sourceTasks.length,
      countInColumn: tasksForThisColumn.length,
      sample: tasksForThisColumn.slice(0, 5).map(t => ({ id: t.id, status: t.status }))
    });
  }, [status, dbTarget, sourceTasks, tasksForThisColumn]);

  const countLocal = tasksForThisColumn.length;

  const handleSaveCompletionNotes = async (notes: string) => {
    if (!taskToComplete) return;
    
    try {
      // Update task with completion notes and status
      await apiRequest("PUT", `/api/tasks/${taskToComplete.id}`, {
        status: "done",
        orderIndex: 1,
        completionNotes: notes
      });
      
      // Invalidate to refresh
      invalidateTasksWhenIdle();
      
      toast({
        title: isAmending ? "Notes Updated" : "Task Completed!",
        description: isAmending ? "Completion notes have been updated." : "Great job! Task marked as complete.",
      });
    } catch (err) {
      console.error("[COMPLETION] Error saving notes:", err);
      toast({
        title: "Error",
        description: "Failed to save completion notes.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <CompletionNotesModal
        isOpen={completionModalOpen}
        onClose={() => {
          setCompletionModalOpen(false);
          setTaskToComplete(null);
          setIsAmending(false);
        }}
        onSave={handleSaveCompletionNotes}
        task={taskToComplete}
        isAmending={isAmending}
      />
    
    <div
      className={`group relative ${styles.bg} rounded-xl p-4 border-2 ${isDragOver ? `ring-4 ${styles.ring} shadow-2xl scale-[1.03] border-blue-300` : "border-transparent"} transition-all duration-200 ease-out hover:shadow-2xl hover:-translate-y-1 animate-fade-in-up flex flex-col`}
      data-testid={`kanban-column-${status}`}
      style={{animationDelay: `${1.4 + (["wishlist", "todo", "in-process", "finished"].indexOf(status) * 0.1)}s`}}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-8">
          <div className="px-2 py-1 text-xs rounded-md bg-white/90 border shadow-sm transition-opacity duration-150 animate-in fade-in-0 zoom-in-95">Drop to move here</div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 ${styles.dotColor} rounded-full transition-all duration-300 group-hover:scale-125 group-hover:shadow-lg`} />
          <h3 className="text-lg font-semibold text-gray-900 transition-all duration-300 group-hover:scale-105">{title}</h3>
          <span className={`${styles.badgeColor} text-xs font-medium px-2 py-1 rounded-full transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5`} data-testid={`text-task-count-${status}`}>
            {countLocal}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`${styles.plusColor} transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:shadow-md`}
          onClick={() => onCreateTask?.(status as "wishlist" | "todo" | "in-process" | "finished")}
          data-testid={`button-add-task-${status}`}
        >
          <Plus className="h-4 w-4 transition-transform duration-300 hover:rotate-90" />
        </Button>
      </div>

      <div
        className="space-y-3 min-h-[400px] flex-grow transition-all duration-200 pt-2"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid={`drop-zone-${status}`}
      >
        {tasksForThisColumn.length === 0 ? (
          <div className="text-center py-8 animate-fade-in-up pointer-events-none" style={{animationDelay: `${1.6 + (["wishlist", "todo", "in-process", "finished"].indexOf(status) * 0.1)}s`}}>
            <div className={`w-12 h-12 ${styles.dotColor} rounded-full mx-auto mb-3 opacity-20 transition-all duration-300 hover:opacity-40 hover:scale-110`}></div>
            <p className="text-gray-400 text-sm transition-colors duration-300 hover:text-gray-500">No tasks</p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const project = projects.find(p => p.id === task.projectId);
            return (
              <TaskCard
                key={task.id}
                task={task}
                project={project}
                color={color}
                disableReorderHints={dbTarget === "done"}
                onStatusChange={(taskId, newStatusUi) =>
                  updateTaskMutation.mutate({ taskId, newStatus: newStatusUi })
                }
                onReorder={(sourceId: string, targetId: string, position: "before" | "after") => {
                  // Reordenamiento con hint: puede ser intra-columna o inter-columna
                  try {
                    const all = (queryClient.getQueryData<any[]>(["/api/tasks"]) || []) as any[];
                    const moved = all.find(t => t.id === sourceId);
                    const target = all.find(t => t.id === targetId);
                    if (!moved || !target) return;

                    const movedDb = norm(moved.status);
                    const targetDb = norm(target.status);
                    const sameProjectId = moved.projectId ?? null;
                    // Si se mueve desde otra columna hacia Finished (done), ignorar posición y colocar al principio
                    if (movedDb !== targetDb && targetDb === "done") {
                      // Construir lista destino (mismo proyecto y status), excluir moved
                      const fullTargetList = all
                        .filter(t => t.id !== moved.id && norm(t.status) === targetDb && String(t.projectId ?? '') === String(sameProjectId ?? ''))
                        .sort((a, b) => {
                          const ai = (a.orderIndex ?? Number.POSITIVE_INFINITY) as number;
                          const bi = (b.orderIndex ?? Number.POSITIVE_INFINITY) as number;
                          if (ai !== bi) return ai - bi;
                          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return bt - at;
                        });

                      const newOrder = [moved, ...fullTargetList];
                      const updates = newOrder.map((t, i) => ({ id: t.id, orderIndex: i + 1, status: targetDb }));

                      // Optimista
                      const prev = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];
                      const next = prev.map(t => {
                        const u = updates.find(u => u.id === t.id);
                        if (u) return { ...t, status: u.status, orderIndex: u.orderIndex };
                        return t;
                      });
                      queryClient.setQueryData(["/api/tasks"], next);

                      // Persistir
                      const promises: Promise<any>[] = [];
                      promises.push(apiRequest("PUT", `/api/tasks/${moved.id}`, { status: targetDb, orderIndex: 1 }));
                      for (let i = 1; i < updates.length; i++) {
                        const u = updates[i];
                        const existing = all.find(t => t.id === u.id);
                        if (existing && existing.orderIndex !== u.orderIndex) {
                          promises.push(apiRequest("PUT", `/api/tasks/${u.id}`, { orderIndex: u.orderIndex }));
                        }
                      }

                      Promise.all(promises)
                        .then(() => {
                          invalidateTasksWhenIdle();
                        })
                        .catch((err) => {
                          console.error("[REORDER->Finished] Error:", err);
                          queryClient.setQueryData(["/api/tasks"], prev);
                          toast({ title: "Error", description: "Failed to move task.", variant: "destructive" });
                        });
                      return;
                    }

                    // Construir lista de la columna destino (mismo status que target, mismo proyecto)
                    let targetList = all
                      .filter(t => norm(t.status) === targetDb && String(t.projectId ?? '') === String(sameProjectId ?? ''))
                      .sort((a, b) => {
                        const ai = (a.orderIndex ?? Number.POSITIVE_INFINITY) as number;
                        const bi = (b.orderIndex ?? Number.POSITIVE_INFINITY) as number;
                        if (ai !== bi) return ai - bi;
                        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return bt - at;
                      });

                    // Quitar moved de la lista si ya estaba
                    targetList = targetList.filter(t => t.id !== moved.id);

                    // Encontrar índice del target en la lista ordenada
                    const targetIdx = targetList.findIndex(t => t.id === targetId);
                    if (targetIdx === -1) return;

                    // Insertar antes o después según position
                    const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
                    targetList.splice(insertIdx, 0, moved);

                    // Recalcular orderIndex secuencial
                    const updates = targetList.map((t, i) => ({ id: t.id, orderIndex: i + 1, status: targetDb }));

                    // Optimista en cache
                    const prev = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];
                    const next = prev.map(t => {
                      const u = updates.find(u => u.id === t.id);
                      if (u) {
                        return { ...t, status: u.status, orderIndex: u.orderIndex };
                      }
                      return t;
                    });
                    queryClient.setQueryData(["/api/tasks"], next);

                    // Persistir: moved con status + orderIndex, demás solo orderIndex si cambió
                    const promises: Promise<any>[] = [];
                    const movedUpdate = updates.find(u => u.id === moved.id);
                    if (movedUpdate) {
                      const body: any = { orderIndex: movedUpdate.orderIndex };
                      if (movedDb !== targetDb) body.status = targetDb;
                      promises.push(apiRequest("PUT", `/api/tasks/${moved.id}`, body));
                    }
                    for (const u of updates) {
                      if (u.id === moved.id) continue;
                      const existing = all.find(t => t.id === u.id);
                      if (existing && existing.orderIndex !== u.orderIndex) {
                        promises.push(apiRequest("PUT", `/api/tasks/${u.id}`, { orderIndex: u.orderIndex }));
                      }
                    }

                    Promise.all(promises)
                      .then(() => {
                        invalidateTasksWhenIdle();
                      })
                      .catch((err) => {
                        console.error("[REORDER] Error:", err);
                        queryClient.setQueryData(["/api/tasks"], prev);
                        toast({ title: "Error", description: "Failed to reorder tasks.", variant: "destructive" });
                      });
                  } catch (err) {
                    console.error("[REORDER] Exception:", err);
                    toast({ title: "Error", description: "Failed to reorder tasks.", variant: "destructive" });
                  }
                }}
              />
            );
          })
        )}
      </div>
      
      {/* Controles de paginación */}
      {tasksForThisColumn.length > itemsPerPage && (
        <div className="mt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={orderedTasksForThisColumn.length}
            compact={true}
          />
        </div>
      )}
    </div>
    </>
  );
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UseProjectSyncOptions {
  projectId: string;
  enabled?: boolean;
  pollInterval?: number; // en milisegundos
}

/**
 * Hook para mantener sincronizado un proyecto compartido
 * Invalida automáticamente las queries relacionadas y opcionalmente hace polling
 */
export function useProjectSync({ 
  projectId, 
  enabled = true, 
  pollInterval = 5000 // 5 segundos por defecto para colaboración rápida
}: UseProjectSyncOptions) {
  const queryClient = useQueryClient();

  // Función para invalidar todas las queries relacionadas con el proyecto
  const invalidateProjectQueries = () => {
    // Invalidar tareas del proyecto
    queryClient.invalidateQueries({ 
      queryKey: ["/api/tasks"],
      refetchType: "active"
    });
    
    // Invalidar Today's Focus del proyecto
    queryClient.invalidateQueries({ 
      queryKey: [`/api/projects/${projectId}/todays-focus`],
      refetchType: "active"
    });
    
    // Invalidar Team Focus del proyecto
    queryClient.invalidateQueries({ 
      queryKey: [`/api/projects/${projectId}/team-focus`],
      refetchType: "active"
    });
    
    // Invalidar notas del proyecto
    queryClient.invalidateQueries({ 
      queryKey: [`/api/quick-notes/project/${projectId}`],
      refetchType: "active"
    });
    
    // Invalidar notas del dashboard (pueden incluir notas del proyecto)
    queryClient.invalidateQueries({ 
      queryKey: ["/api/quick-notes"],
      refetchType: "active"
    });
    
    // Invalidar miembros del proyecto
    queryClient.invalidateQueries({ 
      queryKey: [`/api/projects/${projectId}/members`],
      refetchType: "active"
    });
    
    // Invalidar el proyecto mismo
    queryClient.invalidateQueries({ 
      queryKey: [`/api/projects/${projectId}`],
      refetchType: "active"
    });
  };

  // Función para hacer polling inteligente
  const startPolling = () => {
    if (!enabled || !pollInterval) return;
    
    const interval = setInterval(() => {
      // Solo hacer polling si hay queries activas (usuario viendo el proyecto)
      const hasActiveQueries = queryClient.getQueryCache().findAll({
        queryKey: ["/api/tasks"],
        type: "active"
      }).length > 0 || 
      queryClient.getQueryCache().findAll({
        queryKey: [`/api/quick-notes/project/${projectId}`],
        type: "active"
      }).length > 0;

      if (hasActiveQueries) {
        invalidateProjectQueries();
      }
    }, pollInterval);

    return interval;
  };

  // Efecto para manejar el polling
  useEffect(() => {
    if (!enabled) return;

    const interval = startPolling();
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [projectId, enabled, pollInterval]);

  // Función manual para forzar actualización
  const forceSync = () => {
    invalidateProjectQueries();
  };

  // Función para invalidar después de una mutación
  const invalidateAfterMutation = (mutationType: 'task' | 'note' | 'member') => {
    // Pequeño delay para asegurar que el backend se actualice
    setTimeout(() => {
      invalidateProjectQueries();
    }, 100);
  };

  return {
    forceSync,
    invalidateAfterMutation,
    invalidateProjectQueries
  };
}

/**
 * Hook para usar en mutaciones que afectan proyectos compartidos
 */
export function useProjectMutationSync(projectId: string) {
  const { invalidateAfterMutation } = useProjectSync({ projectId, enabled: false });
  
  return {
    onTaskMutation: () => invalidateAfterMutation('task'),
    onNoteMutation: () => invalidateAfterMutation('note'),
    onMemberMutation: () => invalidateAfterMutation('member')
  };
}

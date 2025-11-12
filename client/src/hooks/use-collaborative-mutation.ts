import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjectMutationSync } from "./use-project-sync";

interface CollaborativeMutationOptions<TData, TError, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  projectId?: string;
  mutationType: 'task' | 'note' | 'member' | 'project';
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
}

/**
 * Hook que extiende useMutation para invalidar automáticamente
 * las queries relacionadas en proyectos colaborativos
 */
export function useCollaborativeMutation<TData = unknown, TError = Error, TVariables = void>({
  mutationFn,
  projectId,
  mutationType,
  onSuccess,
  onError
}: CollaborativeMutationOptions<TData, TError, TVariables>) {
  const queryClient = useQueryClient();
  const { onTaskMutation, onNoteMutation, onMemberMutation } = useProjectMutationSync(projectId || "");

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Llamar callback personalizado primero
      onSuccess?.(data, variables);
      
      // Invalidar queries relacionadas si hay projectId
      if (projectId) {
        console.log(`🔄 [COLLABORATIVE] Auto-invalidating after ${mutationType} mutation`);
        
        switch (mutationType) {
          case 'task':
            onTaskMutation();
            break;
          case 'note':
            onNoteMutation();
            break;
          case 'member':
            onMemberMutation();
            break;
          case 'project':
            // Para cambios en el proyecto, invalidar todo
            onTaskMutation();
            onNoteMutation();
            onMemberMutation();
            break;
        }
      }
    },
    onError: (error, variables) => {
      console.error(`❌ [COLLABORATIVE] ${mutationType} mutation failed:`, error);
      onError?.(error as TError, variables);
    }
  });
}

/**
 * Versión simplificada para mutaciones de tareas
 */
export function useTaskMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  projectId?: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
) {
  return useCollaborativeMutation({
    mutationFn,
    projectId,
    mutationType: 'task',
    ...options
  });
}

/**
 * Versión simplificada para mutaciones de notas
 */
export function useNoteMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  projectId?: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
) {
  return useCollaborativeMutation({
    mutationFn,
    projectId,
    mutationType: 'note',
    ...options
  });
}

/**
 * Versión simplificada para mutaciones de miembros
 */
export function useMemberMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  projectId?: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
) {
  return useCollaborativeMutation({
    mutationFn,
    projectId,
    mutationType: 'member',
    ...options
  });
}

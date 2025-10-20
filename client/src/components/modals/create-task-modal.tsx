import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTaskSchema } from "@shared/schema";
import type { Project } from "@shared/schema";

type UiStatus = "wishlist" | "todo" | "in-process" | "finished";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(25, "Title must be 25 characters or less"),
  description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  projectId: z.string().min(1, "Project is required"),
  status: z.enum(["wishlist", "todo", "in-process", "finished"]),
  assignedTo: z.string().optional(),
  focusToday: z.boolean().optional(),
});
function uiToDbStatus(s: UiStatus): "wishlist" | "todo" | "in_progress" | "done" {
  if (s === "wishlist") return "wishlist";
  if (s === "in-process") return "in_progress";
  if (s === "finished") return "done";
  return "todo";
}

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProject?: string;
  /** status inicial (UI) a preseleccionar en el modal */
  defaultStatus?: UiStatus;
}

export default function CreateTaskModal({
  open,
  onOpenChange,
  defaultProject,
  defaultStatus = "wishlist",
}: CreateTaskModalProps) {
  const { toast } = useToast();
  const { showAdminCreationNotification } = useAdminNotifications();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Obtener usuarios para asignación
  const { data: users = [] } = useQuery<Array<{ id: string; username: string; full_name: string }>>({
    queryKey: ["/api/users"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: defaultProject || "",
      status: defaultStatus, // usa el valor recibido
      assignedTo: "",
      focusToday: defaultStatus === "in-process", // Auto-check si es in-process
    },
  });

  // Obtener miembros del proyecto seleccionado
  const selectedProjectId = form.watch("projectId");
  const { data: projectMembers = [] } = useQuery<Array<{ userId: string }>>({
    queryKey: [`/api/projects/${selectedProjectId}/members`],
    enabled: !!selectedProjectId,
  });

  // Obtener el proyecto seleccionado para saber si es colaborativo
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isCollaborative = projectMembers.length > 0;
  
  // Filtrar usuarios disponibles para asignación
  const availableUsers = isCollaborative 
    ? users.filter(u => u.id === selectedProject?.userId || projectMembers.some(m => m.userId === u.id))
    : users.filter(u => u.id === selectedProject?.userId);

  // Sincroniza status y proyecto cuando cambia la columna o se abre el modal
  useEffect(() => {
    if (open) {
      if (defaultProject) form.setValue("projectId", defaultProject);
      if (defaultStatus) {
        form.setValue("status", defaultStatus);
        form.setValue("focusToday", defaultStatus === "in-process");
      }
    }
  }, [open, defaultProject, defaultStatus, form]);

  // Auto-marcar focusToday cuando el status cambia a in-process
  const currentStatus = form.watch("status");
  useEffect(() => {
    if (currentStatus === "in-process") {
      form.setValue("focusToday", true);
    }
  }, [currentStatus, form]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const payload = { 
        ...data, 
        status: uiToDbStatus(data.status as UiStatus),
        focusUserId: data.focusToday ? (data.assignedTo || undefined) : undefined,
      };
      const response = await apiRequest("POST", "/api/tasks", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      // Check if it was created by admin and show appropriate notification
      if (data._adminCreated) {
        showAdminCreationNotification(data, "Task");
      } else {
        toast({ title: "Success", description: "Task created successfully." });
      }
      form.reset({
        title: "",
        description: "",
        projectId: defaultProject || "",
        status: defaultStatus, // vuelve a la preselección de la columna
        assignedTo: "",
        focusToday: defaultStatus === "in-process",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-4" data-testid="modal-create-task">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-create-task">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter task title" 
                      {...field} 
                      maxLength={25}
                      data-testid="input-task-title" 
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500 mt-1">{field.value?.length || 0}/25 characters</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the task" 
                      rows={3} 
                      {...field} 
                      maxLength={500}
                      className="resize-none"
                      data-testid="textarea-task-description" 
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500 mt-1">{field.value?.length || 0}/500 characters</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-project">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="wishlist">Wishlist</SelectItem>
                      <SelectItem value="todo">To-Do</SelectItem>
                      <SelectItem value="in-process">In Process</SelectItem>
                      <SelectItem value="finished">Finished</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Solo mostrar Assign To si hay colaboradores */}
            {isCollaborative && (
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "__owner__" ? "" : value)} 
                      value={field.value || "__owner__"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task-assigned">
                          <SelectValue placeholder={selectedProject ? "Select assignee (default: project owner)" : "Select a project first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__owner__">Project Owner (default)</SelectItem>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} (@{user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Focus Today Checkbox */}
            <FormField
              control={form.control}
              name="focusToday"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-gradient-to-r from-orange-50 to-yellow-50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2 cursor-pointer">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Add to Today's Focus
                    </FormLabel>
                    <p className="text-xs text-gray-500">
                      {form.watch("assignedTo") 
                        ? "This task will be added to the assignee's focus for today"
                        : "This task will be added to your focus for today"}
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-task"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-blue text-white hover:bg-blue-600"
                disabled={createTaskMutation.isPending}
                data-testid="button-create-task"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

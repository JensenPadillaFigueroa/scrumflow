import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduledTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_to: string | null;
  importance: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
}

interface EditScheduledTaskModalProps {
  task: ScheduledTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditScheduledTaskModal({
  task,
  isOpen,
  onClose,
}: EditScheduledTaskModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [importance, setImportance] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch all users
  const { data: users = [] } = useQuery<Array<{ id: string; username: string; full_name: string }>>({
    queryKey: ["/api/users"],
    enabled: isOpen && !!task,
  });

  // Fetch project info to get owner
  const { data: project } = useQuery<{ id: string; userId: string }>({
    queryKey: [`/api/projects/${task?.project_id}`],
    enabled: isOpen && !!task,
  });

  // Fetch project members
  const { data: projectMembers = [] } = useQuery<Array<{ userId: string }>>({
    queryKey: [`/api/projects/${task?.project_id}/members`],
    enabled: isOpen && !!task,
  });

  // Filter users who are members of the project OR the project owner
  const members = users.filter((user) =>
    user.id === project?.userId || 
    projectMembers.some((member) => member.userId === user.id)
  );

  // Load task data when modal opens
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || "");
      // Normalize date to YYYY-MM-DD format for input[type="date"]
      const normalizedDate = task.due_date.split('T')[0];
      setDueDate(normalizedDate);
      setAssignedTo(task.assigned_to || "unassigned");
      setImportance(task.importance);
      setStatus(task.status);
    }
  }, [task, isOpen]);

  // Update scheduled task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      title: string;
      description: string;
      dueDate: string;
      assignedTo: string | null;
      importance: string;
      status: string;
    }) => {
      return await apiRequest("PUT", `/api/scheduled-tasks/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scheduled-tasks/project/${task?.project_id}`] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete scheduled task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/scheduled-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scheduled-tasks/project/${task?.project_id}`] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setShowDeleteDialog(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!task) return;

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Validation Error",
        description: "Due date is required",
        variant: "destructive",
      });
      return;
    }

    updateTaskMutation.mutate({
      id: task.id,
      title: title.trim(),
      description: description.trim(),
      dueDate,
      assignedTo: assignedTo === "unassigned" ? null : assignedTo,
      importance,
      status,
    });
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTaskMutation.mutate(task.id);
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-blue-600" />
              Edit Scheduled Task
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                maxLength={255}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description (optional)"
                rows={4}
              />
            </div>

            {/* Due Date and Importance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              {/* Importance */}
              <div className="space-y-2">
                <Label htmlFor="importance">Importance</Label>
                <Select value={importance} onValueChange={(value: any) => setImportance(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select importance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned To and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned To */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">📋 To Do</SelectItem>
                    <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                    <SelectItem value="done">✅ Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
                disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
              >
                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTaskMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTaskMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

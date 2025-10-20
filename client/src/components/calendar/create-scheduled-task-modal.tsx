import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateScheduledTaskModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
}

export default function CreateScheduledTaskModal({
  projectId,
  isOpen,
  onClose,
  selectedDate,
}: CreateScheduledTaskModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(
    selectedDate ? selectedDate.toISOString().split("T")[0] : ""
  );
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [importance, setImportance] = useState<"low" | "medium" | "high">("medium");

  // Fetch all users
  const { data: users = [] } = useQuery<Array<{ id: string; username: string; full_name: string }>>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Fetch project info to get owner
  const { data: project } = useQuery<{ id: string; userId: string }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isOpen,
  });

  // Fetch project members
  const { data: projectMembers = [] } = useQuery<Array<{ userId: string }>>({
    queryKey: [`/api/projects/${projectId}/members`],
    enabled: isOpen,
  });

  // Filter users who are members of the project OR the project owner
  const members = users.filter((user) =>
    user.id === project?.userId || 
    projectMembers.some((member) => member.userId === user.id)
  );

  // Create scheduled task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      projectId: string;
      title: string;
      description: string;
      dueDate: string;
      assignedTo: string | null;
      importance: string;
    }) => {
      return await apiRequest("POST", "/api/scheduled-tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scheduled-tasks/project/${projectId}`] });
      toast({
        title: "Success",
        description: "Task scheduled successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule task",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setDueDate(selectedDate ? selectedDate.toISOString().split("T")[0] : "");
    setAssignedTo("unassigned");
    setImportance("medium");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    createTaskMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim(),
      dueDate,
      assignedTo: assignedTo === "unassigned" ? null : assignedTo,
      importance,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-blue-600" />
            Schedule New Task
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

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={createTaskMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? "Scheduling..." : "Schedule Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";

interface CreateSharedNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

const noteColors = {
  yellow: "bg-yellow-100 border-yellow-300",
  blue: "bg-blue-100 border-blue-300",
  green: "bg-green-100 border-green-300",
  pink: "bg-pink-100 border-pink-300",
  purple: "bg-purple-100 border-purple-300"
};

const colorEmojis = {
  yellow: "🟡",
  blue: "🔵",
  green: "🟢",
  pink: "🩷",
  purple: "🟣"
};

export default function CreateSharedNoteModal({ open, onOpenChange, defaultProjectId }: CreateSharedNoteModalProps) {
  const [content, setContent] = useState("");
  const [color, setColor] = useState("yellow");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || "");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener usuario actual
  const { data: currentUser } = useQuery({
    queryKey: ["/api/session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      return data.user;
    }
  });

  // Fetch users
  const { data: users = [] } = useQuery<Array<{ id: string; username: string; full_name: string }>>({
    queryKey: ["/api/users"],
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch projects of selected user (owner + collaborator)
  const { data: userOwnedAndMemberProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/users", selectedUserId, "projects"],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const res = await fetch(`/api/users/${selectedUserId}/projects`);
      if (!res.ok) throw new Error("Failed to fetch user projects");
      return res.json();
    },
  });

  // Establecer usuario actual como default cuando se abre el modal
  useEffect(() => {
    if (open && currentUser?.id && !selectedUserId) {
      setSelectedUserId(currentUser.id);
    }
  }, [open, currentUser?.id, selectedUserId]);

  // Projects for the selected user (owner + collaborator)
  const userProjects = selectedUserId ? userOwnedAndMemberProjects : [];

  const createMutation = useMutation({
    mutationFn: async (note: any) => {
      const res = await fetch("/api/quick-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      toast({
        title: "Note created",
        description: "Your note has been created successfully.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter note content.",
        variant: "destructive",
      });
      return;
    }

    const noteData: any = {
      content: content.trim(),
      color,
      pinned: false,
      archived: false,
    };

    // Siempre asignar a un usuario (por defecto el actual)
    if (selectedUserId) {
      noteData.assignedToUserId = selectedUserId;
    }

    // Si tiene proyecto, asignarlo
    if (selectedProjectId) {
      noteData.projectId = selectedProjectId;
    }

    createMutation.mutate(noteData);
  };

  const handleClose = () => {
    setContent("");
    setColor("yellow");
    setSelectedUserId(currentUser?.id || "");
    setSelectedProjectId(defaultProjectId || "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Create Shared Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Note Content</Label>
            <Textarea
              id="content"
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {Object.entries(colorEmojis).map(([colorKey, emoji]) => (
                <button
                  key={colorKey}
                  onClick={() => setColor(colorKey)}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                    noteColors[colorKey as keyof typeof noteColors]
                  } ${
                    color === colorKey ? "ring-2 ring-blue-500 scale-110" : "opacity-60 hover:opacity-100"
                  }`}
                  title={colorKey}
                >
                  <span className="text-xl">{emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label>Assign To User</Label>
            <Select value={selectedUserId} onValueChange={(value) => {
              setSelectedUserId(value);
              setSelectedProjectId(""); // Reset project when user changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.username} (@{user.username})
                    {user.id === currentUser?.id && " (You)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Selection */}
          {selectedUserId && (
            <div className="space-y-2">
              <Label>Assign to Project (Optional)</Label>
              <Select value={selectedProjectId || "none"} onValueChange={(value) => setSelectedProjectId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Quick Notes (no project)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Quick Notes (no project)</SelectItem>
                  {userProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Note"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

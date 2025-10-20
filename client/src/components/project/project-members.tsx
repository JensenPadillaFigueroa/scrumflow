import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
  username?: string;
  fullName?: string;
  email?: string;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface ProjectMembersProps {
  projectId: string;
  isOwner?: boolean;
  showTitle?: boolean;
}

interface SessionUser {
  id: string;
  username: string;
  role: string;
}

interface Project {
  id: string;
  userId: string;
  name: string;
}

// Simplified - no role display needed

export default function ProjectMembers({ projectId, isOwner = false, showTitle = true }: ProjectMembersProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  console.log("🏗️ [ProjectMembers] Component mounted with:", { projectId, isOwner, showTitle });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener usuario actual para verificar si es admin
  const { data: sessionData } = useQuery<{ user: SessionUser | null }>({
    queryKey: ["/api/session"],
  });

  // Obtener información del proyecto para verificar ownership
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const currentUser = sessionData?.user;
  const isAdmin = currentUser?.role === "admin";
  const isProjectOwner = currentUser?.id === project?.userId;
  const canManageMembers = isProjectOwner || isAdmin;

  // Obtener miembros del proyecto
  const { data: members = [], isLoading: membersLoading, error: membersError } = useQuery<ProjectMember[]>({
    queryKey: [`/api/projects/${projectId}/members`],
    queryFn: async () => {
      console.log("🔍 [ProjectMembers] Fetching members for project:", projectId);
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) {
        console.error("❌ [ProjectMembers] Failed to fetch members:", res.status, res.statusText);
        throw new Error("Failed to fetch members");
      }
      const data = await res.json();
      console.log("👥 [ProjectMembers] Members loaded:", data);
      return data;
    }
  });

  // Obtener todos los usuarios disponibles
  const { data: allUsers = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      console.log("🔍 [ProjectMembers] Fetching users...");
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      console.log("👥 [ProjectMembers] Users loaded:", data);
      return data;
    }
    // Removido enabled: isAddMemberOpen para que siempre cargue
  });

  console.log("🔍 [ProjectMembers] State:", { 
    isAddMemberOpen, 
    membersLoading,
    membersError: membersError?.message,
    membersCount: members.length,
    usersLoading, 
    usersError: usersError?.message, 
    allUsersCount: allUsers.length 
  });

  // Mutation para agregar miembro
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
      setIsAddMemberOpen(false);
      setSelectedUserId("");
      toast({ title: "Member added successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding member", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Mutation para remover miembro
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to remove member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
      toast({ title: "Member removed successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to remove member",
        variant: "destructive"
      });
    }
  });

  const handleAddMember = () => {
    if (!selectedUserId) return;
    addMemberMutation.mutate({ userId: selectedUserId, role: "member" });
  };
  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId);
  };

  // Filtrar usuarios que ya son miembros o que son el owner del proyecto
  const availableUsers = allUsers.filter(user => 
    !members.some(member => member.userId === user.id) && 
    user.id !== project?.userId
  );

  return (
    <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
      {showTitle && (
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:text-blue-600">
              <Users className="h-4 w-4 text-blue-600 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
              Members ({members.length})
            </CardTitle>
            {canManageMembers && (
              <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-blue-50 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5">
                    <UserPlus className="h-3 w-3 transition-transform duration-300 hover:rotate-12" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Project Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select User</label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            usersLoading 
                              ? "Loading users..." 
                              : availableUsers.length === 0 
                                ? "No users available" 
                                : "Choose a user..."
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {usersLoading ? (
                            <div className="p-2 text-sm text-gray-500">Loading users...</div>
                          ) : usersError ? (
                            <div className="p-2 text-sm text-red-500">Error loading users</div>
                          ) : availableUsers.length === 0 ? (
                            <div className="p-2 text-sm text-gray-500">No users available</div>
                          ) : (
                            availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{user.username}</span>
                                  <span className="text-sm text-gray-500">({user.full_name})</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={handleAddMember} 
                        disabled={!selectedUserId || addMemberMutation.isPending}
                        className="flex-1"
                      >
                        {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={`${showTitle ? "pt-2" : "pt-4"} pb-3 px-3 max-h-64 overflow-y-auto`}>
        {membersLoading ? (
          <div className="text-center py-3 text-sm text-gray-500">Loading...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-3 text-gray-400 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <Users className="h-6 w-6 mx-auto mb-1 opacity-40 transition-all duration-300 hover:opacity-80 hover:scale-110 hover:text-blue-500" />
            <p className="text-xs transition-colors duration-300 hover:text-blue-600">No members yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {members.map((member, index) => (
                <div 
                  key={member.id} 
                  className="group flex items-center justify-between py-1.5 px-2 rounded hover:bg-blue-50/50 transition-all duration-300 hover:shadow-sm hover:border-blue-200 border border-transparent cursor-pointer animate-fade-in-up"
                  style={{animationDelay: `${0.4 + index * 0.05}s`}}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-blue-200 group-hover:scale-110 group-hover:rotate-12">
                      <User className="h-3 w-3 text-blue-600 transition-all duration-300 group-hover:text-blue-700" />
                    </div>
                    <div className="min-w-0 flex-1 transition-all duration-300 group-hover:translate-x-1">
                      <div className="text-xs font-medium text-gray-900 truncate transition-colors duration-300 group-hover:text-blue-700">{member.fullName || member.username}</div>
                      <div className="text-xs text-gray-400 transition-colors duration-300 group-hover:text-blue-600">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {canManageMembers && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.userId)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:rotate-12 flex-shrink-0"
                      title="Remove member"
                    >
                      <Trash2 className="h-3 w-3 transition-transform duration-300" />
                    </Button>
                  )}
                </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

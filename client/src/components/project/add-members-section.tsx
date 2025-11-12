import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X, Users } from "lucide-react";

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface SelectedMember {
  userId: string;
  username: string;
  fullName: string;
  role: string;
}

interface AddMembersSectionProps {
  selectedMembers: SelectedMember[];
  onMembersChange: (members: SelectedMember[]) => void;
  disabled?: boolean;
}

export default function AddMembersSection({ 
  selectedMembers, 
  onMembersChange, 
  disabled = false 
}: AddMembersSectionProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("member");

  // Obtener todos los usuarios disponibles
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    }
  });

  // Filtrar usuarios que ya están seleccionados
  const availableUsers = allUsers.filter(user => 
    !selectedMembers.some(member => member.userId === user.id)
  );

  const handleAddMember = () => {
    if (!selectedUserId) return;
    
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user) return;

    const newMember: SelectedMember = {
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: selectedRole
    };

    onMembersChange([...selectedMembers, newMember]);
    setSelectedUserId("");
    setSelectedRole("member");
  };

  const handleRemoveMember = (userId: string) => {
    onMembersChange(selectedMembers.filter(member => member.userId !== userId));
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    onMembersChange(
      selectedMembers.map(member => 
        member.userId === userId ? { ...member, role: newRole } : member
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        <label className="text-sm font-medium">Project Members (Optional)</label>
      </div>

      {/* Add Member Form */}
      <div className="flex gap-2">
        <Select 
          value={selectedUserId} 
          onValueChange={setSelectedUserId}
          disabled={disabled || availableUsers.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={
              availableUsers.length === 0 
                ? "No users available" 
                : "Select a user..."
            } />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.username}</span>
                  <span className="text-sm text-gray-500">({user.full_name})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRole} onValueChange={setSelectedRole} disabled={disabled}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddMember}
          disabled={disabled || !selectedUserId}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected Members List */}
      {selectedMembers.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Selected members ({selectedMembers.length}):
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedMembers.map((member) => (
              <div key={member.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{member.username}</span>
                  <span className="text-xs text-gray-500">({member.fullName})</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select 
                    value={member.role} 
                    onValueChange={(role) => handleRoleChange(member.userId, role)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-20 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={disabled}
                    className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CollaboratorsPreviewProps {
  projectId: string;
  className?: string;
}

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  username?: string;
  fullName?: string;
  email?: string;
}

export function CollaboratorsPreview({ projectId, className }: CollaboratorsPreviewProps) {
  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: [`/api/projects/${projectId}/members`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (members.length === 0) return null;

  const displayMembers = members.slice(0, 3);
  const remainingCount = members.length - 3;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Users className="h-3.5 w-3.5 text-gray-500" />
      <div className="flex -space-x-2">
        {displayMembers.map((member) => {
          const name = member.fullName || member.username || "User";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-white cursor-pointer hover:z-10 transition-transform hover:scale-110">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{name}</p>
                <p className="text-xs text-gray-500">{member.role}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-6 w-6 border-2 border-white cursor-pointer hover:z-10 transition-transform hover:scale-110">
                <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{remainingCount} more collaborator{remainingCount > 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

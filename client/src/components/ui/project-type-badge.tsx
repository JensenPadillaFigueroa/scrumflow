import { Badge } from "@/components/ui/badge";
import { Users, UserCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectTypeBadgeProps {
  isCollaborative: boolean;
  memberCount?: number;
  className?: string;
}

export function ProjectTypeBadge({ isCollaborative, memberCount = 0, className }: ProjectTypeBadgeProps) {
  if (isCollaborative) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex ${className}`}>
            <Badge 
              variant="outline" 
              className="text-xs font-semibold bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-300 hover:from-purple-100 hover:to-indigo-100 transition-all shadow-sm cursor-pointer h-[22px] flex items-center"
            >
              <Users className="h-3 w-3 mr-1" />
              Team Project
              {memberCount > 0 && (
                <span className="ml-1 px-1 bg-purple-200 text-purple-800 rounded-full text-[10px] font-bold leading-none flex items-center justify-center min-w-[16px] h-[16px]">
                  {memberCount}
                </span>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {memberCount > 0 
              ? `Collaborative project with ${memberCount} team member${memberCount > 1 ? 's' : ''}`
              : 'Collaborative project'}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`inline-flex ${className}`}>
          <Badge 
            variant="outline" 
            className="text-xs font-semibold bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 border-slate-300 hover:from-slate-100 hover:to-gray-100 transition-all shadow-sm cursor-pointer"
          >
            <UserCircle className="h-3.5 w-3.5 mr-1" />
            Personal
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Personal project - Only you have access</p>
      </TooltipContent>
    </Tooltip>
  );
}

import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssignedBadgeProps {
  assignedToUsername?: string;
  assignedToFullName?: string;
  className?: string;
}

export function AssignedBadge({ 
  assignedToUsername, 
  assignedToFullName,
  className = "" 
}: AssignedBadgeProps) {
  if (!assignedToUsername) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">
            <Badge 
              variant="outline" 
              className={`text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-300 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm ${className}`}
            >
              <User className="h-3 w-3 mr-1" />
              @{assignedToUsername}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Assigned to</p>
          <p>{assignedToFullName || assignedToUsername}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

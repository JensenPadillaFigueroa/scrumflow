import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Flame, Circle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProjectSync } from "@/hooks/use-project-sync";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TeamFocusProps {
  projectId: string;
}

interface TeamFocusData {
  userId: string;
  userName: string;
  username: string;
  tasks: any[];
}

export default function TeamFocus({ projectId }: TeamFocusProps) {
  // Enable project sync for real-time updates
  useProjectSync({ 
    projectId, 
    enabled: true,
    pollInterval: 5000
  });

  // Fetch team focus tasks
  const { data: teamFocus = [], isLoading } = useQuery<TeamFocusData[]>({
    queryKey: [`/api/projects/${projectId}/team-focus`],
  });

  const totalTasks = teamFocus.reduce((sum, user) => sum + user.tasks.length, 0);
  const totalUsers = teamFocus.length;

  return (
    <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 animate-fade-in-up" style={{animationDelay: '0.35s'}}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:text-blue-600">
            <Users className="h-4 w-4 text-blue-600 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
            Team Focus
          </CardTitle>
          <div className="text-xs text-gray-500 font-medium">
            {totalUsers} {totalUsers === 1 ? 'member' : 'members'} · {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2 pb-3 px-3 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-6 text-gray-500 text-xs">Loading team focus...</div>
        ) : teamFocus.length === 0 ? (
          <div className="text-center py-6 text-gray-400 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40 transition-all duration-300 hover:opacity-80 hover:scale-110 hover:text-blue-500" />
            <p className="text-xs transition-colors duration-300 hover:text-blue-600">No team members have focus tasks</p>
            <p className="text-xs text-gray-400 mt-1">Team members' focus will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamFocus.map((userFocus, userIndex) => (
              <div 
                key={userFocus.userId}
                className="animate-fade-in-up"
                style={{animationDelay: `${0.4 + userIndex * 0.1}s`}}
              >
                {/* User Header */}
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {userFocus.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">{userFocus.userName}</div>
                    <div className="text-xs text-gray-500">@{userFocus.username}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Flame className="h-3 w-3 mr-1 text-orange-500" />
                    {userFocus.tasks.length}
                  </Badge>
                </div>

                {/* User's Tasks */}
                <div className="space-y-1 ml-2 pl-4 border-l-2 border-blue-200">
                  {userFocus.tasks.map((task, taskIndex) => (
                    <div 
                      key={task.id}
                      className="group/item flex items-center gap-2 py-1.5 px-2 rounded hover:bg-blue-50/50 transition-all duration-300 hover:shadow-sm border border-transparent hover:border-blue-200 animate-fade-in-up"
                      style={{animationDelay: `${0.5 + userIndex * 0.1 + taskIndex * 0.05}s`}}
                    >
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {task.status === 'done' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400 group-hover/item:text-blue-500 transition-colors" />
                        )}
                      </div>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium transition-colors ${
                          task.status === 'done' 
                            ? 'line-through text-gray-400' 
                            : 'text-gray-700 group-hover/item:text-blue-700'
                        }`}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <Badge 
                        variant="outline" 
                        className={`text-xs flex-shrink-0 transition-all duration-300 ${
                          task.status === 'in_progress' 
                            ? 'border-blue-300 text-blue-700 bg-blue-50' 
                            : task.status === 'todo'
                            ? 'border-gray-300 text-gray-600 bg-gray-50'
                            : task.status === 'done'
                            ? 'border-green-300 text-green-700 bg-green-50'
                            : 'border-purple-300 text-purple-600 bg-purple-50'
                        }`}
                      >
                        {task.status === 'in_progress' ? 'In Progress' : 
                         task.status === 'todo' ? 'To Do' :
                         task.status === 'done' ? 'Done' : 'Wishlist'}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Separator between users */}
                {userIndex < teamFocus.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

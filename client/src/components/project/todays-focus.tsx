import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, Flame, Users } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useProjectSync } from "@/hooks/use-project-sync";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Task } from "@shared/schema";

interface TodaysFocusProps {
  projectId: string;
}

interface TeamFocusData {
  userId: string;
  userName: string;
  username: string;
  tasks: any[];
}

export default function TodaysFocus({ projectId }: TodaysFocusProps) {
  const [activeTab, setActiveTab] = useState<string>("my-focus");

  // Enable project sync for real-time updates
  useProjectSync({ 
    projectId, 
    enabled: true,
    pollInterval: 5000 // Poll every 5 seconds
  });

  // Fetch today's focus tasks (personal)
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: [`/api/projects/${projectId}/todays-focus`],
  });

  // Fetch team focus tasks
  const { data: teamFocus = [], isLoading: isLoadingTeam } = useQuery<TeamFocusData[]>({
    queryKey: [`/api/projects/${projectId}/team-focus`],
  });

  // Mutation to toggle task completion
  const toggleCompleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/todays-focus`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const totalTeamTasks = teamFocus.reduce((sum, user) => sum + user.tasks.length, 0);
  const totalTeamUsers = teamFocus.length;

  // Show skeleton loader while any query is loading
  if (isLoading || isLoadingTeam) {
    return (
      <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-up overflow-hidden" style={{animationDelay: '0.3s'}}>
        <CardHeader className="pb-2 pt-3 px-4">
          {/* Skeleton Tabs */}
          <div className="flex items-center justify-between mb-2 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <div className="h-8 w-[300px] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-md animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animationDelay: '0.2s'}} />
            </div>
            <div className="h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animationDelay: '0.3s'}} />
            </div>
          </div>
          {/* Skeleton Progress Bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden animate-fade-in-up" style={{animationDelay: '0.6s'}}>
            <div className="h-full w-1/3 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-500/30" />
          </div>
        </CardHeader>
        
        <CardContent className="pt-2 pb-3 px-3">
          {/* Skeleton Tasks */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg border border-gray-100 bg-gradient-to-r from-gray-50 to-white animate-fade-in-up transition-all duration-300 hover:shadow-md hover:border-gray-200" style={{animationDelay: `${0.6 + 0.1 * i}s`}}>
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse shadow-sm" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse relative overflow-hidden" style={{width: `${60 + i * 10}%`}}>
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animationDelay: `${0.4 + i * 0.1}s`}} />
                  </div>
                  <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse relative overflow-hidden" style={{width: `${40 + i * 5}%`}}>
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animationDelay: `${0.5 + i * 0.1}s`}} />
                  </div>
                </div>
                <div className="h-6 w-20 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animationDelay: `${0.6 + i * 0.1}s`}} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
      <CardHeader className="pb-2 pt-3 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-2">
            <TabsList className="grid w-full max-w-[300px] grid-cols-2 bg-gray-100">
              <TabsTrigger 
                value="my-focus" 
                className="text-xs transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:shadow-none"
              >
                <Flame className="h-3 w-3 mr-1 transition-all duration-300 group-hover:scale-110 data-[state=active]:animate-pulse" />
                My Focus
              </TabsTrigger>
              <TabsTrigger 
                value="team-focus" 
                className="text-xs transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:shadow-none"
              >
                <Users className="h-3 w-3 mr-1 transition-all duration-300 group-hover:scale-110" />
                Team Focus
              </TabsTrigger>
            </TabsList>
            <div className="text-xs text-gray-500 font-medium">
              {activeTab === 'my-focus' ? (
                <>{completedCount}/{totalCount}</>
              ) : (
                <>{totalTeamUsers} {totalTeamUsers === 1 ? 'member' : 'members'} · {totalTeamTasks} {totalTeamTasks === 1 ? 'task' : 'tasks'}</>
              )}
            </div>
          </div>
          
          {/* Progress Bar - Only for My Focus */}
          {activeTab === 'my-focus' && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </Tabs>
      </CardHeader>
      
      <CardContent className="pt-2 pb-3 px-3 max-h-96 overflow-y-auto">
        <Tabs value={activeTab} className="w-full">
          {/* My Focus Tab */}
          <TabsContent value="my-focus" className="mt-0">
            {isLoading ? (
              <div className="text-center py-6 text-gray-500 text-xs">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-6 text-gray-400 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                <Flame className="h-8 w-8 mx-auto mb-2 opacity-40 transition-all duration-300 hover:opacity-80 hover:scale-110 hover:text-purple-500" />
                <p className="text-xs transition-colors duration-300 hover:text-purple-600">No tasks in your focus</p>
                <p className="text-xs text-gray-400 mt-1">Move tasks to In Progress or use the 🔥 button to add them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div 
                    key={task.id}
                    className="group/item flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-purple-50/50 transition-all duration-300 hover:shadow-md border border-purple-100 hover:border-purple-300 cursor-pointer animate-fade-in-up"
                    style={{animationDelay: `${0.4 + index * 0.05}s`}}
                  >
                    {/* Checkbox */}
                    <div 
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => toggleCompleteMutation.mutate(task.id)}
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="h-5 w-5 text-purple-600 transition-all duration-300 group-hover/item:scale-110" />
                      ) : (
                        <Circle className="h-5 w-5 text-purple-300 transition-all duration-300 group-hover/item:text-purple-500 group-hover/item:scale-110" />
                      )}
                    </div>
                    
                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium transition-all duration-300 ${
                        task.status === 'done' 
                          ? 'text-gray-400 line-through' 
                          : 'text-gray-800 group-hover/item:text-purple-700'
                      }`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badge & Priority */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status Badge */}
                      <Badge 
                        variant="outline" 
                        className={`text-xs transition-all duration-300 ${
                          task.status === 'in_progress' 
                            ? 'border-purple-300 text-purple-700 bg-purple-50' 
                            : task.status === 'todo'
                            ? 'border-gray-300 text-gray-600 bg-gray-50'
                            : task.status === 'done'
                            ? 'border-green-300 text-green-700 bg-green-50'
                            : 'border-orange-300 text-orange-600 bg-orange-50'
                        }`}
                      >
                        {task.status === 'in_progress' ? 'In Progress' : 
                         task.status === 'todo' ? 'To Do' :
                         task.status === 'done' ? 'Done' : 'Wishlist'}
                      </Badge>
                      
                      {/* Priority Indicator */}
                      {task.importance === 'high' && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="High Priority" />
                        </div>
                      )}
                      {task.importance === 'medium' && (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Medium Priority" />
                      )}
                      {task.importance === 'low' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Low Priority" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
          </TabsContent>

          {/* Team Focus Tab */}
          <TabsContent value="team-focus" className="mt-0">
            {isLoadingTeam ? (
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
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {userFocus.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-800">{userFocus.userName}</div>
                        <div className="text-xs text-gray-500">@{userFocus.username}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Flame className="h-3 w-3 mr-1 text-orange-500" />
                        {userFocus.tasks.length}
                      </Badge>
                    </div>

                    {/* User's Tasks */}
                    <div className="space-y-1 ml-2 pl-3 border-l-2 border-blue-200">
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
                            <div className={`text-xs font-medium transition-colors truncate ${
                              task.status === 'done' 
                                ? 'line-through text-gray-400' 
                                : 'text-gray-700 group-hover/item:text-blue-700'
                            }`}>
                              {task.title}
                            </div>
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

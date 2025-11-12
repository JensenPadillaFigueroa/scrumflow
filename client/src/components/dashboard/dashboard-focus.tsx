import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Users, CheckCircle, Folder } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import type { Task } from "@shared/schema";
import CompletionNotesModal from "@/components/kanban/completion-notes-modal";

interface TeamFocusProject {
  projectId: string;
  projectName: string;
  users: {
    userId: string;
    username: string;
    fullName: string;
    tasks: Task[];
  }[];
}

export default function DashboardFocus() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"my-focus" | "team-focus">("my-focus");
  const [confirmTask, setConfirmTask] = useState<{ id: string; title: string; status: string } | null>(null);
  const [completionNotesTask, setCompletionNotesTask] = useState<Task | null>(null);

  // Fetch My Focus tasks (all projects)
  const { data: myFocusTasks = [], isLoading: isLoadingMyFocus } = useQuery<Task[]>({
    queryKey: ["/api/dashboard/my-focus"],
  });

  // Fetch Team Focus tasks (all collaborative projects)
  const { data: teamFocus = [], isLoading: isLoadingTeam } = useQuery<TeamFocusProject[]>({
    queryKey: ["/api/dashboard/team-focus"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await apiRequest("PUT", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/my-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task updated successfully." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  const handleToggleTask = (taskId: string, currentStatus: string, taskTitle: string) => {
    // If marking as done, show confirmation
    if (currentStatus !== "done") {
      setConfirmTask({ id: taskId, title: taskTitle, status: currentStatus });
    } else {
      // If unmarking (done -> in_progress), do it directly
      updateTaskMutation.mutate({ taskId, status: "in_progress" });
    }
  };

  const handleConfirmComplete = () => {
    if (confirmTask) {
      // Find the full task object
      const task = myFocusTasks.find(t => t.id === confirmTask.id);
      if (task) {
        setCompletionNotesTask(task);
      }
      setConfirmTask(null);
    }
  };

  const handleSaveCompletionNotes = async (notes: string) => {
    if (completionNotesTask) {
      try {
        await apiRequest("PUT", `/api/tasks/${completionNotesTask.id}`, { 
          status: "done",
          completionNotes: notes 
        });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/my-focus"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-focus"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Success", description: "Task completed successfully." });
        setCompletionNotesTask(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to complete task.",
          variant: "destructive",
        });
      }
    }
  };

  // Group My Focus tasks by project
  const myFocusByProject = useMemo(() => {
    const grouped: Record<string, { projectId: string; projectName: string; tasks: Task[] }> = {};
    
    myFocusTasks.forEach((task) => {
      const projectId = task.projectId || 'no-project';
      const projectName = (task as any).project_name || 'No Project';
      
      if (!grouped[projectId]) {
        grouped[projectId] = {
          projectId,
          projectName,
          tasks: []
        };
      }
      
      grouped[projectId].tasks.push(task);
    });
    
    return Object.values(grouped).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [myFocusTasks]);

  const completedCount = myFocusTasks.filter(t => t.status === 'done').length;
  const totalCount = myFocusTasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const totalTeamTasks = teamFocus.reduce((sum, project) => 
    sum + project.users.reduce((userSum, user) => userSum + user.tasks.length, 0), 0
  );
  const totalTeamProjects = teamFocus.length;

  // Show skeleton loader while loading
  if (isLoadingMyFocus || isLoadingTeam) {
    return (
      <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-up overflow-hidden" style={{animationDelay: '0.7s'}}>
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
    <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-up" style={{animationDelay: '0.7s'}}>
      <CardHeader className="pb-3 pt-4 px-4">
        {/* Title */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 transition-all duration-300 group-hover:text-purple-600">
            <Flame className="h-5 w-5 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <span className="transition-all duration-300 group-hover:translate-x-1">Today's Focus</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1 transition-all duration-300 group-hover:text-gray-600 group-hover:translate-x-1">
            Your focus tasks across all projects
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "my-focus" | "team-focus")} className="w-full">
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
                <>{totalTeamProjects} {totalTeamProjects === 1 ? 'project' : 'projects'} · {totalTeamTasks} {totalTeamTasks === 1 ? 'task' : 'tasks'}</>
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

          <TabsContent value="my-focus" className="mt-3">
            {myFocusByProject.length === 0 ? (
              <div className="text-center py-8">
                <Flame className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No tasks in focus today</p>
                <p className="text-xs text-gray-400 mt-1">Mark tasks as "In Process" to add them to your focus</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {myFocusByProject.map((project) => (
                  <div key={project.projectId} className="space-y-2">
                    {/* Project Header */}
                    <div className="flex items-center gap-2 sticky top-0 bg-white py-2 z-10 border-b border-gray-200 group/header">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md transition-all duration-300 group-hover/header:scale-110 group-hover/header:shadow-lg group-hover/header:rotate-3">
                        <Folder className="h-4 w-4 text-white transition-all duration-300 group-hover/header:scale-110" />
                      </div>
                      <span className="text-sm font-bold text-gray-800 transition-all duration-300 group-hover/header:text-blue-600 group-hover/header:translate-x-1">{project.projectName}</span>
                      <Badge variant="secondary" className="text-xs ml-auto transition-all duration-300 group-hover/header:scale-110 group-hover/header:-translate-y-0.5">
                        {project.tasks.length} {project.tasks.length === 1 ? 'task' : 'tasks'}
                      </Badge>
                    </div>
                    
                    {/* Project Tasks */}
                    <div className="space-y-2 ml-2">
                      {project.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 py-2 px-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group/task cursor-pointer"
                          onClick={() => setLocation(`/projects/${project.projectId}`)}
                        >
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={task.status === 'done'}
                              onCheckedChange={() => handleToggleTask(task.id, task.status, task.title)}
                              className="transition-all duration-200 group-hover/task:scale-110"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate transition-all duration-200 group-hover/task:translate-x-1 ${
                              task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 group-hover/task:text-blue-700'
                            }`}>
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate group-hover/task:text-gray-600">{task.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team-focus" className="mt-3">
            {teamFocus.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No team members with focus tasks</p>
                <p className="text-xs text-gray-400 mt-1">Collaborate on projects to see team focus</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {teamFocus.map((project) => (
                  <div key={project.projectId} className="space-y-2">
                    {/* Project Header */}
                    <div className="flex items-center gap-2 sticky top-0 bg-white py-2 z-10 border-b border-gray-200 group/header">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md transition-all duration-300 group-hover/header:scale-110 group-hover/header:shadow-lg group-hover/header:rotate-3">
                        <Folder className="h-4 w-4 text-white transition-all duration-300 group-hover/header:scale-110" />
                      </div>
                      <span className="text-sm font-bold text-gray-800 transition-all duration-300 group-hover/header:text-purple-600 group-hover/header:translate-x-1">{project.projectName}</span>
                      <Badge variant="secondary" className="text-xs ml-auto transition-all duration-300 group-hover/header:scale-110 group-hover/header:-translate-y-0.5">
                        {project.users.reduce((sum, u) => sum + u.tasks.length, 0)} {project.users.reduce((sum, u) => sum + u.tasks.length, 0) === 1 ? 'task' : 'tasks'}
                      </Badge>
                    </div>
                    
                    {/* Project Tasks (all users combined) */}
                    <div className="space-y-2 ml-2">
                      {project.users.map((user) => 
                        user.tasks.map((task: Task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 py-2 px-3 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group/task"
                            onClick={() => setLocation(`/projects/${project.projectId}`)}
                          >
                            {task.status === 'done' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 transition-all duration-200 group-hover/task:scale-110" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-purple-300 shrink-0 transition-all duration-200 group-hover/task:scale-110 group-hover/task:border-purple-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate transition-all duration-200 group-hover/task:translate-x-1 ${
                                task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 group-hover/task:text-purple-700'
                              }`}>
                                {task.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate group-hover/task:text-gray-600">
                                {task.description} • <span className="font-medium text-purple-600">{user.fullName}</span>
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardHeader>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmTask} onOpenChange={() => setConfirmTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Complete Task?</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Mark this task as completed
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4 px-1">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-green-700 mb-2">Task:</p>
              <p className="text-sm font-medium text-gray-900 break-words">
                {confirmTask?.title}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmTask(null)}
              className="transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmComplete} 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Notes Modal */}
      <CompletionNotesModal
        isOpen={!!completionNotesTask}
        onClose={() => setCompletionNotesTask(null)}
        onSave={handleSaveCompletionNotes}
        task={completionNotesTask}
      />
    </Card>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Clock, User, AlertCircle, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import CreateScheduledTaskModal from "./create-scheduled-task-modal";
import EditScheduledTaskModal from "./edit-scheduled-task-modal";

interface ScheduledTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_to: string | null;
  assigned_to_username: string | null;
  assigned_to_full_name: string | null;
  importance: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  created_by: string;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

interface TaskCalendarProps {
  projectId: string;
}

export default function TaskCalendar({ projectId }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);

  // Fetch scheduled tasks for the project
  const { data: scheduledTasks = [], isLoading } = useQuery<ScheduledTask[]>({
    queryKey: [`/api/scheduled-tasks/project/${projectId}`],
  });

  // Debug: Log scheduled tasks
  console.log("📅 [TaskCalendar] Scheduled tasks:", scheduledTasks);

  const openTaskModal = (task: ScheduledTask) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const openDayModal = (date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  };

  // Helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "bg-red-100 text-red-700 border-red-300";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const filtered = scheduledTasks.filter((task: ScheduledTask) => {
      // Normalize both dates to YYYY-MM-DD format
      const taskDate = task.due_date.split('T')[0];
      return taskDate === dateStr;
    });
    return filtered;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Render calendar view
  const renderCalendarView = () => {
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const tasksForDay = getTasksForDate(date);
      const isSelectedDate = selectedDate?.toDateString() === date.toDateString();
      const isTodayDate = isToday(date);
      const isPastDate = isPast(date);
      
      days.push(
        <div
          key={day}
          onClick={() => {
            if (tasksForDay.length > 0) {
              openDayModal(date);
            }
          }}
          className={cn(
            "h-24 border border-gray-200 p-2 transition-all duration-200 relative overflow-hidden",
            tasksForDay.length > 0 && "cursor-pointer hover:bg-blue-50 hover:shadow-md",
            tasksForDay.length === 0 && "cursor-default",
            isSelectedDate && "ring-2 ring-blue-500 bg-blue-50",
            isTodayDate && "bg-blue-100/30 border-blue-400",
            isPastDate && "bg-gray-50/50 opacity-70"
          )}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={cn(
              "text-sm font-semibold",
              isTodayDate && "text-blue-600",
              isPastDate && "text-gray-400"
            )}>
              {day}
            </span>
            {tasksForDay.length > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-purple-100 text-purple-700">
                {tasksForDay.length}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            {tasksForDay.slice(0, 2).map((task) => (
              <div
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  openTaskModal(task);
                }}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded truncate border cursor-pointer hover:scale-105 transition-transform",
                  getImportanceColor(task.importance)
                )}
                title="Click to view details"
              >
                {getImportanceIcon(task.importance)} {task.title}
              </div>
            ))}
            {tasksForDay.length > 2 && (
              <div className="text-[10px] text-gray-500 px-1">
                +{tasksForDay.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  // Render list view
  const renderListView = () => {
    const sortedTasks = [...scheduledTasks].sort((a: ScheduledTask, b: ScheduledTask) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    // Group tasks by date
    const tasksByDate = sortedTasks.reduce((acc, task) => {
      const dateKey = task.due_date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {} as Record<string, ScheduledTask[]>);

    return (
      <div className="space-y-6 max-h-[600px] overflow-y-auto">
        {Object.entries(tasksByDate).map(([dateKey, tasks]) => {
          const date = new Date(dateKey);
          const isOverdueDate = isPast(date);
          const daysUntil = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div key={dateKey} className="space-y-3">
              {/* Date Header/Divider */}
              <div className={cn(
                "sticky top-0 z-10 flex items-center gap-3 py-2 px-3 rounded-lg border-l-4",
                isOverdueDate ? "bg-red-50 border-red-500" : "bg-blue-50 border-blue-500"
              )}>
                <Calendar className={cn(
                  "h-5 w-5",
                  isOverdueDate ? "text-red-600" : "text-blue-600"
                )} />
                <div className="flex-1">
                  <h3 className={cn(
                    "font-semibold text-sm",
                    isOverdueDate ? "text-red-900" : "text-blue-900"
                  )}>
                    {date.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </h3>
                  <p className={cn(
                    "text-xs",
                    isOverdueDate ? "text-red-600 font-semibold" : "text-blue-600"
                  )}>
                    {isOverdueDate ? (
                      "⚠️ Overdue"
                    ) : daysUntil === 0 ? (
                      "📅 Today"
                    ) : daysUntil === 1 ? (
                      "📅 Tomorrow"
                    ) : (
                      `📅 ${daysUntil} days away`
                    )}
                  </p>
                </div>
                <Badge variant="secondary" className={cn(
                  "text-xs",
                  isOverdueDate ? "bg-red-200 text-red-800" : "bg-blue-200 text-blue-800"
                )}>
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </Badge>
              </div>

              {/* Tasks for this date */}
              <div className="space-y-2 pl-4">
                {tasks.map((task) => {
                  const isOverdue = isPast(date);
                  
                  return (
                    <Card 
                      key={task.id} 
                      onClick={() => openTaskModal(task)}
                      className={cn(
                        "transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
                        isOverdue && "border-red-300 bg-red-50/30"
                      )}
                    >
                      <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm">{task.title}</h4>
                      <Badge variant="outline" className={cn("text-xs", getImportanceColor(task.importance))}>
                        {getImportanceIcon(task.importance)} {task.importance}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">{task.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{task.assigned_to_full_name || task.assigned_to_username || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isOverdue && (
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Task Schedule
            <Badge variant="secondary" className="ml-2">
              {scheduledTasks.length} tasks
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="h-7 px-3 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Calendar
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-7 px-3 text-xs"
              >
                List
              </Button>
            </div>
            
            <Button 
              size="sm" 
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setCreateModalDate(null);
                setIsCreateModalOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Schedule Task
            </Button>
          </div>
        </div>
        
        {viewMode === "calendar" && (
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="text-lg font-semibold">
              {monthNames[month]} {year}
            </h3>
            
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {viewMode === "calendar" ? (
          <>
            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarView()}
            </div>
          </>
        ) : (
          renderListView()
        )}
      </CardContent>
    </Card>

    {/* Task Detail Modal */}
    <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-blue-600" />
            Task Details
          </DialogTitle>
        </DialogHeader>
        
        {selectedTask && (
          <div className="space-y-6">
            {/* Title and Importance */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h3>
                <Badge variant="outline" className={cn("text-sm px-3 py-1", getImportanceColor(selectedTask.importance))}>
                  {getImportanceIcon(selectedTask.importance)} {selectedTask.importance.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {selectedTask.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Due Date
                </label>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-blue-900 font-semibold">
                    {new Date(selectedTask.due_date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  {(() => {
                    const dueDate = new Date(selectedTask.due_date);
                    const isOverdue = isPast(dueDate);
                    const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (isOverdue) {
                      return <p className="text-xs text-red-600 font-semibold mt-1">⚠️ Overdue</p>;
                    } else if (daysUntil === 0) {
                      return <p className="text-xs text-amber-600 font-semibold mt-1">📅 Due Today</p>;
                    } else if (daysUntil === 1) {
                      return <p className="text-xs text-amber-600 mt-1">📅 Due Tomorrow</p>;
                    } else {
                      return <p className="text-xs text-gray-600 mt-1">📅 {daysUntil} days remaining</p>;
                    }
                  })()}
                </div>
              </div>

              {/* Assigned To */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned To
                </label>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-purple-900">{selectedTask.assigned_to_full_name || selectedTask.assigned_to_username || 'Unassigned'}</p>
                      <p className="text-xs text-purple-600">@{selectedTask.assigned_to_username || 'unassigned'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Status</label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  "text-sm px-3 py-1",
                  selectedTask.status === "done" && "bg-emerald-100 text-emerald-700 border-emerald-300",
                  selectedTask.status === "in_progress" && "bg-amber-100 text-amber-700 border-amber-300",
                  selectedTask.status === "todo" && "bg-slate-100 text-slate-700 border-slate-300"
                )}>
                  {selectedTask.status === "done" && "✅ Done"}
                  {selectedTask.status === "in_progress" && "🔄 In Progress"}
                  {selectedTask.status === "todo" && "📋 To Do"}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setIsTaskModalOpen(false)}>
                Close
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setIsTaskModalOpen(false);
                  setIsEditModalOpen(true);
                }}
              >
                Edit Task
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Day Tasks Modal - Shows all tasks for selected date */}
    <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-blue-600" />
            {selectedDate && (
              <span>
                Tasks for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {selectedDate && (
          <div className="space-y-4">
            {/* Task count badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {getTasksForDate(selectedDate).length} {getTasksForDate(selectedDate).length === 1 ? 'task' : 'tasks'} scheduled
              </Badge>
            </div>

            {/* Tasks list */}
            {getTasksForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No tasks scheduled for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getTasksForDate(selectedDate).map((task) => {
                  const dueDate = new Date(task.due_date);
                  const isOverdue = isPast(dueDate);
                  
                  return (
                    <Card 
                      key={task.id}
                      onClick={() => {
                        setIsDayModalOpen(false);
                        openTaskModal(task);
                      }}
                      className={cn(
                        "transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
                        isOverdue && "border-red-300 bg-red-50/30"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            {/* Title and Importance */}
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-base">{task.title}</h4>
                              <Badge variant="outline" className={cn("text-xs", getImportanceColor(task.importance))}>
                                {getImportanceIcon(task.importance)} {task.importance}
                              </Badge>
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                            
                            {/* Meta info */}
                            <div className="flex items-center gap-4 text-xs">
                              {/* Assigned to */}
                              <div className="flex items-center gap-1 text-gray-600">
                                <User className="h-3 w-3" />
                                <span>{task.assigned_to_full_name || task.assigned_to_username || 'Unassigned'}</span>
                              </div>
                              
                              {/* Status */}
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                task.status === "done" && "bg-emerald-100 text-emerald-700 border-emerald-300",
                                task.status === "in_progress" && "bg-amber-100 text-amber-700 border-amber-300",
                                task.status === "todo" && "bg-slate-100 text-slate-700 border-slate-300"
                              )}>
                                {task.status === "done" && "✅ Done"}
                                {task.status === "in_progress" && "🔄 In Progress"}
                                {task.status === "todo" && "📋 To Do"}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Overdue indicator */}
                          {isOverdue && (
                            <div className="flex flex-col items-center gap-1">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <span className="text-xs text-red-600 font-semibold">Overdue</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setIsDayModalOpen(false)}>
                Close
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setCreateModalDate(selectedDate);
                  setIsDayModalOpen(false);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule New Task
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Create Scheduled Task Modal */}
    <CreateScheduledTaskModal
      projectId={projectId}
      isOpen={isCreateModalOpen}
      onClose={() => setIsCreateModalOpen(false)}
      selectedDate={createModalDate}
    />

    {/* Edit Scheduled Task Modal */}
    <EditScheduledTaskModal
      task={selectedTask}
      isOpen={isEditModalOpen}
      onClose={() => {
        setIsEditModalOpen(false);
        setSelectedTask(null);
      }}
    />
    </>
  );
}

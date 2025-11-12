import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, AlertCircle, Clock, CheckCircle2, Calendar, Filter, Search, MoreVertical, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import type { Reminder, InsertReminder } from "@shared/schema";

const priorityColors = {
  urgent: "bg-red-500 text-white",
  high: "bg-orange-500 text-white", 
  medium: "bg-yellow-500 text-white",
  low: "bg-green-500 text-white"
};

const priorityIcons = {
  urgent: AlertCircle,
  high: AlertCircle,
  medium: Clock,
  low: CheckCircle2
};

export default function ReminderList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [newReminder, setNewReminder] = useState<Partial<InsertReminder>>({
    title: "",
    description: "",
    priority: "medium",
    dueDate: null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
    queryFn: async () => {
      const res = await fetch("/api/reminders");
      if (!res.ok) throw new Error("Failed to fetch reminders");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (reminder: InsertReminder) => {
      console.log("🚀 Frontend - Enviando al servidor:", reminder);
      console.log("🚀 Frontend - JSON que se envía:", JSON.stringify(reminder));
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminder)
      });
      if (!res.ok) throw new Error("Failed to create reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setIsCreateOpen(false);
      setNewReminder({ title: "", description: "", priority: "medium", dueDate: null });
      toast({ title: "Reminder created successfully" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertReminder> }) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete reminder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder deleted" });
    }
  });

  const handleCreate = () => {
    if (!newReminder.title?.trim()) return;
    console.log("🔍 Frontend - Datos del recordatorio antes de enviar:", newReminder);
    console.log("🔍 Frontend - Tipo de dueDate:", typeof newReminder.dueDate);
    console.log("🔍 Frontend - Valor de dueDate:", newReminder.dueDate);
    createMutation.mutate(newReminder as InsertReminder);
  };

  const toggleComplete = (reminder: Reminder) => {
    updateMutation.mutate({
      id: reminder.id,
      updates: { completed: !reminder.completed }
    });
  };

  const deleteReminder = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Filtros y búsqueda
  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (reminder.description && reminder.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPriority = filterPriority === "all" || reminder.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const pendingReminders = filteredReminders.filter(r => !r.completed);
  const completedReminders = filteredReminders.filter(r => r.completed);

  // Estadísticas
  const totalReminders = reminders.length;
  const completedCount = reminders.filter(r => r.completed).length;
  const urgentCount = reminders.filter(r => r.priority === "urgent" && !r.completed).length;
  const completionRate = totalReminders > 0 ? (completedCount / totalReminders) * 100 : 0;

  const formatDate = (date: string | Date | null) => {
    if (!date) return null;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
  };

  const isOverdue = (dueDate: string | Date | null) => {
    if (!dueDate) return false;
    const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return dateObj < new Date();
  };

  return (
    <Card className="h-full min-h-[550px] group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
      <CardHeader className="pb-3 pt-4 px-4">
        {/* Title */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 transition-all duration-300 group-hover:text-purple-600">
              <AlertCircle className="h-5 w-5 text-purple-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="transition-all duration-300 group-hover:translate-x-1">Reminders</span>
            </h3>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all duration-300 hover:scale-105">
                  <Plus className="h-4 w-4 mr-1.5 transition-transform duration-300 group-hover:rotate-90" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>✨ Create Reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="What do you need to remember?"
                  value={newReminder.title || ""}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                  className="text-base"
                />
                <Textarea
                  placeholder="Additional details (optional)"
                  value={newReminder.description || ""}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Priority</label>
                    <Select
                      value={newReminder.priority || "medium"}
                      onValueChange={(value) => setNewReminder(prev => ({ ...prev, priority: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        <SelectItem value="high">🟠 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Due Date</label>
                    <Input
                      type="date"
                      value={newReminder.dueDate ? (typeof newReminder.dueDate === 'string' ? newReminder.dueDate : new Date(newReminder.dueDate).toISOString().split('T')[0]) : ""}
                      onChange={(e) => {
                        console.log("📅 Frontend - Input date onChange:", e.target.value);
                        console.log("📅 Frontend - Tipo del valor:", typeof e.target.value);
                        setNewReminder(prev => ({ 
                          ...prev, 
                          dueDate: e.target.value || null
                        }));
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreate} disabled={!newReminder.title?.trim()} className="flex-1">
                    Create Reminder
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
          <p className="text-sm text-gray-500 mt-1 transition-all duration-300 group-hover:text-gray-600 group-hover:translate-x-1">
            Keep track of important tasks
          </p>
        </div>

        {/* Controles de búsqueda y filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">🔴 Urgent</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="low">🟢 Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingReminders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedReminders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {isLoading ? (
                <div className="text-center text-gray-500 py-4">Loading...</div>
              ) : pendingReminders.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-sm">No pending reminders</p>
                  <p className="text-xs text-gray-400">Great job! 🎉</p>
                </div>
              ) : (
                pendingReminders.map((reminder) => {
                  const PriorityIcon = priorityIcons[reminder.priority as keyof typeof priorityIcons];
                  const dueDate = formatDate(reminder.dueDate);
                  const overdue = isOverdue(reminder.dueDate);
                  
                  return (
                    <div
                      key={reminder.id}
                      className={`p-2.5 border rounded-lg hover:shadow-md transition-all ${
                        overdue ? 'border-red-200 bg-red-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={reminder.completed}
                          onCheckedChange={() => toggleComplete(reminder)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <PriorityIcon className="h-4 w-4 text-gray-600" />
                            <h4 className="font-semibold text-base text-gray-900 truncate">{reminder.title}</h4>
                            <Badge 
                              className={`text-xs px-1.5 py-0.5 ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}
                            >
                              {reminder.priority.toUpperCase()}
                            </Badge>
                            {overdue && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                OVERDUE
                              </Badge>
                            )}
                            <AdminCreatedBadge 
                              createdByAdminUsername={(reminder as any).created_by_admin_username}
                              className="ml-auto"
                            />
                          </div>
                          {reminder.description && (
                            <p className="text-sm text-gray-600 mb-1 line-clamp-1">{reminder.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {dueDate && (
                              <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                <Calendar className="h-3.5 w-3.5" />
                                {dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReminder(reminder.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {completedReminders.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-sm">No completed reminders</p>
                  <p className="text-xs text-gray-400">Complete some to see them here</p>
                </div>
              ) : (
                completedReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="p-2.5 border rounded-lg bg-gray-50 opacity-75"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={true} 
                        onCheckedChange={() => toggleComplete(reminder)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-base text-gray-700 line-through truncate">{reminder.title}</h4>
                          <AdminCreatedBadge 
                            createdByAdminUsername={(reminder as any).created_by_admin_username}
                            className="ml-auto"
                          />
                        </div>
                        {reminder.description && (
                          <p className="text-sm text-gray-500 line-through mt-1 line-clamp-1">{reminder.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReminder(reminder.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

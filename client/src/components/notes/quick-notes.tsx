import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pin, PinOff, Edit3, StickyNote, Archive, ArchiveRestore } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import { NoteCollaboratorBadge, DashboardCreatorBadge } from "@/components/ui/collaborator-badge";
import type { QuickNote, InsertQuickNote, Project } from "@shared/schema";

const noteColors = {
  yellow: "bg-yellow-50 border-yellow-200 text-gray-800",
  blue: "bg-blue-50 border-blue-200 text-gray-800",
  green: "bg-green-50 border-green-200 text-gray-800",
  pink: "bg-pink-50 border-pink-200 text-gray-800",
  purple: "bg-purple-50 border-purple-200 text-gray-800"
};

const colorEmojis = {
  yellow: "🟡",
  blue: "🔵", 
  green: "🟢",
  pink: "🩷",
  purple: "🟣"
};

export default function QuickNotes() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [newNote, setNewNote] = useState<Partial<InsertQuickNote>>({
    content: "",
    projectId: null,
    color: "yellow",
    pinned: false
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener usuario actual para el badge de colaborador
  const { data: currentUser } = useQuery({
    queryKey: ["/api/session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      return data.user;
    }
  });

  // Fetch projects for selection
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    }
  });

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery<QuickNote[]>({
    queryKey: ["/api/quick-notes"],
    queryFn: async () => {
      const res = await fetch("/api/quick-notes");
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    }
  });

  // Crear un mapa de projectId -> projectOwnerId para las notas
  const projectOwnerMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(project => {
      map[project.id] = project.userId;
    });
    return map;
  }, [projects]);

  // Fetch archived notes
  const { data: archivedNotes = [], isLoading: archivedLoading } = useQuery<QuickNote[]>({
    queryKey: ["/api/quick-notes/archived"],
    queryFn: async () => {
      const res = await fetch("/api/quick-notes/archived");
      if (!res.ok) throw new Error("Failed to fetch archived notes");
      return res.json();
    },
    enabled: isArchivedOpen // Solo cargar cuando se abre el modal
  });

  const createMutation = useMutation({
    mutationFn: async (note: InsertQuickNote) => {
      const res = await fetch("/api/quick-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note)
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      setIsCreateOpen(false);
      setNewNote({ content: "", projectId: null, color: "yellow", pinned: false });
      toast({ title: "Note created successfully" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertQuickNote> }) => {
      const res = await fetch(`/api/quick-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes/archived"] });
      setEditingNote(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quick-notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes/archived"] });
      toast({ title: "Note deleted" });
    }
  });

  const handleCreate = () => {
    if (!newNote.content?.trim()) return;
    createMutation.mutate(newNote as InsertQuickNote);
  };

  const togglePin = (note: QuickNote) => {
    updateMutation.mutate({
      id: note.id,
      updates: { pinned: !note.pinned }
    });
  };

  const deleteNote = (id: string) => {
    deleteMutation.mutate(id);
  };

  const updateNoteContent = (note: QuickNote, content: string) => {
    updateMutation.mutate({
      id: note.id,
      updates: { content }
    });
  };

  const changeNoteColor = (note: QuickNote, color: string) => {
    updateMutation.mutate({
      id: note.id,
      updates: { color }
    });
  };

  const archiveNote = (note: QuickNote) => {
    updateMutation.mutate({
      id: note.id,
      updates: { archived: true }
    });
    toast({ 
      title: "Note archived", 
      description: "The note has been moved to archive" 
    });
  };

  const unarchiveNote = (note: QuickNote) => {
    updateMutation.mutate({
      id: note.id,
      updates: { archived: false }
    });
    toast({ 
      title: "Note restored", 
      description: "The note has been restored to your dashboard" 
    });
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown project";
  };

  const pinnedNotes = notes.filter(note => Boolean(note.pinned));
  const unpinnedNotes = notes.filter(note => !Boolean(note.pinned));

  return (
    <Card className="h-full min-h-[450px] flex flex-col group transition-all duration-300 hover:shadow-2xl hover:shadow-gray-300/30 hover:-translate-y-1 animate-fade-in-up overflow-hidden relative" style={{animationDelay: '0.4s', borderColor: '#e5e7eb'}}>
      {/* Notebook Lines Background - Full Card */}
      <div className="absolute inset-0 pointer-events-none" style={{background: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px), linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'}} />
      
      {/* Notebook Binding */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-700 to-gray-600 shadow-lg z-10">
        <div className="flex flex-col items-center justify-around h-full py-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-gray-900/20 shadow-inner" />
          ))}
        </div>
      </div>
      
      <CardHeader className="pb-4 pl-12 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2 transition-all duration-300 group-hover:text-purple-600 font-handwriting text-gray-800">
            <StickyNote className="h-5 w-5 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 text-gray-600" />
            <span className="transition-all duration-300 group-hover:translate-x-1">Quick Notes</span>
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsArchivedOpen(true)}
              className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all duration-300 hover:scale-105 flex-1 sm:flex-none"
            >
              <Archive className="h-4 w-4 sm:mr-1.5 transition-transform duration-300 hover:rotate-12" />
              <span className="hidden xs:inline sm:inline">Archived</span>
              <span className="ml-1 text-xs">({archivedNotes.length})</span>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all duration-300 hover:scale-105 flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 sm:mr-1.5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="hidden xs:inline sm:inline">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>✨ Create Quick Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Write your note here..."
                    value={newNote.content || ""}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Project</label>
                      <Select
                        value={newNote.projectId || "none"}
                        onValueChange={(value) => setNewNote(prev => ({ 
                          ...prev, 
                          projectId: value === "none" ? null : value 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Color</label>
                      <Select
                        value={newNote.color || "yellow"}
                        onValueChange={(value) => setNewNote(prev => ({ ...prev, color: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yellow">{colorEmojis.yellow} Yellow</SelectItem>
                          <SelectItem value="blue">{colorEmojis.blue} Blue</SelectItem>
                          <SelectItem value="green">{colorEmojis.green} Green</SelectItem>
                          <SelectItem value="pink">{colorEmojis.pink} Pink</SelectItem>
                          <SelectItem value="purple">{colorEmojis.purple} Purple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleCreate} disabled={!newNote.content?.trim()} className="flex-1">
                      Create Note
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="overflow-y-auto px-2 pl-12 pb-4 relative z-10 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400" style={{maxHeight: 'calc(100vh - 400px)', minHeight: '320px'}}>
        <div className="grid grid-cols-1 gap-3 py-2">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading notes...</div>
          ) : (
            <>
              {/* Notas fijadas */}
              {pinnedNotes.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1 mb-2">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </h4>
                  {pinnedNotes.map((note, index) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      index={index}
                      projectName={getProjectName(note.projectId)}
                      onTogglePin={() => togglePin(note)}
                      onDelete={() => deleteNote(note.id)}
                      onArchive={() => archiveNote(note)}
                      onUpdateContent={(content) => updateNoteContent(note, content)}
                      onChangeColor={(color) => changeNoteColor(note, color)}
                      isEditing={editingNote?.id === note.id}
                      setEditing={setEditingNote}
                      currentUsername={currentUser?.username}
                      currentUserId={currentUser?.id}
                      projectOwnerId={note.projectId ? projectOwnerMap[note.projectId] : undefined}
                    />
                  ))}
                </>
              )}

              {/* Notas normales */}
              {unpinnedNotes.length > 0 && (
                <>
                  {pinnedNotes.length > 0 && (
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 mt-2">Other notes</h4>
                  )}
                  {unpinnedNotes.map((note, index) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      index={pinnedNotes.length + index}
                      projectName={getProjectName(note.projectId)}
                      onTogglePin={() => togglePin(note)}
                      onDelete={() => deleteNote(note.id)}
                      onArchive={() => archiveNote(note)}
                      onUpdateContent={(content) => updateNoteContent(note, content)}
                      onChangeColor={(color) => changeNoteColor(note, color)}
                      isEditing={editingNote?.id === note.id}
                      setEditing={setEditingNote}
                      currentUsername={currentUser?.username}
                      currentUserId={currentUser?.id}
                      projectOwnerId={note.projectId ? projectOwnerMap[note.projectId] : undefined}
                    />
                  ))}
                </>
              )}

              {notes.length === 0 && (
                <div className="text-center text-gray-500 py-8 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                  <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-40 transition-all duration-300 hover:opacity-80 hover:scale-110 hover:text-gray-600" />
                  <p className="font-medium text-sm transition-colors duration-300 hover:text-gray-700">No sticky notes yet</p>
                  <p className="text-xs text-gray-500 mt-1">Click "New Note" to create your first one</p>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Modal de Notas Archivadas */}
      <Dialog open={isArchivedOpen} onOpenChange={setIsArchivedOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Notes
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] space-y-3">
            {archivedLoading ? (
              <div className="text-center py-8 text-gray-500">Loading archived notes...</div>
            ) : archivedNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No archived notes</p>
                <p className="text-sm text-gray-400">Archived notes will appear here</p>
              </div>
            ) : (
              archivedNotes.map((note) => (
                <ArchivedNoteCard
                  key={note.id}
                  note={note}
                  onRestore={() => unarchiveNote(note)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Componente separado para cada nota
function NoteCard({ 
  note,
  index,
  projectName, 
  onTogglePin, 
  onDelete, 
  onArchive,
  onUpdateContent, 
  onChangeColor,
  isEditing,
  setEditing,
  currentUsername,
  currentUserId,
  projectOwnerId
}: {
  note: QuickNote;
  index: number;
  projectName: string | null;
  onTogglePin: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onUpdateContent: (content: string) => void;
  onChangeColor: (color: string) => void;
  isEditing: boolean;
  setEditing: (note: QuickNote | null) => void;
  currentUsername?: string;
  currentUserId?: string;
  projectOwnerId?: string;
}) {
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = () => {
    if (editContent.trim() !== note.content) {
      onUpdateContent(editContent.trim());
    }
    setEditing(null);
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setEditing(null);
  };

  const hoverRotation = ['hover:-rotate-1', 'hover:rotate-1', 'hover:-rotate-2', 'hover:rotate-2', 'hover:rotate-0'][index % 5];
  const shadowColor = {
    yellow: 'hover:shadow-yellow-200/60',
    blue: 'hover:shadow-blue-200/60',
    green: 'hover:shadow-green-200/60',
    pink: 'hover:shadow-pink-200/60',
    purple: 'hover:shadow-purple-200/60'
  };

  const borderColors = {
    yellow: '#fef08a',
    blue: '#bfdbfe',
    green: '#bbf7d0',
    pink: '#fbcfe8',
    purple: '#e9d5ff'
  };

  return (
    <div 
      className={`relative group/note p-2.5 border-l-4 rounded-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer ${noteColors[note.color as keyof typeof noteColors]} ${hoverRotation} ${shadowColor[note.color as keyof typeof shadowColor]}`}
      style={{
        boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        borderLeftColor: borderColors[note.color as keyof typeof borderColors],
        background: `linear-gradient(135deg, ${note.color === 'yellow' ? '#fffbeb' : note.color === 'blue' ? '#eff6ff' : note.color === 'green' ? '#f0fdf4' : note.color === 'pink' ? '#fdf2f8' : '#faf5ff'} 0%, ${note.color === 'yellow' ? '#fef9c3' : note.color === 'blue' ? '#dbeafe' : note.color === 'green' ? '#dcfce7' : note.color === 'pink' ? '#fce7f3' : '#f3e8ff'} 100%)`
      }}
    >
      {/* Pin en la esquina superior derecha */}
      {note.pinned === true && (
        <div className="absolute -top-1 -right-1">
          <Pin className="h-4 w-4 text-red-500 drop-shadow-md transition-transform duration-300 group-hover/note:rotate-12 group-hover/note:scale-110" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Select value={note.color} onValueChange={onChangeColor}>
            <SelectTrigger className="w-8 h-7 p-0 border-0 bg-transparent hover:scale-110 transition-transform">
              <span className="text-base">{colorEmojis[note.color as keyof typeof colorEmojis]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yellow">{colorEmojis.yellow} Yellow</SelectItem>
              <SelectItem value="blue">{colorEmojis.blue} Blue</SelectItem>
              <SelectItem value="green">{colorEmojis.green} Green</SelectItem>
              <SelectItem value="pink">{colorEmojis.pink} Pink</SelectItem>
              <SelectItem value="purple">{colorEmojis.purple} Purple</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
          <AdminCreatedBadge 
            createdByAdminUsername={(note as any).created_by_admin_username}
            currentUsername={currentUsername}
          />
          {/* Para notas de proyecto: mostrar badge de colaborador */}
          {note.projectId && (
            <NoteCollaboratorBadge
              createdByUsername={(note as any).created_by_username}
              createdByFullName={(note as any).created_by_full_name}
              createdByUserId={note.userId}
              projectOwnerId={projectOwnerId}
              currentUsername={currentUsername}
            />
          )}
          {/* Para Quick Notes de dashboard: usar el mismo badge que en project notes */}
          {!note.projectId && (
            <DashboardCreatorBadge
              createdByUsername={(note as any).created_by_username}
              createdByFullName={(note as any).created_by_full_name}
              createdByUserId={note.userId}
              currentUserId={currentUserId}
            />
          )}
        </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            className="h-6 w-6 p-0 hover:bg-black/10 transition-all duration-300 hover:scale-110 rounded-full"
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            {note.pinned ? <PinOff className="h-3 w-3 transition-transform duration-300" /> : <Pin className="h-3 w-3 transition-transform duration-300" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(note)}
            className="h-6 w-6 p-0 hover:bg-black/10 transition-all duration-300 hover:scale-110 rounded-full"
            title="Edit"
          >
            <Edit3 className="h-3 w-3 transition-transform duration-300 hover:rotate-12" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="h-6 w-6 p-0 hover:bg-orange-100 hover:text-orange-600 transition-all duration-300 hover:scale-110 rounded-full"
            title="Archive note"
          >
            <Archive className="h-3 w-3 transition-transform duration-300 hover:rotate-12" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 transition-all duration-300 hover:scale-110 rounded-full"
            title="Delete"
          >
            <Trash2 className="h-3 w-3 transition-transform duration-300 hover:rotate-12" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-1.5 mt-1.5">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            className="text-xs resize-none bg-white/70 border-gray-200 focus:border-gray-300"
            placeholder="Write your note..."
          />
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-6 px-2 text-xs transition-all duration-300 hover:scale-105">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="h-6 px-2 text-xs transition-all duration-300 hover:scale-105 hover:shadow-md bg-gray-700 hover:bg-gray-800">
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs whitespace-pre-wrap mb-1 leading-relaxed text-gray-700 line-clamp-2">{note.content}</p>
      )}

      <div className="flex items-center justify-between text-xs opacity-60 border-t border-gray-200 pt-1 mt-1">
        <span className="text-xs font-medium text-gray-500">{new Date(note.updatedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        {projectName && (
          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
            {projectName}
          </Badge>
        )}
      </div>
    </div>
  );
}

// Componente para notas archivadas
function ArchivedNoteCard({ 
  note, 
  onRestore, 
  onDelete 
}: {
  note: QuickNote;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`p-3 rounded-lg border-2 ${noteColors[note.color as keyof typeof noteColors]} opacity-75`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">{colorEmojis[note.color as keyof typeof colorEmojis]}</span>
          <div className="text-xs text-gray-500">
            Archived on {new Date(note.updatedAt!).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            className="h-6 w-6 p-0 hover:bg-green-500/20 text-green-600"
            title="Restore note"
          >
            <ArchiveRestore className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-600"
            title="Delete permanently"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="max-h-16 overflow-y-auto mb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <p className="text-sm whitespace-pre-wrap pr-2">{note.content}</p>
      </div>
      
      <div className="flex items-center justify-between text-xs opacity-75">
        <span>Created: {new Date(note.createdAt!).toLocaleDateString()}</span>
        {note.projectId && (
          <Badge variant="secondary" className="text-xs bg-black/10">
            Project Note
          </Badge>
        )}
      </div>
    </div>
  );
}

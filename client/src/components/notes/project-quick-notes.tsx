import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pin, PinOff, Edit3, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import { NoteCollaboratorBadge } from "@/components/ui/collaborator-badge";
import type { QuickNote, InsertQuickNote } from "@shared/schema";

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

interface ProjectQuickNotesProps {
  projectId: string;
  projectName: string;
  projectOwnerId?: string;
}

export default function ProjectQuickNotes({ projectId, projectName, projectOwnerId }: ProjectQuickNotesProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteColor, setNewNoteColor] = useState<keyof typeof noteColors>("yellow");
  const [newNotePinned, setNewNotePinned] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Consulta específica para notas del proyecto
  const { data: notes = [], isLoading } = useQuery<QuickNote[]>({
    queryKey: [`/api/quick-notes/project/${projectId}`],
    queryFn: async () => {
      const response = await fetch(`/api/quick-notes/project/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project notes');
      return response.json();
    }
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: InsertQuickNote) => {
      const payload = { ...noteData, projectId };
      // console.log("🎯 [FRONTEND] Creating project note with payload:", payload);
      // console.log("🎯 [FRONTEND] ProjectId:", projectId);
      
      const response = await fetch("/api/quick-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to create note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quick-notes/project/${projectId}`] });
      // También invalidar las notas generales para que no aparezcan allí
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      setIsCreateOpen(false);
      setNewNoteContent("");
      setNewNoteColor("yellow");
      setNewNotePinned(false);
      toast({
        title: "Success",
        description: "Project note created successfully."
      });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertQuickNote> }) => {
      const response = await fetch(`/api/quick-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quick-notes/project/${projectId}`] });
      toast({
        title: "Success",
        description: "Note updated successfully."
      });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/quick-notes/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error('Failed to delete note');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quick-notes/project/${projectId}`] });
      toast({
        title: "Success",
        description: "Note deleted successfully."
      });
    }
  });

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;
    
    createNoteMutation.mutate({
      content: newNoteContent.trim(),
      color: newNoteColor,
      pinned: newNotePinned
      // No necesitamos enviar noteType - se determinará automáticamente por el projectId
    });
  };

  const handleUpdateContent = (id: string, content: string) => {
    updateNoteMutation.mutate({ id, updates: { content } });
  };

  const handleChangeColor = (id: string, color: string) => {
    updateNoteMutation.mutate({ id, updates: { color } });
  };

  const handleTogglePin = (id: string, pinned: boolean) => {
    updateNoteMutation.mutate({ id, updates: { pinned: !pinned } });
  };

  const handleDeleteNote = (id: string) => {
    deleteNoteMutation.mutate(id);
  };

  // Ordenar notas: pinned primero, luego por fecha
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Project Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-gray-300/30 hover:-translate-y-1 animate-fade-in-up overflow-hidden" style={{animationDelay: '1.1s', background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)', borderColor: '#e5e7eb'}}>
      {/* Notebook Binding */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-700 to-gray-600 shadow-lg">
        <div className="flex flex-col items-center justify-around h-full py-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-gray-900/20 shadow-inner" />
          ))}
        </div>
      </div>
      
      <CardHeader className="pb-3 pl-12">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base transition-all duration-300 group-hover:text-purple-600 font-handwriting text-gray-800">
            <StickyNote className="h-5 w-5 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 text-gray-600" />
            <span className="transition-all duration-300 group-hover:translate-x-1">Project Notes</span>
            {sortedNotes.length > 0 && (
              <Badge variant="secondary" className="text-xs transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 bg-gray-100 text-gray-700 border-gray-300">
                {sortedNotes.length}
              </Badge>
            )}
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all duration-300 hover:scale-105">
                <Plus className="h-4 w-4 mr-1.5 transition-transform duration-300 group-hover:rotate-90" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Write your note..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Color:</span>
                    <Select value={newNoteColor} onValueChange={(value: keyof typeof noteColors) => setNewNoteColor(value)}>
                      <SelectTrigger className="w-32">
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pinned"
                      checked={newNotePinned}
                      onChange={(e) => setNewNotePinned(e.target.checked)}
                    />
                    <label htmlFor="pinned" className="text-sm font-medium">Pin note</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateNote}
                    disabled={!newNoteContent.trim() || createNoteMutation.isPending}
                  >
                    {createNoteMutation.isPending ? "Creating..." : "Create Note"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto px-2 pl-12 pb-4" style={{background: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)'}}>
        {sortedNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 animate-fade-in-up" style={{animationDelay: '1.2s'}}>
            <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-40 transition-all duration-300 hover:opacity-80 hover:scale-110 hover:text-gray-600" />
            <p className="text-sm transition-colors duration-300 hover:text-gray-700 font-medium">No sticky notes yet</p>
            <p className="text-xs text-gray-500 mt-1">Click "Add Note" to create your first one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 py-2">
            {sortedNotes.map((note, index) => (
              <ProjectNoteCard
                key={note.id}
                note={note}
                index={index}
                onUpdateContent={handleUpdateContent}
                onChangeColor={handleChangeColor}
                onTogglePin={handleTogglePin}
                onDelete={handleDeleteNote}
                projectOwnerId={projectOwnerId}
                currentUsername={currentUser?.username}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProjectNoteCardProps {
  note: QuickNote;
  index: number;
  onUpdateContent: (id: string, content: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  projectOwnerId?: string;
  currentUsername?: string;
}

function ProjectNoteCard({ note, index, onUpdateContent, onChangeColor, onTogglePin, onDelete, projectOwnerId, currentUsername }: ProjectNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = () => {
    if (editContent.trim() !== note.content) {
      onUpdateContent(note.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  // Rotación aleatoria para efecto post-it
  const rotation = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2', 'rotate-0'][index % 5];
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
      className={`relative group p-2.5 border-l-4 rounded-md transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:rotate-0 cursor-pointer animate-fade-in-up ${noteColors[note.color as keyof typeof noteColors]} ${rotation} ${shadowColor[note.color as keyof typeof shadowColor]}`}
      style={{
        animationDelay: `${1.2 + index * 0.1}s`,
        boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        borderLeftColor: borderColors[note.color as keyof typeof borderColors],
        background: `linear-gradient(135deg, ${note.color === 'yellow' ? '#fffbeb' : note.color === 'blue' ? '#eff6ff' : note.color === 'green' ? '#f0fdf4' : note.color === 'pink' ? '#fdf2f8' : '#faf5ff'} 0%, ${note.color === 'yellow' ? '#fef9c3' : note.color === 'blue' ? '#dbeafe' : note.color === 'green' ? '#dcfce7' : note.color === 'pink' ? '#fce7f3' : '#f3e8ff'} 100%)`
      }}
    >
      {/* Pin en la esquina superior derecha */}
      {note.pinned === true && (
        <div className="absolute -top-1 -right-1">
          <Pin className="h-4 w-4 text-red-500 drop-shadow-md transition-transform duration-300 group-hover:rotate-12" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Select value={note.color} onValueChange={(color) => onChangeColor(note.id, color)}>
            <SelectTrigger className="w-8 h-7 p-0 border-0 bg-transparent hover:scale-110 transition-transform">
              <span className="text-base">{colorEmojis[note.color as keyof typeof colorEmojis]}</span>
            </SelectTrigger>
            <SelectContent className="min-w-32">
              <SelectItem value="yellow" className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{colorEmojis.yellow}</span>
                  <span>Yellow</span>
                </div>
              </SelectItem>
              <SelectItem value="blue" className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{colorEmojis.blue}</span>
                  <span>Blue</span>
                </div>
              </SelectItem>
              <SelectItem value="green" className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{colorEmojis.green}</span>
                  <span>Green</span>
                </div>
              </SelectItem>
              <SelectItem value="pink" className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{colorEmojis.pink}</span>
                  <span>Pink</span>
                </div>
              </SelectItem>
              <SelectItem value="purple" className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{colorEmojis.purple}</span>
                  <span>Purple</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <AdminCreatedBadge 
              createdByAdminUsername={(note as any).created_by_admin_username}
              currentUsername={currentUsername}
              className="text-xs"
            />
            <NoteCollaboratorBadge
              createdByUsername={(note as any).created_by_username}
              createdByFullName={(note as any).created_by_full_name}
              createdByUserId={(note as any).userId}
              projectOwnerId={projectOwnerId}
              currentUsername={currentUsername}
            />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTogglePin(note.id, note.pinned)}
            className="h-6 w-6 p-0 hover:bg-black/10 transition-all duration-300 hover:scale-110 rounded-full"
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            {note.pinned ? <PinOff className="h-3 w-3 transition-transform duration-300" /> : <Pin className="h-3 w-3 transition-transform duration-300" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 w-6 p-0 hover:bg-black/10 transition-all duration-300 hover:scale-110 rounded-full"
            title="Edit"
          >
            <Edit3 className="h-3 w-3 transition-transform duration-300 hover:rotate-12" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(note.id)}
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
      </div>
    </div>
  );
}

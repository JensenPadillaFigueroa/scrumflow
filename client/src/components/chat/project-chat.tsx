import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2, Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface ProjectChatProps {
  projectId: string;
  projectName?: string;
  currentUserId?: string;
}

interface Message {
  id: string;
  projectId: string;
  userId: string;
  message: string;
  edited: boolean;
  editedAt?: string;
  createdAt: string;
  username: string;
  full_name: string;
}

export default function ProjectChat({ projectId, projectName, currentUserId }: ProjectChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages with auto-refresh
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/chat/${projectId}`],
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchIntervalInBackground: true,
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", `/api/chat/${projectId}`, { message });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${projectId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Update message mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      return await apiRequest("PUT", `/api/chat/message/${id}`, { message });
    },
    onSuccess: () => {
      setEditingId(null);
      setEditingText("");
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${projectId}`] });
      toast({
        title: "Success",
        description: "Message updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/chat/message/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${projectId}`] });
      toast({
        title: "Success",
        description: "Message deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startEdit = (message: Message) => {
    setEditingId(message.id);
    setEditingText(message.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = () => {
    if (editingId && editingText.trim()) {
      updateMutation.mutate({ id: editingId, message: editingText.trim() });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this message?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          💬 {projectName ? `${projectName} Chat` : "Project Chat"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-pulse">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.userId === currentUserId;
              const isEditing = editingId === message.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in-up`}
                >
                  <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {!isOwn && (
                      <span className="text-xs font-medium text-gray-600 px-2">
                        {message.full_name || message.username}
                      </span>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwn
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      } group relative`}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button size="sm" onClick={saveEdit} className="h-6 text-xs">
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 text-xs">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                          {isOwn && (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => startEdit(message)}
                                className="bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(message.id)}
                                className="bg-white rounded-full p-1 shadow-md hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <span className={`text-xs text-gray-500 px-2 ${isOwn ? "text-right" : "text-left"}`}>
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      {message.edited && " (edited)"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex gap-2 pt-3 border-t">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sendMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMutation.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

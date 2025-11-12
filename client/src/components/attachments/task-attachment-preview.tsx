import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Paperclip, FileText, Image as ImageIcon, File, ExternalLink, Trash2, X, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  isImage: boolean;
}

interface TaskAttachmentPreviewProps {
  taskId: string;
  onClick?: () => void;
}

export default function TaskAttachmentPreview({ taskId, onClick }: TaskAttachmentPreviewProps) {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: [`/api/attachments/task/${taskId}`],
    queryFn: async () => {
      const res = await fetch(`/api/attachments/task/${taskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to delete attachment");
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/attachments/task/${taskId}`] });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete the file. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (attachments.length === 0) return null;

  const getFileIcon = (attachment: Attachment) => {
    if (attachment.isImage) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (attachment.fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const handleViewFile = (e: React.MouseEvent, attachmentId: string) => {
    e.stopPropagation();
    window.open(`/api/attachments/view/${attachmentId}`, '_blank');
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleDelete = (e: React.MouseEvent, attachmentId: string) => {
    e.stopPropagation();
    setDeleteId(attachmentId);
  };

  const handleDownload = (e: React.MouseEvent, attachmentId: string, fileName: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/attachments/download/${attachmentId}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const truncateFileName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - ext!.length - 4);
    return `${truncated}...${ext}`;
  };

  // Mostrar preview de la primera imagen si existe
  const firstImage = attachments.find(att => att.isImage === true);
  const hasMultiple = attachments.length > 1;

  return (
    <div className="mt-2 space-y-1">
      {/* Preview de imagen si existe */}
      {firstImage && (
        <div 
          className="relative cursor-pointer group"
          onClick={(e) => handleViewFile(e, firstImage.id)}
        >
          <img
            src={`/api/attachments/view/${firstImage.id}`}
            alt={firstImage.fileName}
            className="w-full h-32 object-cover rounded border border-gray-200 group-hover:border-blue-400 transition-all"
          />
          {/* Botones de acción */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleDownload(e, firstImage.id, firstImage.fileName)}
              className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-full shadow-lg"
              title="Download image"
            >
              <Download className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleDelete(e, firstImage.id)}
              className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg"
              title="Delete image"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Open Image</span>
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
              {firstImage.fileName}
            </div>
          </div>
        </div>
      )}

      {/* Lista de archivos con scroll si hay más de 3 */}
      <div className={`space-y-1 ${attachments.filter(att => !(att.isImage === true && att.id === firstImage?.id)).length > 3 ? 'max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100' : ''}`}>
        {attachments.map((attachment, index) => {
          // Si es la primera imagen y ya la mostramos arriba, skip
          if (attachment.isImage === true && attachment.id === firstImage?.id) return null;
          
          return (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
            >
              <div className="flex-shrink-0">
                {getFileIcon(attachment)}
              </div>
              <div 
                className="flex-1 min-w-0"
                onClick={(e) => handleViewFile(e, attachment.id)}
              >
                <p className="text-xs font-medium text-gray-700 truncate group-hover:text-blue-600">
                  {truncateFileName(attachment.fileName)}
                </p>
              </div>
              <button
                onClick={(e) => handleViewFile(e, attachment.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Open file"
              >
                <ExternalLink className="h-3 w-3 text-gray-400 hover:text-blue-600" />
              </button>
              <button
                onClick={(e) => handleDownload(e, attachment.id, attachment.fileName)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-700"
                title="Download file"
              >
                <Download className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => handleDelete(e, attachment.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                title="Delete file"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Botón para ver todos en el modal */}
      {attachments.length > 1 && (
        <button
          onClick={handleOpenModal}
          className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1 hover:bg-blue-50 rounded transition-all flex items-center justify-center gap-1"
        >
          <Paperclip className="h-3 w-3" />
          View all {attachments.length} attachments
        </button>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                deleteId && deleteMutation.mutate(deleteId);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

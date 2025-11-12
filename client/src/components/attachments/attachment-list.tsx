import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Paperclip, 
  Download, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  File,
  Upload,
  X,
  Eye,
  ExternalLink
} from "lucide-react";
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
  filePath: string;
  fileSize: number;
  fileType: string;
  fileExtension: string;
  entityType: 'task' | 'project';
  entityId: string;
  uploadedBy: string;
  uploaderUsername?: string;
  uploaderFullName?: string;
  description?: string;
  isImage: boolean;
  uploadedAt: string;
}

interface AttachmentListProps {
  entityType: 'task' | 'project';
  entityId: string;
}

export default function AttachmentList({ entityType, entityId }: AttachmentListProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: [`/api/attachments/${entityType}/${entityId}`],
    queryFn: async () => {
      const res = await fetch(`/api/attachments/${entityType}/${entityId}`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
  });

  // Upload mutation - auto upload cuando se selecciona archivo
  const handleUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setSelectedFile(file);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      console.log('📤 Uploading file:', {
        fileName: file.name,
        entityType,
        entityId,
        fileSize: file.size
      });

      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }

      toast({
        title: "✅ File uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });

      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: [`/api/attachments/${entityType}/${entityId}`] });
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

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
      queryClient.invalidateQueries({ queryKey: [`/api/attachments/${entityType}/${entityId}`] });
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

  const handleView = (attachment: Attachment) => {
    window.open(`/api/attachments/view/${attachment.id}`, '_blank');
  };

  const handleDownload = (attachment: Attachment) => {
    window.open(`/api/attachments/download/${attachment.id}`, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (attachment: Attachment) => {
    if (attachment.isImage) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (attachment.fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <Card className="animate-fade-in-up transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
          Attachments ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <input
              type="file"
              id={`file-upload-${entityType}-${entityId}`}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUpload(file);
                  // Reset input para permitir subir el mismo archivo de nuevo
                  e.target.value = '';
                }
              }}
              disabled={uploading}
            />
            <label
              htmlFor={`file-upload-${entityType}-${entityId}`}
              className="flex-1 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Upload className={`h-4 w-4 ${uploading ? 'animate-bounce' : ''}`} />
                {uploading ? (
                  <span className="font-medium text-blue-600 animate-pulse">Uploading {selectedFile?.name}...</span>
                ) : (
                  <span>Click to select a file (auto-upload)</span>
                )}
              </div>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Max file size: 50MB. Supported: Images, PDFs, Documents, Archives
          </p>
        </div>

        {/* Attachments List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-pulse">Loading attachments...</div>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 animate-fade-in-up">
            <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-30 animate-pulse" />
            <p>No attachments yet</p>
            <p className="text-sm">Upload files to share with your team</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
            {attachments.map((attachment, index) => (
              <div
                key={attachment.id}
                className="border rounded-lg hover:shadow-md transition-all duration-300 group overflow-hidden hover:-translate-y-1 hover:scale-[1.02] animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Preview para imágenes */}
                {attachment.isImage === true && (
                  <div 
                    className="w-full h-24 bg-gray-100 cursor-pointer relative overflow-hidden"
                    onClick={() => handleView(attachment)}
                  >
                    <img
                      src={`/api/attachments/view/${attachment.id}`}
                      alt={attachment.fileName}
                      className="w-full h-full object-contain hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}
                
                {/* Info del archivo */}
                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 transition-all duration-200">
                  <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                    {getFileIcon(attachment)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.fileName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span>•</span>
                      <span>by {attachment.uploaderUsername || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleView(attachment)}
                      title="Open/View"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 hover:scale-110"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
                      className="transition-all duration-200 hover:scale-110"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(attachment.id)}
                      title="Delete"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

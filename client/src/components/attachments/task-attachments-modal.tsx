import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AttachmentList from "./attachment-list";

interface TaskAttachmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export default function TaskAttachmentsModal({ 
  open, 
  onOpenChange, 
  taskId, 
  taskTitle 
}: TaskAttachmentsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attachments - {taskTitle}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <AttachmentList entityType="task" entityId={taskId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Edit3 } from "lucide-react";
import type { Task } from "@shared/schema";

interface CompletionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  task: Task | null;
  isAmending?: boolean;
}

export default function CompletionNotesModal({
  isOpen,
  onClose,
  onSave,
  task,
  isAmending = false
}: CompletionNotesModalProps) {
  const [notes, setNotes] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 250;

  useEffect(() => {
    if (task?.completionNotes) {
      setNotes(task.completionNotes);
      // Auto-expand if notes are longer than max length
      setIsExpanded(task.completionNotes.length > maxLength);
    } else {
      setNotes("");
      setIsExpanded(false);
    }
  }, [task]);
  
  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  const handleSkip = () => {
    onSave("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAmending ? (
              <>
                <Edit3 className="h-5 w-5 text-blue-600" />
                Amend Solution
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Task Completed!
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isAmending
              ? "Update or fix the solution for this task."
              : "Describe the solution or what was accomplished."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Task: <span className="text-gray-600">{task?.title}</span>
              </label>
              {notes.length > maxLength && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs h-6 px-2"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
            <Textarea
              placeholder="Describe the solution, what was fixed, or what was accomplished..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={isExpanded ? 10 : 5}
              className="resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                {notes.length} characters
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            {!isAmending && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              {isAmending ? "Update Solution" : "Save & Complete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

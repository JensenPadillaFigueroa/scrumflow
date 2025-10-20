import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StickyNote } from "lucide-react";
import CreateSharedNoteModal from "@/components/modals/create-shared-note-modal";

interface FloatingNoteButtonProps {
  defaultProjectId?: string;
}

export default function FloatingNoteButton({ defaultProjectId }: FloatingNoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-40 bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white border-2 border-yellow-300"
        title="Create Shared Note"
      >
        <StickyNote className="h-6 w-6" />
      </Button>

      <CreateSharedNoteModal
        open={isOpen}
        onOpenChange={setIsOpen}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}

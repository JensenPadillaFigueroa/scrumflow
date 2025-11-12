import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AttachmentCountProps {
  entityType: 'task' | 'project';
  entityId: string;
  showIcon?: boolean;
}

export default function AttachmentCount({ entityType, entityId, showIcon = true }: AttachmentCountProps) {
  const { data: attachments = [] } = useQuery<any[]>({
    queryKey: [`/api/attachments/${entityType}/${entityId}`],
    queryFn: async () => {
      const res = await fetch(`/api/attachments/${entityType}/${entityId}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  if (attachments.length === 0) return null;

  return (
    <Badge variant="outline" className="text-xs gap-1 bg-gray-50">
      {showIcon && <Paperclip className="h-3 w-3" />}
      {attachments.length}
    </Badge>
  );
}

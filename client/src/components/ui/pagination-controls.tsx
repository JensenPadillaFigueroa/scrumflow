import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  compact?: boolean; // Modo compacto para kanban
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  compact = false,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Modo compacto para kanban
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-7 w-7 p-0 hover:bg-gray-200"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        
        <span className="text-xs text-gray-600 font-medium min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 p-0 hover:bg-gray-200"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Modo normal para páginas
  return (
    <div className="flex items-center justify-between mt-6 px-2">
      <div className="text-sm text-gray-600">
        Showing <span className="font-medium">{startItem}</span> to{" "}
        <span className="font-medium">{endItem}</span> of{" "}
        <span className="font-medium">{totalItems}</span> projects
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="transition-all duration-200 hover:scale-105"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Mostrar solo páginas cercanas a la actual
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={`w-9 transition-all duration-200 ${
                    currentPage === page
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "hover:scale-105"
                  }`}
                >
                  {page}
                </Button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="px-2 text-gray-400">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="transition-all duration-200 hover:scale-105"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

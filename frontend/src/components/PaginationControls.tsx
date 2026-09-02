import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages} • Showing {Math.min((currentPage - 1) * itemsPerPage + itemsPerPage, totalItems)} of {totalItems}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PageSizeSelectProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
}

export const PageSizeSelect: React.FC<PageSizeSelectProps> = ({
  pageSize,
  onPageSizeChange,
  options = [5, 10, 20, 50, 100],
}) => (
  <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
    <SelectTrigger className="w-[140px]">
      <SelectValue placeholder="Tamaño de página" />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option} value={String(option)}>
          {option} por página
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
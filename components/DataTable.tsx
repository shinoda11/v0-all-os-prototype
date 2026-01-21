'use client';

import React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  highlightedRows?: string[];
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = 'データがありません',
  highlightedRows = [],
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.className,
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const rowKey = getRowKey(row);
            const isHighlighted = highlightedRows.includes(rowKey);
            return (
              <TableRow
                key={rowKey}
                className={cn(
                  isHighlighted && 'bg-primary/10 animate-pulse'
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.className,
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.accessor(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

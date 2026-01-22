'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';

/**
 * デザインガイドライン 3.3 テーブル準拠
 * - 数値カラムは右寄せ
 * - 空値は「--」で統一
 * - 原則3: 枠線最小限（border-collapse活用）
 */

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
  /** 数値カラムは 'right' を指定（3.3準拠） */
  align?: 'left' | 'center' | 'right';
  /** 数値カラムかどうか（自動右寄せ） */
  numeric?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  highlightedRows?: string[];
  /** 2.1スペーシング: compact=密、default=標準 */
  density?: 'compact' | 'default';
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = 'データがありません',
  highlightedRows = [],
  density = 'default',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <EmptyState 
        type="no_data" 
        title={emptyMessage}
        description="該当するデータが見つかりませんでした"
      />
    );
  }

  const cellPadding = density === 'compact' ? 'py-2 px-3' : 'py-3 px-4';

  return (
    // 原則3: 枠線は最小限。外枠のみ
    <div className="rounded border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  cellPadding,
                  'text-sm font-bold',
                  // 3.3: 数値は右寄せ
                  (column.numeric || column.align === 'right') && 'text-right',
                  column.align === 'center' && 'text-center',
                  column.className
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
                  'border-b border-border last:border-b-0',
                  isHighlighted && 'bg-primary/5'
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      cellPadding,
                      'text-sm',
                      // 3.3: 数値は右寄せ
                      (column.numeric || column.align === 'right') && 'text-right tabular-nums',
                      column.align === 'center' && 'text-center',
                      column.className
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

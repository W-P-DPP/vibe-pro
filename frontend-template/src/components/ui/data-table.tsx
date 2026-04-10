import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type DataTableColumn<TData> = {
  key: string
  header: ReactNode
  cell: (row: TData) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[]
  data: TData[]
  caption?: string
  emptyMessage?: string
  className?: string
}

function DataTable<TData>({
  columns,
  data,
  caption,
  emptyMessage = 'No data available.',
  className,
}: DataTableProps<TData>) {
  return (
    <Table className={className}>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.headerClassName}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length ? (
          data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell
                  key={`${column.key}-${rowIndex}`}
                  className={column.cellClassName}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className={cn('h-24 text-center text-muted-foreground')}
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export { DataTable }

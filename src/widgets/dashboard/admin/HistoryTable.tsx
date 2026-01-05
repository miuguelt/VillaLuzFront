import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type ColumnDef = string | { key: string; label: string };

interface HistoryTableProps {
  columns: ColumnDef[];
  data: Record<string, any>[];
  getRowId?: (row: Record<string, any>) => string | number;
  onRowClick?: (row: Record<string, any>) => void;
  renderRowActions?: (row: Record<string, any>) => React.ReactNode;
  actionsHeader?: string;
}

const HistoryTable = ({
  columns,
  data,
  getRowId,
  onRowClick,
  renderRowActions,
  actionsHeader = 'Acciones',
}: HistoryTableProps) => {
  if (data.length === 0) {
    return <p>No records to display.</p>;
  }

  const normalizedColumns = columns.map((col) =>
    typeof col === 'string' ? { key: col, label: col } : col
  );
  const columnKeys = normalizedColumns.map((col) => col.key);

  // Try to infer a stable id field name commonly used in records
  const rowIdKey = (['id', 'uuid', 'code'].find(k => k in data[0]) || columnKeys[0]) as string;

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {normalizedColumns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            {renderRowActions && <TableHead>{actionsHeader}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const rowId = getRowId ? getRowId(row) : row[rowIdKey];
            return (
              <TableRow
                key={String(rowId ?? JSON.stringify(row))}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
              >
                {columnKeys.map((key) => (
                  <TableCell key={`${rowId ?? row[rowIdKey]}-${key}`}>{row[key]}</TableCell>
                ))}
                {renderRowActions && (
                  <TableCell>{renderRowActions(row)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default HistoryTable;

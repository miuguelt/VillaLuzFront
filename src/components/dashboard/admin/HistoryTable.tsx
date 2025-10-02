import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HistoryTableProps {
  columns: string[];
  data: Record<string, any>[];
}

const HistoryTable = ({ columns, data }: HistoryTableProps) => {
  if (data.length === 0) {
    return <p>No records to display.</p>;
  }

  const keys = Object.keys(data[0]);

  // Try to infer a stable id field name commonly used in records
  const rowIdKey = (['id', 'uuid', 'code'].find(k => k in data[0]) || keys[0]) as string;

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col}>{col}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={String(row[rowIdKey] ?? JSON.stringify(row))}>
              {keys.map((key) => (
                <TableCell key={`${row[rowIdKey]}-${key}`}>{row[key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default HistoryTable;

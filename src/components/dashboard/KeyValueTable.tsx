import React from 'react';
import { normalizeDisplayValue } from '@/utils/normalization';

interface KeyValueTableProps {
  data: Record<string, any> | undefined | null;
  maxRows?: number;
  className?: string;
}

// Se usa normalización global

export const KeyValueTable: React.FC<KeyValueTableProps> = ({ data, maxRows = 30, className = '' }) => {
  if (!data || Object.keys(data).length === 0) {
    return <div className="text-[11px] text-muted-foreground">Sin datos</div>;
  }
  const entries = Object.entries(data).slice(0, maxRows);
  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <table className="w-full text-[11px]">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="odd:bg-muted">
              <td className="px-2 py-1 font-medium align-top w-1/3 break-all">{k}</td>
              <td className="px-2 py-1 text-muted-foreground break-all">{normalizeDisplayValue(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {Object.entries(data).length > maxRows && (
        <div className="text-[10px] px-2 py-1 text-muted-foreground border-t bg-muted">{Object.entries(data).length - maxRows} más…</div>
      )}
    </div>
  );
};

export default KeyValueTable;
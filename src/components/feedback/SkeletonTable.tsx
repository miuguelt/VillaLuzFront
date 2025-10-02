import React from 'react';

export interface SkeletonTableProps {
  columnLabels: string[];
  columnWidths?: Array<number | undefined>;
  rows?: number;
}

/**
 * SkeletonTable: muestra un esqueleto de tabla accesible mientras se cargan los datos.
 * - Respeta los anchos numéricos de columnas (width -> w-{n}).
 * - Usa bg-muted y animate-pulse para alinearse con el patrón visual y dark mode.
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columnLabels,
  columnWidths = [],
  rows = 8,
}) => {
  const headCells = columnLabels.map((label, idx) => {
    const w = columnWidths[idx];
    return (
      <th
        key={`sk-head-${idx}`}
        className={[
          'px-2 py-1 text-left text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider',
          w ? `w-${w}` : '',
        ].join(' ')}
        aria-hidden="true"
      >
        {label}
      </th>
    );
  });

  const bodyRows = Array.from({ length: rows }).map((_, rIdx) => (
    <tr key={`sk-row-${rIdx}`} className="h-8 md:h-9">
      {columnLabels.map((_, cIdx) => {
        const w = columnWidths[cIdx];
        return (
          <td
            key={`sk-cell-${rIdx}-${cIdx}`}
            className={[
              'px-2 py-1 whitespace-nowrap text-[11px] md:text-xs',
              w ? `w-${w}` : '',
            ].join(' ')}
          >
            <div className="h-4 w-full max-w-[240px] rounded bg-muted animate-pulse" />
          </td>
        );
      })}
    </tr>
  ));

  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="min-w-full divide-y divide-border/70 text-[12px] md:text-sm">
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/50">
          <tr className="h-8">{headCells}</tr>
        </thead>
        <tbody className="divide-y divide-border/60 bg-card">{bodyRows}</tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;
// ... existing code ...
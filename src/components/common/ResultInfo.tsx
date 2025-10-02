import React from 'react';

interface ResultInfoProps {
  page: number;
  pageSize: number;
  total: number;
}

export const ResultInfo: React.FC<ResultInfoProps> = ({ page, pageSize, total }) => {
  if (total === 0) return <p>No hay resultados.</p>;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <p className="text-sm text-muted-foreground">
      Mostrando {start}–{end} de {total} resultados
    </p>
  );
};
import React from 'react';

const AuthNotice: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="mb-4 p-4 rounded border border-yellow-300 bg-yellow-50 text-yellow-800">
      <strong>Acceso restringido:</strong>
      <div className="text-sm mt-1">
        {message || 'Debes iniciar sesión para ver esta sección completa.'}
      </div>
    </div>
  );
};

export default AuthNotice;

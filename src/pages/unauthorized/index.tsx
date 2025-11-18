import { Link, useLocation, useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  return (
    <div className="h-[100dvh] flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso denegado</h1>
        <p className="text-gray-700 mb-2">No tienes permisos para ver esta página.</p>
        {fromPath && (
          <p className="text-sm text-gray-500 mb-4">
            Ruta solicitada: <span className="font-mono">{fromPath}</span>
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Regresar
          </button>
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

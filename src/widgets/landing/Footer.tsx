
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-green-800 text-white pt-6 pb-6 w-full shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] m-0" role="contentinfo" aria-label="Pie de página">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6" aria-label="Información institucional y enlaces rápidos">
          <div>
            <h3 className="text-lg font-semibold mb-4">Finca Villa Luz</h3>
            <p className="text-sm opacity-90">Centro de Gestión Agroempresarial del Oriente</p>
            <p className="text-sm opacity-90">Servicio Nacional de Aprendizaje (SENA)</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contacto</h3>
            <p className="text-sm opacity-90">Dirección: Velez, Santander</p>
            <p className="text-sm opacity-90">Email: info@fincavillaluz.edu.co</p>
            <p className="text-sm opacity-90">Teléfono: (57) 123 456 7890</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm opacity-90 hover:opacity-100 hover:underline transition-opacity">Inicio</Link></li>
              <li><Link to="/login" className="text-sm opacity-90 hover:opacity-100 hover:underline transition-opacity">Iniciar Sesión</Link></li>
              <li><Link to="/signup" className="text-sm opacity-90 hover:opacity-100 hover:underline transition-opacity">Registrarse</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-green-700 pt-6 pb-0 text-center">
          <p className="text-sm opacity-80 mb-0">
            &copy; {currentYear} Finca Villa Luz - SENA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
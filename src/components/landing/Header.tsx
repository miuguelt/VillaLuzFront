import { useState, useEffect, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthenticationContext";
import { Button } from "@/components/ui/button";

interface MenuItem {
  id: string;
  label: string;
}

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const navigate = useNavigate();

  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.isAuthenticated;
  const dashboardRoute = isAuthenticated ? "/dashboard" : null;

  const menuItems: MenuItem[] = useMemo(
    () => [
      { id: "inicio", label: "Inicio" },
      { id: "caracteristicas", label: "Características" },
      { id: "galeria", label: "Galería" },
      { id: "informacion", label: "Información" },
    ],
    []
  );

  useEffect(() => {
    const handleScroll = () => {
      const sections = menuItems.map((item) =>
        document.getElementById(item.id)
      );
      const currentSection = sections.find((section) => {
        if (section) {
          const rect = section.getBoundingClientRect();
          return (
            rect.top <= window.innerHeight / 2 &&
            rect.bottom >= window.innerHeight / 2
          );
        }
        return false;
      });
      if (currentSection) {
        setActiveSection(currentSection.id);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [menuItems]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-green-800/95 backdrop-blur supports-[backdrop-filter]:bg-green-800/75">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Brand */}
        <div className="flex items-center gap-3 text-white">
          <img src="/assets/logoSenaOrange.svg" width={35} height={35} alt="Logo Sena" loading="lazy" decoding="async" fetchPriority="low" />
          <a href="/#inicio" className="font-bold text-white ml-2">Finca Villa Luz</a>
        </div>

        {/* Desktop menu */}
        <div className="hidden sm:flex items-center gap-4">
          {menuItems.map((item) => (
            <a
              key={item.id}
              className={`text-white hover:text-green-400 ${
                activeSection === item.id ? "font-bold border-b border-green-500" : ""
              }`}
              href={`/#${item.id}`}
            >
              {item.label}
            </a>
          ))}
          {isAuthenticated && dashboardRoute && (
            <Button
              className="bg-orange-600 text-white font-semibold ml-2"
              onClick={() => navigate(dashboardRoute)}
            >
              Ir al Dashboard
            </Button>
          )}
        </div>

        {/* Desktop auth actions */}
        <div className="hidden sm:flex items-center gap-2">
          {!isAuthenticated ? (
            <Button
              className="bg-green-600 text-white font-semibold"
              onClick={() => navigate("/login")}
            >
              Ingresar
            </Button>
          ) : (
            <Button
              className="bg-gray-700 text-white font-semibold"
              onClick={auth?.logout}
            >
              Salir
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden space-y-1 px-4 pb-3 pt-2 bg-green-800 text-white">
          {menuItems.map((item) => (
            <a
              key={item.id}
              className={`block w-full py-2 ${
                activeSection === item.id ? "font-bold text-green-200" : ""
              }`}
              href={`/#${item.id}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          {isAuthenticated && dashboardRoute && (
            <Button
              className="w-full bg-orange-600 text-white font-semibold mt-2"
              onClick={() => {
                setIsMenuOpen(false);
                navigate(dashboardRoute);
              }}
            >
              Ir al Dashboard
            </Button>
          )}
          {!isAuthenticated ? (
            <Button
              className="w-full bg-green-600 text-white font-semibold"
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/login');
              }}
            >
              Ingresar
            </Button>
          ) : (
            <Button
              className="w-full bg-gray-700 text-white font-semibold"
              onClick={() => {
                setIsMenuOpen(false);
                auth?.logout?.();
              }}
            >
              Salir
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}

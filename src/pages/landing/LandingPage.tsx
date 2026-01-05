import React from 'react';
import Layout from '@/widgets/landing/Layout';
import IndexSection from '@/widgets/landing/IndexSection';
import FeatureCard from '@/widgets/landing/FeatureCard';
import Gallery from '@/widgets/landing/Gallery';
import AboutSection from '@/widgets/landing/AboutSection';
import { Button } from '@/shared/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  Leaf,
  ShieldCheck,
  LineChart,
  Layers,
} from 'lucide-react';
import gallery1 from '@/shared/assets/landingimg1.jpg';
import gallery2 from '@/shared/assets/landingimg2.jpg';
import gallery3 from '@/shared/assets/landingimg3.jpg';
import gallery4 from '@/shared/assets/landingimg4.jpg';
import gallery5 from '@/shared/assets/landingimg5.webp';
import gallery6 from '@/shared/assets/landingimg6.webp';

const featureList = [
  {
    title: 'Control integral del hato',
    description: 'Inventario, genealogías y estado de cada animal en una sola pantalla y siempre sincronizado.',
    icon: Layers,
  },
  {
    title: 'Alertas sanitarias inteligentes',
    description: 'Seguimiento automático de tratamientos, vacunaciones y controles sanitarios con recordatorios oportunos.',
    icon: ShieldCheck,
  },
  {
    title: 'Operación en campo sin señal',
    description: 'Modo offline y sincronización segura para registrar datos desde el potrero o zonas sin cobertura.',
    icon: Leaf,
  },
  {
    title: 'Agenda y tareas coordinadas',
    description: 'Planifica actividades diarias, asigna responsables y recibe confirmaciones en tiempo real.',
    icon: CalendarClock,
  },
  {
    title: 'Indicadores de productividad',
    description: 'Reportes ejecutivos con métricas de reproducción, sanidad y desempeño económico.',
    icon: LineChart,
  },
  {
    title: 'Monitoreo de actividad',
    description: 'Panel consolidado con las últimas operaciones realizadas por cada rol dentro de la finca.',
    icon: Activity,
  },
];

const galleryImages = [gallery1, gallery2, gallery3, gallery4, gallery5, gallery6];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <IndexSection />

      <section id="caracteristicas" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-green-600 font-semibold uppercase tracking-wide">Plataforma integral</p>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Todo lo que necesitas para administrar la finca</h2>
            <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
              Construimos cada módulo a partir de las operaciones reales de Villa Luz. Estos son los beneficios que ya están funcionando en el campo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {featureList.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-green-800 to-emerald-700 text-white py-16" aria-label="Acción principal">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 space-y-4">
            <p className="uppercase tracking-wide text-green-100 text-sm">Implementación en Villa Luz</p>
            <h3 className="text-3xl font-bold">Una sola plataforma para aprendices, instructores y administradores</h3>
            <p className="text-white/80 text-lg">
              La información que ya registras en el sistema se muestra aquí como vitrina: estadísticas, calendario sanitario y estado de cada potrero.
            </p>
          </div>
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
            <p className="text-sm uppercase tracking-wide text-green-100">¿Listo para continuar?</p>
            <h4 className="text-2xl font-semibold mt-2">Ingresa al panel administrativo</h4>
            <p className="text-white/70 mt-3 text-sm">
              Accede con tu usuario SENA para gestionar animales, tratamientos y reportes.
            </p>
            <Button
              className="mt-6 w-full bg-white text-green-800 hover:bg-green-50"
              onClick={() => navigate('/login')}
            >
              Ir al inicio de sesión
            </Button>
          </div>
        </div>
      </section>

      <Gallery images={galleryImages} />
      <AboutSection />
    </Layout>
  );
};

export default LandingPage;

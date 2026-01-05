import React from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import Header from '@/widgets/dashboard-layout/Header';
import Sidebar from '@/widgets/dashboard-layout/Sidebar';
import HomePage from './home';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-2 sm:px-3 md:px-3 lg:px-3 py-3">
          {/* Mostrar HomePage incluso si no hay usuario para permitir listados públicos y debugging */}
          {!user && (
            <div className="mb-4 p-4 rounded border border-dashed border-red-300 text-sm text-red-700">
              No estás autenticado. Algunas operaciones están deshabilitadas hasta iniciar sesión.
            </div>
          )}
          <HomePage />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
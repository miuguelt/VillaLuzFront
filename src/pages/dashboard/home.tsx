import React from "react";
import { useAuth } from "@/features/auth/model/useAuth";
import AdminHome from './admin/home';
import InstructorHome from './instructor/home';
import ApprenticeHome from './apprentice/home';
import { Role } from "@/app/routes/routeConfig";
import { Loader } from "@/shared/ui/Loader";

const HomePage = () => {
    const { role, loading, isAuthenticated } = useAuth();
    const userRole = role as Role;

    // Estados de carga/validación: evitar fallback prematuro
    if (loading || (isAuthenticated && !userRole)) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader />
                <span>Preparando tu inicio...</span>
            </div>
        );
    }

    console.log('🏠 HomePage - Role actual:', userRole, typeof userRole);

    if (userRole === 'Administrador') {
        return <AdminHome />;
    }
    if (userRole === 'Instructor') {
        return <InstructorHome />;
    }
    if (userRole === 'Aprendiz') {
        return <ApprenticeHome />;
    }
    
    // Fallback si el rol no coincide - mostrar AdminHome por defecto
    console.warn('⚠️ Rol no reconocido, mostrando AdminHome por defecto:', userRole);
    return <AdminHome />;
}

export default HomePage;

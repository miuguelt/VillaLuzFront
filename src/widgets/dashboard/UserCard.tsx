import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Mail, Calendar, MoreVertical, ExternalLink } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface User {
    id: number;
    username: string;
    fullname?: string;
    email?: string;
    role: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt?: string;
    phone?: string;
    address?: string;
}

interface UserCardProps {
    user: User;
    onView?: (user: User) => void;
    onEdit?: (user: User) => void;
    className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onView, className }) => {
    const getRoleColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'administrador':
                return 'destructive';
            case 'instructor':
                return 'default';
            case 'aprendiz':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const getInitials = (name: string) => {
        return name?.charAt(0).toUpperCase() || '?';
    };

    return (
        <Card className={`h-full group hover:shadow-lg transition-all duration-300 border-l-4 ${user.isActive ? 'border-l-green-500' : 'border-l-gray-300'} ${className}`}>
            <CardContent className="p-5 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        {/* Manual Avatar Implementation */}
                        <div className="relative h-12 w-12 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100 flex items-center justify-center bg-primary/10 text-primary font-bold overflow-hidden">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&length=1`}
                                alt={user.username}
                                className="h-full w-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.classList.remove('overflow-hidden');
                                }}
                            />
                            <span className="absolute">{getInitials(user.username)}</span>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg leading-tight text-gray-900 truncate max-w-[150px]" title={user.username}>
                                {user.username}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                                <Badge variant={getRoleColor(user.role) as any} className="text-[10px] h-5 px-1.5 font-medium">
                                    {user.role}
                                </Badge>
                                {!user.isActive && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-gray-500 bg-gray-50 border-gray-200">
                                        Inactivo
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Más opciones"
                                className="h-8 w-8 text-gray-400 hover:text-gray-700"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView?.(user)}>
                                <ExternalLink className="mr-2 h-4 w-4" /> Ver detalles
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-2.5 text-sm text-gray-600 flex-1">
                    <div className="flex items-center gap-2.5 bg-gray-50/50 p-1.5 rounded-md hover:bg-gray-50 transition-colors">
                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="truncate flex-1" title={user.email}>{user.email || 'Sin email'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {user.createdAt && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50/50 p-1.5 rounded-md">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                        )}
                        {user.lastLogin && (
                            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50/50 p-1.5 rounded-md">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span>{new Date(user.lastLogin).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-100 flex justify-end">
                    <Button variant="outline" size="sm" className="w-full text-xs font-medium h-8 bg-transparent hover:bg-gray-50 border-gray-200" onClick={() => onView?.(user)}>
                        Ver Perfil
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

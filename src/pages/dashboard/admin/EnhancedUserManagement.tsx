import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { PageSection } from "@/components/sections/PageSection";
import { Loading } from "@/components/feedback/Loading";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { GenericModal } from "@/components/common/GenericModal";
import { DialogFooter } from "@/components/ui/dialog";

import { useUsers } from "@/hooks/user/useUser";
import type { UserInput, UserResponse } from "@/types/swaggerTypes";
import { UserPlus, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface UserFormData {
  identification: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  role: "Administrador" | "Instructor" | "Aprendiz";
  status: boolean;
  password?: string;
}

// Normaliza distintas representaciones de status a boolean
const isActiveStatus = (status: boolean | string | number | undefined): boolean => {
  if (typeof status === "boolean") return status;
  if (typeof status === "number") return status === 1;
  if (typeof status === "string") {
    const s = status.toLowerCase();
    if (s === "1" || s === "true" || s === "active" || s === "activo") return true;
    if (s === "0" || s === "false" || s === "inactive" || s === "inactivo") return false;
  }
  return false;
};

const EnhancedUserManagement: React.FC = () => {
  const { users, loading, addUser: createItem, editUser: updateItem, deleteUser, error } = useUsers();
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<UserFormData>({
    identification: "",
    fullname: "",
    email: "",
    phone: "",
    address: "",
    role: "Aprendiz",
    status: true,
  });

  const { showToast } = useToast();

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const list = users as UserResponse[];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return list;
    return list.filter((user: UserResponse) => {
      const { fullname, email, identification } = user;
      return (
        (fullname || "").toLowerCase().includes(term) ||
        (email || "").toLowerCase().includes(term) ||
        (identification != null && identification.toString().includes(term))
      );
    });
  }, [users, searchTerm]);

  const resetForm = () => {
    setFormData({
      identification: "",
      fullname: "",
      email: "",
      phone: "",
      address: "",
      role: "Aprendiz",
      status: true,
    });
  };

  const handleCreateUser = async (fd: UserFormData) => {
    try {
      const payload: UserInput = {
        identification: fd.identification,
        fullname: fd.fullname,
        email: fd.email,
        phone: fd.phone || "",
        address: fd.address || "",
        role: fd.role,
        password: fd.password || "",
        status: fd.status,
      };
      await createItem(payload);
      showToast("Usuario creado exitosamente", "success");
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (e) {
      showToast("Error al crear el usuario", "error");
      console.error("Error creating user:", e);
    }
  };

  const handleUpdateUser = async (fd: UserFormData) => {
    if (!selectedUser) return;
    try {
      const payload: Partial<UserInput> = {
        identification: fd.identification,
        fullname: fd.fullname,
        email: fd.email,
        phone: fd.phone,
        address: fd.address,
        role: fd.role,
        status: fd.status,
      };
      if (fd.password && fd.password !== "") payload.password = fd.password;
      await updateItem(selectedUser.id, payload);
      showToast("Usuario actualizado exitosamente", "success");
    } catch (e) {
      showToast("Error al actualizar el usuario", "error");
      console.error("Error updating user:", e);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId);
      showToast("Usuario eliminado exitosamente", "success");
    } catch (e) {
      showToast("Error al eliminar el usuario", "error");
      console.error("Error deleting user:", e);
    }
  };

  const openEditDialog = (user: UserResponse) => {
    setSelectedUser(user);
    setFormData({
      identification: user.identification?.toString() || "",
      fullname: user.fullname || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      role: (user.role as UserFormData["role"]) || "Aprendiz",
      status: isActiveStatus(user.status),
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (user: UserResponse) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Administrador":
        return "destructive";
      case "Instructor":
        return "default";
      case "Aprendiz":
        return "secondary";
      default:
        return "outline";
    }
  };

  const header = (
    <PageHeader
      title="Gestión de Usuarios"
      description="Administra usuarios del sistema"
      actions={
        <Button
          className="flex items-center gap-2"
          onClick={() => setIsCreateDialogOpen(true)}
          aria-label="Nuevo Usuario"
        >
          <UserPlus className="h-4 w-4" /> Nuevo Usuario
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <AppLayout header={header}>
        <Loading label="Cargando usuarios..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout header={header}>
        <ErrorState message="No se pudo cargar" onRetry={() => window.location.reload()} />
      </AppLayout>
    );
  }

  return (
    <AppLayout header={header}>
      <div className="space-y-4">
        <Toolbar
          searchPlaceholder="Buscar por nombre, email o identificación..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          right={
            <Button
              className="flex items-center gap-2"
              onClick={() => setIsCreateDialogOpen(true)}
              aria-label="Nuevo Usuario"
            >
              <UserPlus className="h-4 w-4" /> Nuevo Usuario
            </Button>
          }
        />

        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No hay usuarios"
            description="Crea el primero para comenzar"
            action={
              <Button onClick={() => setIsCreateDialogOpen(true)} aria-label="Nuevo Usuario">
                Nuevo Usuario
              </Button>
            }
          />
        ) : (
          <PageSection>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificación</TableHead>
                  <TableHead className="w-52">Nombre Completo</TableHead>
                  <TableHead className="w-48">Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-200">Rol</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: UserResponse) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.identification}</TableCell>
                    <TableCell>{user.fullname}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={isActiveStatus(user.status) ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {isActiveStatus(user.status) ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <a className="hover:underline" href={`/pilot-profile/?id=${user.id}&tab=settings`}>
                        <Badge
                          variant={getRoleBadgeVariant(user.role)}
                          className="transition-300 hover:scale-[1.02]"
                        >
                          {user.role}
                        </Badge>
                      </a>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Abrir menú de acciones">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openViewDialog(user)} aria-label="Ver detalles">
                            <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(user)} aria-label="Editar">
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteDialogOpen(true);
                            }}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PageSection>
        )}
      </div>

      {/* Modal: Crear */}
      <GenericModal
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Crear Nuevo Usuario"
        size="lg"
        description="Completa la información para crear un nuevo usuario."
        enableBackdropBlur={false}
      >
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="identification" className="text-right">
              Identificación
            </Label>
            <Input
              id="identification"
              value={formData.identification}
              onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese la identificación"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fullname" className="text-right">
              Nombre Completo
            </Label>
            <Input
              id="fullname"
              value={formData.fullname}
              onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese el nombre completo"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese el email"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese el teléfono"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Dirección
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese la dirección"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Rol
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserFormData["role"] })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Instructor">Instructor</SelectItem>
                <SelectItem value="Aprendiz">Aprendiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password || ""}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese la contraseña"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Estado
            </Label>
            <Select
              value={formData.status ? "true" : "false"}
              onValueChange={(value) => setFormData({ ...formData, status: value === "true" })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione el estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => handleCreateUser(formData)} type="submit" aria-label="Crear Usuario">
            Crear Usuario
          </Button>
        </DialogFooter>
      </GenericModal>

      {/* Modal: Editar */}
      <GenericModal
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Editar Usuario"
        size="lg"
        description="Modifica la información del usuario."
        enableBackdropBlur={false}
      >
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_identification" className="text-right">
              Identificación
            </Label>
            <Input
              id="edit_identification"
              value={formData.identification}
              onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese la identificación"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_fullname" className="text-right">
              Nombre Completo
            </Label>
            <Input
              id="edit_fullname"
              value={formData.fullname}
              onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese el nombre completo"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_email" className="text-right">
              Email
            </Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese el email"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_phone" className="text-right">
              Teléfono
            </Label>
            <Input
              id="edit_phone"
              value={formData.phone ?? ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese el teléfono"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_address" className="text-right">
              Dirección
            </Label>
            <Input
              id="edit_address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese la dirección"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_role" className="text-right">
              Rol
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserFormData["role"] })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Instructor">Instructor</SelectItem>
                <SelectItem value="Aprendiz">Aprendiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_password" className="text-right">
              Contraseña
            </Label>
            <Input
              id="edit_password"
              type="password"
              value={formData.password || ""}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="col-span-3"
              placeholder="Ingrese la contraseña"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit_status" className="text-right">
              Estado
            </Label>
            <Select
              value={formData.status ? "true" : "false"}
              onValueChange={(value) => setFormData({ ...formData, status: value === "true" })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione el estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => handleUpdateUser(formData)} type="submit" aria-label="Guardar Cambios">
            Guardar Cambios
          </Button>
        </DialogFooter>
      </GenericModal>

      {/* Modal: Ver */}
      <GenericModal
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        title="Detalles del Usuario"
        size="xl"
        description="Información detallada del usuario seleccionado."
        enableBackdropBlur={false}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Identificación</Label>
                <p className="text-sm">{selectedUser.identification}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nombre Completo</Label>
                <p className="text-sm">{selectedUser.fullname}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-sm">{selectedUser.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                <p className="text-sm">{selectedUser.phone || "No especificado"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Dirección</Label>
                <p className="text-sm">{selectedUser.address || "No especificada"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Rol</Label>
                <Badge variant={getRoleBadgeVariant(selectedUser.role)}>{selectedUser.role}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                <Badge variant={isActiveStatus(selectedUser.status) ? "default" : "secondary"}>
                  {isActiveStatus(selectedUser.status) ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </GenericModal>

      {/* Modal: Eliminar */}
      <GenericModal
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="¿Estás seguro?"
        size="sm"
        description="Esta acción no se puede deshacer. Se eliminará permanentemente el usuario."
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} aria-label="Cancelar eliminación">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (selectedUser) {
                handleDeleteUser(selectedUser.id);
                setIsDeleteDialogOpen(false);
              }
            }}
            aria-label="Confirmar eliminación"
          >
            Eliminar
          </Button>
        </DialogFooter>
      </GenericModal>
    </AppLayout>
  );
};

export default EnhancedUserManagement;

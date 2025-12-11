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
import { UserActionsMenu } from "@/components/dashboard/UserActionsMenu";

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
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
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
    setFormErrors({});
  };

  const setField = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validateCreateForm = (fd: UserFormData): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {};
    if (!fd.identification.trim()) errors.identification = "La identificación es obligatoria.";
    if (!fd.fullname.trim()) errors.fullname = "El nombre completo es obligatorio.";
    if (!fd.email.trim()) errors.email = "El correo es obligatorio.";
    if (!fd.password || !fd.password.trim()) {
      errors.password = "Debes definir una contraseña.";
    } else if (fd.password.trim().length < 4) {
      errors.password = "La contraseña debe tener al menos 4 caracteres.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const mapBackendValidationErrors = (details: any) => {
    if (!details || typeof details !== "object") return;
    const validation = details.validation_errors || details.errors || details;
    if (!validation || typeof validation !== "object") return;

    const map: Record<string, keyof UserFormData> = {
      identification: "identification",
      fullname: "fullname",
      email: "email",
      phone: "phone",
      address: "address",
      role: "role",
      password: "password",
    };

    const newErrors: Partial<Record<keyof UserFormData, string>> = {};
    Object.entries(validation).forEach(([key, val]) => {
      const uiKey = map[key];
      if (!uiKey) return;
      const messages = Array.isArray(val) ? val : [val];
      const msg = messages
        .map((e: any) => (typeof e === "string" ? e : e?.message || e?.detail || e))
        .filter(Boolean)
        .join(" • ");
      if (msg) newErrors[uiKey] = msg;
    });

    if (Object.keys(newErrors).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...newErrors }));
    }
  };

  const handleCreateUser = async (fd: UserFormData) => {
    const identification = fd.identification.trim();
    const fullname = fd.fullname.trim();
    const email = fd.email.trim();
    const password = (fd.password || "").trim();

    if (!validateCreateForm(fd)) {
      showToast("Por favor corrige los campos resaltados.", "warning");
      return;
    }

    try {
      const payload: UserInput = {
        identification,
        fullname,
        email,
        phone: fd.phone?.trim() || "",
        address: fd.address?.trim() || "",
        role: fd.role,
        password,
        password_confirmation: password,
        status: Boolean(fd.status),
      };

      const created = (await createItem(payload)) as any;
      if (!created) {
        throw new Error("La API no confirmó la creación del usuario.");
      }

      const successMessage =
        created?.message || created?.data?.message || "Usuario creado exitosamente";
      showToast(successMessage, "success");
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (e: any) {
      const data = e?.response?.data || e?.data;
      const backendMessage =
        data?.message ||
        data?.detail ||
        data?.error ||
        e?.message ||
        "Error al crear el usuario";

      // Mapear validaciones 422
      if (e?.response?.status === 422 || data?.details?.validation_errors) {
        mapBackendValidationErrors(data?.details || data?.error?.details || data);
        showToast(data?.message || "Errores de validación. Revisa los campos.", "warning");
      }
      // Conflicto 409
      else if (e?.response?.status === 409 && data?.details?.error) {
        showToast(data?.details?.error || backendMessage, "error");
      }
      // Otros errores
      else {
        showToast(backendMessage, "error");
      }
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
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: UserResponse) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.identification}</TableCell>
                    <TableCell className="max-w-xs break-words">{user.fullname}</TableCell>
                    <TableCell className="max-w-xs break-words">{user.email}</TableCell>
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
                      <div className="flex items-center gap-1">
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
                        <UserActionsMenu user={user} />
                      </div>
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
            <div className="col-span-3 space-y-1">
              <Input
                id="identification"
                value={formData.identification}
                onChange={(e) => setField("identification", e.target.value)}
                placeholder="Ingrese la identificación"
                aria-invalid={Boolean(formErrors.identification)}
              />
              {formErrors.identification && (
                <p className="text-xs text-destructive">{formErrors.identification}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fullname" className="text-right">
              Nombre Completo
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="fullname"
                value={formData.fullname}
                onChange={(e) => setField("fullname", e.target.value)}
                placeholder="Ingrese el nombre completo"
                aria-invalid={Boolean(formErrors.fullname)}
              />
              {formErrors.fullname && (
                <p className="text-xs text-destructive">{formErrors.fullname}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="Ingrese el email"
                aria-invalid={Boolean(formErrors.email)}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>
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
            <div className="col-span-3 space-y-1">
              <Input
                id="password"
                type="password"
                value={formData.password || ""}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="Ingrese la contraseña"
                aria-invalid={Boolean(formErrors.password)}
              />
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>
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

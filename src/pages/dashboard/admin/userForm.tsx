import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/types/userTypes";
import { useUsers } from "@/hooks/user/useUser";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface UserFormProps {
  isEdit?: boolean;
  user?: User;
  onSuccess: () => void;
}

const UserForm = ({ isEdit, user, onSuccess }: UserFormProps) => {
  const { createItem, updateItem } = useUsers();

  const [formData, setFormData] = useState<any>({
    fullname: "",
    role: "Aprendiz",
    identification: 0,
    password: "SENA2024",
    email: "",
    phone: "",
    address: "",
    status: 1, // 1 para activo
  });

  useEffect(() => {
    if (isEdit && user) {
  setFormData({ ...user });
    } else {
      setFormData({
        fullname: "",
        role: "Aprendiz",
        identification: 0,
        password: "SENA2024",
        email: "",
        phone: "",
        address: "",
        status: 1, // 1 para activo
      });
    }
  }, [isEdit, user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
  setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (isEdit) {
        if (formData.id !== undefined) {
          await updateItem(formData.id, formData);
        }
      } else {
  await createItem(formData);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-none border-none">
      <CardHeader>
        <h2 className="text-3xl font-bold text-center">
          {isEdit ? "Editar Usuario" : "Agregar Usuario"}
        </h2>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-5">
            <div className="space-y-2">
              <Label htmlFor="fullname" className="text-sm font-medium">
                Nombre Completo
              </Label>
              <Input
                type="text"
                id="fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                required
                className="w-full"
                placeholder="ej: Jhon Mauricio Pérez Torres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                Rol
              </Label>
              <Select
                name="role"
                value={formData.role}
                onValueChange={(value: string) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    role: value as User["role"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione el rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                  <SelectItem value="Instructor">Instructor</SelectItem>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="identification" className="text-sm font-medium">
                Número de Identificación *
              </Label>
              <Input
                type="text"
                id="identification"
                name="identification"
                value={formData.identification.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setFormData((prev: any) => ({
                      ...prev,
                      identification: parseInt(value) || 0,
                    }));
                  }
                }}
                maxLength={10}
                required
                className="w-full"
                placeholder="Ej: 1087635492"
                pattern="\d{1,10}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo Electrónico *
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full"
                placeholder="ejemplo@correo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Número de Teléfono *
              </Label>
              <Input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full"
                placeholder="Ej: 3001234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Dirección
              </Label>
              <Input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full"
                placeholder="Ingrese la dirección"
              />
            </div>
            {isEdit && (
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="status"
                    checked={formData.status === 1}
                    onCheckedChange={(checked) =>
                      setFormData((prev: any) => ({ ...prev, status: checked === true ? 1 : 0 }))
                    }
                  />
                  <Label htmlFor="status">Estado</Label>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-48 m-auto">
            {isEdit ? "Guardar Cambios" : "Agregar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default UserForm;

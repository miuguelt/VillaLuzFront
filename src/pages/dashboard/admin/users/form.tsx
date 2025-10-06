
import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { usersService } from '@/services/userService';
import { Plus, Edit } from 'lucide-react';

type UserRole = 'Administrador' | 'Instructor' | 'Aprendiz';
type UserFormFields = {
  fullname: string;
  identification: number;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
};

export default function UserForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<UserFormFields>();

  useEffect(() => {
    if (id) {
      usersService.getUserById(Number(id)).then((user: any) => {
        setValue('fullname', user.fullname);
        setValue('identification', user.identification);
        setValue('email', user.email);
        setValue('phone', user.phone);
        setValue('role', user.role);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: UserFormFields) => {
    try {
      if (id) {
        await usersService.updateUser(Number(id), data);
      } else {
        // Forzar password como string (ya que el formulario lo valida como requerido)
        const { password, ...rest } = data;
        await usersService.createUser({ ...rest, password: password || '' });
      }
      navigate('/admin/users')
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar usuario';
      alert(msg);
    }
  };

  // Helper para mostrar mensajes de error de react-hook-form
  const renderError = (err: unknown) => {
    if (!err) return null;
    if (typeof err === 'string') return <span>{err}</span>;
    if (typeof err === 'object' && err && 'message' in err) return <span>{(err as FieldError).message}</span>;
    return null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Nombre completo</label>
        <input {...register('fullname', { required: 'El nombre es obligatorio' })} />
        {renderError(errors.fullname)}
      </div>
      <div>
        <label>Identificación</label>
        <input type="number" {...register('identification', { required: 'La identificación es obligatoria', valueAsNumber: true })} />
        {renderError(errors.identification)}
      </div>
      <div>
        <label>Email</label>
        <input type="email" {...register('email', { required: 'El email es obligatorio' })} />
        {renderError(errors.email)}
      </div>
      <div>
        <label>Teléfono</label>
        <input type="tel" {...register('phone', {
          required: 'El teléfono es obligatorio',
          minLength: { value: 7, message: 'El teléfono debe tener al menos 7 dígitos' }
        })} />
        {renderError(errors.phone)}
      </div>
      <div>
        <label>Rol</label>
        <select {...register('role', { required: 'El rol es obligatorio' })}>
          <option value="">Seleccione</option>
          <option value="Administrador">Administrador</option>
          <option value="Instructor">Instructor</option>
          <option value="Aprendiz">Aprendiz</option>
        </select>
        {renderError(errors.role)}
      </div>
      {!id && (
        <div>
          <label>Contraseña</label>
          <input type="password" {...register('password', { required: 'La contraseña es obligatoria' })} />
          {renderError(errors.password)}
        </div>
      )}
      <button type="submit" disabled={isSubmitting} className="flex items-center gap-2" aria-label={id ? 'Actualizar usuario' : 'Crear usuario'}>
        {id ? <><Edit className="h-4 w-4" /> Actualizar usuario</> : <><Plus className="h-4 w-4" /> Crear usuario</>}
      </button>
    </form>
  );
}

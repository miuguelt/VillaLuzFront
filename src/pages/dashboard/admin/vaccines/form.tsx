import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { vaccinesService } from '@/services/vaccinesService';

export type VaccineFormFields = {
  name: string;
};

export default function VaccineForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<VaccineFormFields>();

  useEffect(() => {
    if (id) {
      vaccinesService.getVaccineById(id).then((vaccine: any) => {
        setValue('name', vaccine.name);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: VaccineFormFields) => {
    try {
      if (id) {
        await vaccinesService.updateVaccine(id, { name: data.name });
      } else {
        await vaccinesService.createVaccine({ name: data.name });
      }
      navigate('/admin/vaccines')
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar vacuna';
      alert(msg);
    }
  };

  const renderError = (err: unknown) => {
    if (!err) return null;
    if (typeof err === 'string') return <span>{err}</span>;
    if (typeof err === 'object' && err && 'message' in err) return <span>{(err as FieldError).message}</span>;
    return null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Nombre de la vacuna</label>
        <input {...register('name', { required: 'El nombre es obligatorio' })} />
        {renderError(errors.name)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} vacuna</button>
    </form>
  );
}

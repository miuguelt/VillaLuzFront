import { useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { fieldService } from '@/services/fieldService';

export type FieldFormFields = {
  name: string;
  area: number; // Keep area as number for input
  state: 'Activo' | 'Inactivo';
};

// Map UI state to API state
const mapStateToApi = (state: 'Activo' | 'Inactivo'): 'Disponible' | 'Restringido' => {
  return state === 'Activo' ? 'Disponible' : 'Restringido';
};

export default function FieldForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FieldFormFields>();
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      fieldService.getFieldById(id).then((field: any) => {
        setValue('name', field.name);
        setValue('area', field.area);
        // Map API state to UI state for editing
        setValue('state', field.state === 'Disponible' ? 'Activo' : 'Inactivo');
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: FieldFormFields) => {
    try {
      const payload = {
        name: data.name,
        area: String(data.area), // Convert area to string
        state: mapStateToApi(data.state), // Map state to API-compatible value
      };
      if (id) {
        await fieldService.updateField(id, payload);
        showToast('Campo actualizado correctamente', 'success');
      } else {
        await fieldService.createField(payload);
        showToast('Campo creado correctamente', 'success');
      }
      setTimeout(() => navigate('/admin/fields'), 1000);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar campo';
      showToast(msg, 'error');
    }
  };


  const renderError = (err: unknown) => {
    if (!err) return null;
    if (typeof err === 'string') return <span>{err}</span>;
    if (typeof err === 'object' && err && 'message' in err) return <span>{(err as FieldError).message}</span>;
    return null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Formulario de campo" role="form">
      <div>
        <label htmlFor="field-name">Nombre del campo</label>
        <input id="field-name" {...register('name', { required: 'El nombre es obligatorio' })} />
        {renderError(errors.name)}
      </div>
      <div>
        <label htmlFor="field-area">Área (hectáreas)</label>
        <input id="field-area" type="number" step="0.01" {...register('area', { required: 'El área es obligatoria', valueAsNumber: true, min: { value: 0.01, message: 'Debe ser mayor a 0' } })} />
        {renderError(errors.area)}
      </div>
      <div>
        <label htmlFor="field-state">Estado</label>
        <select id="field-state" {...register('state', { required: 'El estado es obligatorio' })}>
          <option value="">Seleccione</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
        {renderError(errors.state)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} campo</button>
    </form>
  );
}

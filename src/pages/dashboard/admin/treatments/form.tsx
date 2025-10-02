
import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { treatmentsService } from '@/services/treatmentsService';

export type TreatmentFormFields = {
  animal_id: number;
  diagnosis: string;
  treatment_date: string;
  treatment_type?: string;
  // removed duplicate optional alias: treatment_date?: string;
  veterinarian?: string;
  symptoms?: string;
  treatment_plan?: string;
  follow_up_date?: string;
  cost?: number;
  notes?: string;
  status?: 'Iniciado' | 'En progreso' | 'Completado' | 'Suspendido';
};

export default function TreatmentForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<TreatmentFormFields>();

  useEffect(() => {
    if (id) {
      treatmentsService.getTreatmentById(id).then((t: any) => {
        setValue('animal_id', t.animal_id);
        setValue('diagnosis', t.diagnosis);
        setValue('treatment_date', t.treatment_date);
        setValue('treatment_type', t.treatment_type);
        // removed duplicate setValue for treatment_date
        setValue('veterinarian', t.veterinarian);
        setValue('symptoms', t.symptoms);
        setValue('treatment_plan', t.treatment_plan);
        setValue('follow_up_date', t.follow_up_date);
        setValue('cost', t.cost);
        setValue('notes', t.notes);
        setValue('status', t.status);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: TreatmentFormFields) => {
    try {
      if (id) {
        await treatmentsService.updateTreatment(id, data);
      } else {
        await treatmentsService.createTreatment(data);
      }
      // Redirigir a la ruta válida sin el prefijo /dashboard
      navigate('/admin/treatments');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar tratamiento';
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
        <label>ID del animal</label>
        <input type="number" {...register('animal_id', { required: 'El ID del animal es obligatorio', valueAsNumber: true })} />
        {renderError(errors.animal_id)}
      </div>
      <div>
        <label>Diagnóstico</label>
        <input {...register('diagnosis', { required: 'El diagnóstico es obligatorio' })} />
        {renderError(errors.diagnosis)}
      </div>
      <div>
        <label>Fecha de tratamiento</label>
        <input type="date" {...register('treatment_date', { required: 'La fecha es obligatoria' })} />
        {renderError(errors.treatment_date)}
      </div>
      <div>
        <label>Tipo de tratamiento</label>
        <input {...register('treatment_type')} />
        {renderError(errors.treatment_type)}
      </div>
      {/* removed duplicate Fecha de inicio field that was bound to treatment_date again */}
      <div>
        <label>Veterinario</label>
        <input {...register('veterinarian')} />
        {renderError(errors.veterinarian)}
      </div>
      <div>
        <label>Síntomas</label>
        <input {...register('symptoms')} />
        {renderError(errors.symptoms)}
      </div>
      <div>
        <label>Plan de tratamiento</label>
        <textarea {...register('treatment_plan')} />
        {renderError(errors.treatment_plan)}
      </div>
      <div>
        <label>Fecha de seguimiento</label>
        <input type="date" {...register('follow_up_date')} />
        {renderError(errors.follow_up_date)}
      </div>
      <div>
        <label>Costo</label>
        <input type="number" step="0.01" {...register('cost', { valueAsNumber: true })} />
        {renderError(errors.cost)}
      </div>
      <div>
        <label>Notas</label>
        <textarea {...register('notes')} />
        {renderError(errors.notes)}
      </div>
      <div>
        <label>Estado</label>
        <select {...register('status')}>
          <option value="">Seleccionar</option>
          <option value="Iniciado">Iniciado</option>
          <option value="En progreso">En progreso</option>
          <option value="Completado">Completado</option>
          <option value="Suspendido">Suspendido</option>
        </select>
        {renderError(errors.status)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} tratamiento</button>
    </form>
  );
}

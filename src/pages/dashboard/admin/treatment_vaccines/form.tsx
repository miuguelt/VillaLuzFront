import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { treatmentVaccinesService } from '@/services/treatmentVaccinesService';

export type TreatmentVaccineFormFields = {
  treatment_id: number;
  vaccine_id: number;
  dose: string;
  application_site?: string;
  batch_number?: string;
  expiry_date?: string;
  scheduled_date?: string;
  administered_date?: string;
  vaccination_status?: string;
  vaccine_type?: string;
  notes?: string;
};

export default function TreatmentVaccineForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<TreatmentVaccineFormFields>();

  useEffect(() => {
    if (id) {
      treatmentVaccinesService.getTreatmentVaccineById(id).then((tv: any) => {
        setValue('treatment_id', tv.treatment_id);
        setValue('vaccine_id', tv.vaccine_id);
        setValue('dose', tv.dose);
        setValue('application_site', tv.application_site);
        setValue('batch_number', tv.batch_number);
        setValue('expiry_date', tv.expiry_date);
        setValue('scheduled_date', tv.scheduled_date);
        setValue('administered_date', tv.administered_date);
        setValue('vaccination_status', tv.vaccination_status);
        setValue('vaccine_type', tv.vaccine_type);
        setValue('notes', tv.notes);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: TreatmentVaccineFormFields) => {
    try {
      if (id) {
        await treatmentVaccinesService.updateTreatmentVaccine(id, data);
      } else {
        await treatmentVaccinesService.createTreatmentVaccine(data);
      }
      // Redirigir a la ruta válida sin el prefijo /dashboard
      navigate('/admin/treatment_vaccines');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar vacuna de tratamiento';
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
        <label>ID del tratamiento</label>
        <input type="number" {...register('treatment_id', { required: 'El ID del tratamiento es obligatorio', valueAsNumber: true })} />
        {renderError(errors.treatment_id)}
      </div>
      <div>
        <label>ID de la vacuna</label>
        <input type="number" {...register('vaccine_id', { required: 'El ID de la vacuna es obligatorio', valueAsNumber: true })} />
        {renderError(errors.vaccine_id)}
      </div>
      <div>
        <label>Dosis</label>
        <input {...register('dose', { required: 'La dosis es obligatoria' })} />
        {renderError(errors.dose)}
      </div>
      <div>
        <label>Sitio de aplicación</label>
        <input {...register('application_site')} />
        {renderError(errors.application_site)}
      </div>
      <div>
        <label>Lote</label>
        <input {...register('batch_number')} />
        {renderError(errors.batch_number)}
      </div>
      <div>
        <label>Fecha de expiración</label>
        <input type="date" {...register('expiry_date')} />
        {renderError(errors.expiry_date)}
      </div>
      <div>
        <label>Fecha programada</label>
        <input type="date" {...register('scheduled_date')} />
        {renderError(errors.scheduled_date)}
      </div>
      <div>
        <label>Fecha de administración</label>
        <input type="date" {...register('administered_date')} />
        {renderError(errors.administered_date)}
      </div>
      <div>
        <label>Estado de vacunación</label>
        <input {...register('vaccination_status')} />
        {renderError(errors.vaccination_status)}
      </div>
      <div>
        <label>Tipo de vacuna</label>
        <input {...register('vaccine_type')} />
        {renderError(errors.vaccine_type)}
      </div>
      <div>
        <label>Notas</label>
        <textarea {...register('notes')} />
        {renderError(errors.notes)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} vacuna de tratamiento</button>
    </form>
  );
}

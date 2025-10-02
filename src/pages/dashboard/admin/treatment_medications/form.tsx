import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { treatmentMedicationService as treatmentMedicationsService } from '@/services/treatmentMedicationService';

export type TreatmentMedicationFormFields = {
  treatment_id: number;
  medication_id: number;
  dosage: string;
  dosage_amount?: number;
  dosage_unit?: string;
  frequency?: string;
  duration_days?: number;
  administration_route?: string;
  notes?: string;
};

export default function TreatmentMedicationForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<TreatmentMedicationFormFields>();

  useEffect(() => {
    if (id) {
      treatmentMedicationsService.getTreatmentMedicationById(id).then((tm: any) => {
        setValue('treatment_id', tm.treatment_id);
        setValue('medication_id', tm.medication_id);
        setValue('dosage', tm.dosage);
        setValue('dosage_amount', tm.dosage_amount);
        setValue('dosage_unit', tm.dosage_unit);
        setValue('frequency', tm.frequency);
        setValue('duration_days', tm.duration_days);
        setValue('administration_route', tm.administration_route);
        setValue('notes', tm.notes);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: TreatmentMedicationFormFields) => {
    try {
      if (id) {
        await treatmentMedicationsService.updateTreatmentMedication(id, data);
      } else {
        await treatmentMedicationsService.createTreatmentMedication(data);
      }
      // Redirigir a la ruta válida sin el prefijo /dashboard
      navigate('/admin/treatment_medications');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar medicamento de tratamiento';
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
        <label>ID del medicamento</label>
        <input type="number" {...register('medication_id', { required: 'El ID del medicamento es obligatorio', valueAsNumber: true })} />
        {renderError(errors.medication_id)}
      </div>
      <div>
        <label>Dosis</label>
        <input {...register('dosage', { required: 'La dosis es obligatoria' })} />
        {renderError(errors.dosage)}
      </div>
      <div>
        <label>Cantidad de dosis</label>
        <input type="number" step="0.01" {...register('dosage_amount', { valueAsNumber: true })} />
        {renderError(errors.dosage_amount)}
      </div>
      <div>
        <label>Unidad de dosis</label>
        <input {...register('dosage_unit')} />
        {renderError(errors.dosage_unit)}
      </div>
      <div>
        <label>Frecuencia</label>
        <input {...register('frequency')} />
        {renderError(errors.frequency)}
      </div>
      <div>
        <label>Días de duración</label>
        <input type="number" {...register('duration_days', { valueAsNumber: true })} />
        {renderError(errors.duration_days)}
      </div>
      <div>
        <label>Vía de administración</label>
        <input {...register('administration_route')} />
        {renderError(errors.administration_route)}
      </div>
      <div>
        <label>Notas</label>
        <textarea {...register('notes')} />
        {renderError(errors.notes)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} medicamento de tratamiento</button>
    </form>
  );
}

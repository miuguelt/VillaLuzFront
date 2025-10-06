import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { geneticImprovementsService } from '@/services/geneticImprovementsService';
import { getTodayColombia } from '@/utils/dateUtils';

export type GeneticImprovementFormFields = {
  animal_id: number;
  improvement_type: string;
  date: string;
  description?: string;
  expected_result?: string;
};

export default function GeneticImprovementForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<GeneticImprovementFormFields>();

  useEffect(() => {
    if (id) {
      geneticImprovementsService.getGeneticImprovementById(id).then((improvement: any) => {
        setValue('animal_id', improvement.animal_id);
        setValue('improvement_type', improvement.improvement_type);
        setValue('date', improvement.date);
        setValue('description', improvement.description);
        setValue('expected_result', improvement.expected_result);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: GeneticImprovementFormFields) => {
    try {
      if (id) {
        await geneticImprovementsService.updateGeneticImprovement(id, data);
      } else {
        await geneticImprovementsService.createGeneticImprovement(data);
      }
      navigate('/admin/genetic_improvements');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar mejora genética';
      alert(msg);
    }
  };

  const renderError = (err: unknown) => {
    if (!err) return null;
    if (typeof err === 'string') return <span>{err}</span>;
    if (typeof err === 'object' && err && 'message' in err) return <span>{(err as FieldError).message}</span>;
    return null;
  };

  const today = getTodayColombia();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>ID del animal</label>
        <input type="number" {...register('animal_id', { required: 'El ID del animal es obligatorio', valueAsNumber: true })} />
        {renderError(errors.animal_id)}
      </div>
      <div>
        <label>Tipo de mejora</label>
        <input {...register('improvement_type', { required: 'El tipo de mejora es obligatorio' })} />
        {renderError(errors.improvement_type)}
      </div>
      <div>
        <label>Fecha</label>
        <input 
          type="date" 
          max={today}
          {...register('date', { 
            required: 'La fecha es obligatoria',
            validate: value => {
              const improvementDate = new Date(value);
              const todayDate = new Date();
              todayDate.setHours(0, 0, 0, 0);
              return improvementDate <= todayDate || 'La fecha no puede ser futura';
            }
          })} 
        />
        {renderError(errors.date)}
      </div>
      <div>
        <label>Descripción</label>
        <textarea {...register('description')} />
        {renderError(errors.description)}
      </div>
      <div>
        <label>Resultado esperado</label>
        <textarea {...register('expected_result')} />
        {renderError(errors.expected_result)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} mejora genética</button>
    </form>
  );
}
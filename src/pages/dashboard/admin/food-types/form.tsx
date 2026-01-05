import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service';
import { Plus, Edit } from 'lucide-react';

export type FoodTypeFormFields = {
  food_type: string;
};

export default function FoodTypeForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FoodTypeFormFields>();

  useEffect(() => {
    if (id) {
      foodTypesService.getFoodTypeById(id).then((foodType: any) => {
        setValue('food_type', foodType.food_type);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: FoodTypeFormFields) => {
    try {
      if (id) {
        await foodTypesService.updateFoodType(id, { food_type: data.food_type });
      } else {
        await foodTypesService.createFoodType({ food_type: data.food_type });
      }
      navigate('/admin/food-types');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar tipo de alimento';
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
        <label>Nombre del tipo de alimento</label>
        <input {...register('food_type', { required: 'El nombre es obligatorio' })} />
        {renderError(errors.food_type)}
      </div>
      <button type="submit" disabled={isSubmitting} className="flex items-center gap-2" aria-label={id ? 'Actualizar tipo de alimento' : 'Crear tipo de alimento'}>
        {id ? <><Edit className="h-4 w-4" /> Actualizar tipo de alimento</> : <><Plus className="h-4 w-4" /> Crear tipo de alimento</>}
      </button>
    </form>
  );
}

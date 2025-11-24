import React, { useState } from 'react';
import { FoodTypes } from '../../types/foodTypes';
import { Save } from 'lucide-react';
import { getTodayColombia } from '@/utils/dateUtils';

interface FoodTypeFormProps {
  initialData?: Partial<FoodTypes>;
  onSubmit: (data: FoodTypes) => void;
  loading?: boolean;
}

const defaultState: FoodTypes = {
  food_type: '',
  sowing_date: '',
  harvest_date: '',
  area: undefined,
  handlings: '',
  gauges: '',
  description: '',
  name: '',
};

const FoodTypeForm: React.FC<FoodTypeFormProps> = ({ initialData, onSubmit, loading }) => {
  const [form, setForm] = useState<FoodTypes>({ ...defaultState, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Limpiar errores al cambiar el valor
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value === '' ? undefined : Number(value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    const newErrors: Record<string, string> = {};
    const today = getTodayColombia();
    
    // Validar fecha de siembra
    if (form.sowing_date) {
      if (form.sowing_date > today) {
        newErrors.sowing_date = 'La fecha de siembra no puede ser futura';
      }
    }
    
    // Validar fecha de cosecha
    if (form.harvest_date) {
      if (form.harvest_date > today) {
        newErrors.harvest_date = 'La fecha de cosecha no puede ser futura';
      }
      
      // Validar que la fecha de cosecha no sea anterior a la de siembra
      if (form.sowing_date && form.harvest_date < form.sowing_date) {
        newErrors.harvest_date = 'La fecha de cosecha no puede ser anterior a la fecha de siembra';
      }
    }
    
    // Si hay errores, mostrarlos y no enviar el formulario
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit({ ...form, area: form.area === undefined ? undefined : Number(form.area) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto p-4 bg-white rounded shadow">
      <label>
        Nombre (food_type):
        <input
          type="text"
          name="food_type"
          value={form.food_type}
          onChange={handleChange}
          required
          className="input input-bordered w-full"
        />
      </label>
      <label>
        Nombre alternativo (name):
        <input
          type="text"
          name="name"
          value={form.name || ''}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
      </label>
      <label>
        Fecha de siembra (sowing_date):
        <input
          type="date"
          name="sowing_date"
          value={form.sowing_date || ''}
          onChange={handleChange}
          max={getTodayColombia()}
          className={`input input-bordered w-full ${errors.sowing_date ? 'border-red-500' : ''}`}
        />
        {errors.sowing_date && <p className="text-red-500 text-xs mt-1">{errors.sowing_date}</p>}
      </label>
      <label>
        Fecha de cosecha (harvest_date):
        <input
          type="date"
          name="harvest_date"
          value={form.harvest_date || ''}
          onChange={handleChange}
          min={form.sowing_date || undefined}
          max={getTodayColombia()}
          className={`input input-bordered w-full ${errors.harvest_date ? 'border-red-500' : ''}`}
        />
        {errors.harvest_date && <p className="text-red-500 text-xs mt-1">{errors.harvest_date}</p>}
      </label>
      <label>
        Área (m²):
        <input
          type="number"
          name="area"
          value={form.area === undefined ? '' : form.area}
          onChange={handleNumberChange}
          min={0}
          step={0.01}
          className="input input-bordered w-full"
        />
      </label>
      <label>
        Manejos (handlings):
        <textarea
          name="handlings"
          value={form.handlings || ''}
          onChange={handleChange}
          className="textarea textarea-bordered w-full"
        />
      </label>
      <label>
        Descripción (description):
        <textarea
          name="description"
          value={form.description || ''}
          onChange={handleChange}
          className="textarea textarea-bordered w-full"
        />
      </label>
      <label>
        Calibres (gauges):
        <input
          type="text"
          name="gauges"
          value={form.gauges || ''}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
      </label>
      <button
        type="submit"
        className="btn btn-primary mt-2"
        disabled={loading}
        aria-label={loading ? 'Guardando tipo de alimento' : 'Guardar tipo de alimento'}
      >
        {loading ? (
          <>
            <Save className="h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Guardar
          </>
        )}
      </button>
    </form>
  );
};

export default FoodTypeForm;

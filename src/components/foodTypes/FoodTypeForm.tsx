import React, { useState } from 'react';
import { FoodTypes } from '../../types/foodTypes';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value === '' ? undefined : Number(value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          className="input input-bordered w-full"
        />
      </label>
      <label>
        Fecha de cosecha (harvest_date):
        <input
          type="date"
          name="harvest_date"
          value={form.harvest_date || ''}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
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
      >
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
};

export default FoodTypeForm;

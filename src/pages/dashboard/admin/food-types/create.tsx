import React from 'react';
import FoodTypeForm from '@/widgets/food-types/FoodTypeForm';
import { useFoodTypes } from '@/entities/food-type/model/useFoodTypes';

const FoodTypesCreatePage: React.FC = () => {
  const { createItem, loading, error } = useFoodTypes();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Crear nuevo tipo de comida</h2>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      <FoodTypeForm onSubmit={createItem} loading={loading} />
    </div>
  );
};

export default FoodTypesCreatePage;

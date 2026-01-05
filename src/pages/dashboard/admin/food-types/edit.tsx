import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFoodTypes } from '@/entities/food-type/model/useFoodTypes';
import FoodTypeForm from '@/widgets/food-types/FoodTypeForm';
import { FoodTypes } from '@/entities/food-type/model/types';

const FoodTypesEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: foodTypes, updateItem, loading, error } = useFoodTypes();
  const [initialData, setInitialData] = useState<Partial<FoodTypes> | undefined>(undefined);

  useEffect(() => {
    if (id && foodTypes.length > 0) {
      const found = foodTypes.find((ft: FoodTypes) => String(ft.id) === id);
      if (found) setInitialData(found);
    }
  }, [id, foodTypes]);

  const handleSubmit = (data: FoodTypes) => {
    if (!id) return;
    updateItem(Number(id), data);
    navigate('/food-types');
  };

  if (!id) return <div>ID inválido</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Editar tipo de comida</h2>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      {initialData ? (
        <FoodTypeForm initialData={initialData} onSubmit={handleSubmit} loading={loading} />
      ) : (
        <div>Cargando datos...</div>
      )}
    </div>
  );
};

export default FoodTypesEditPage;

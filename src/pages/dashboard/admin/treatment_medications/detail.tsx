import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { treatmentMedicationService as treatmentMedicationsService } from '@/services/treatmentMedicationService';

export default function TreatmentMedicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      treatmentMedicationsService.getTreatmentMedicationById(id).then(setItem).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div>Cargando medicamento de tratamiento...</div>;
  if (!item) return <div>No encontrado</div>;

  return (
    <div>
      <h2>Detalle de Medicamento de Tratamiento</h2>
      <div><b>ID:</b> {item.id}</div>
      <div>
        <b>Tratamiento:</b>{' '}
        {item.treatment_diagnosis ? item.treatment_diagnosis : `ID ${item.treatment_id}`}
        {item.animal_record ? ` · Animal ${item.animal_record}` : ''}
      </div>
      <div><b>Medicamento:</b> {item.medication_name ?? item.medication_id}</div>
      <div><b>Dosis:</b> {item.dosage}</div>
      <div><b>Cantidad:</b> {item.dosage_amount}</div>
      <div><b>Unidad:</b> {item.dosage_unit}</div>
      <div><b>Frecuencia:</b> {item.frequency}</div>
      <div><b>Días duración:</b> {item.duration_days}</div>
      <div><b>Vía administración:</b> {item.administration_route}</div>
      <div><b>Notas:</b> {item.notes}</div>
      <Link to="/admin/treatment_medications">Volver</Link>
    </div>
  );
}

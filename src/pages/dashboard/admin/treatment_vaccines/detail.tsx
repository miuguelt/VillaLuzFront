import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';

export default function TreatmentVaccineDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      treatmentVaccinesService.getTreatmentVaccineById(id).then(setItem).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div>Cargando vacuna de tratamiento...</div>;
  if (!item) return <div>No encontrado</div>;

  return (
    <div>
      <h2>Detalle de Vacuna de Tratamiento</h2>
      <div><b>ID:</b> {item.id}</div>
      <div>
        <b>Tratamiento:</b>{' '}
        {item.treatment_diagnosis ? item.treatment_diagnosis : `ID ${item.treatment_id}`}
        {item.animal_record ? ` · Animal ${item.animal_record}` : ''}
      </div>
      <div><b>Vacuna:</b> {item.vaccine_name ?? item.vaccine_id}</div>
      <div><b>Dosis:</b> {item.dose}</div>
      <div><b>Sitio aplicación:</b> {item.application_site}</div>
      <div><b>Lote:</b> {item.batch_number}</div>
      <div><b>Expiración:</b> {item.expiry_date}</div>
      <div><b>Fecha programada:</b> {item.scheduled_date}</div>
      <div><b>Fecha administración:</b> {item.administered_date}</div>
      <div><b>Estado vacunación:</b> {item.vaccination_status}</div>
      <div><b>Tipo vacuna:</b> {item.vaccine_type}</div>
      <div><b>Notas:</b> {item.notes}</div>
      <Link to="/admin/treatment_vaccines">Volver</Link>
    </div>
  );
}

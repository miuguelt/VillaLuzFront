import { useState, useEffect } from 'react';
import { vaccinationsService } from '@/services/vaccinationsService';
import { Vaccinations } from '@/types/vaccinationsTypes';
import type { VaccinationInput, VaccinationResponse } from '@/types/swaggerTypes';

export const useVaccinations = () => {
  const [vaccinations, setVaccinations] = useState<Vaccinations[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState<boolean>(false);

  const fetchVaccinations = async () => {
    setLoading(true);
    try {
      const data = await vaccinationsService.getAll();
      const normalized: Vaccinations[] = (Array.isArray(data) ? data : []).map(mapVaccinationResponseToLocal);
      setVaccinations(normalized);
    } catch (err) {
      setError('Error al cargar las vacunaciones');
    } finally {
      setLoading(false);
    }
  };

  const addVaccination = async (vaccinationData: Vaccinations) => {
    setLoading(true);
    try {
      const payload: VaccinationInput = {
        animal_id: vaccinationData.animal_id,
        vaccine_id: vaccinationData.vaccine_id,
        vaccination_date: vaccinationData.application_date,
        apprentice_id: vaccinationData.apprentice_id,
        instructor_id: vaccinationData.instructor_id,
      };
      const newVaccination = await vaccinationsService.create(payload as Partial<VaccinationInput>);
      const mapped = mapVaccinationResponseToLocal(newVaccination as VaccinationResponse);
      setVaccinations((prev) => [...prev, mapped]);
      setReload(!reload);
      return mapped;
    } catch (err) {
      setError('Error al agregar la vacunacion');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const editVaccination = async (id: number, vaccinationData: Vaccinations) => {
    setLoading(true);
    try {
      const payload: VaccinationInput = {
        animal_id: vaccinationData.animal_id,
        vaccine_id: vaccinationData.vaccine_id,
        vaccination_date: vaccinationData.application_date,
        apprentice_id: vaccinationData.apprentice_id,
        instructor_id: vaccinationData.instructor_id,
      };
      const updatedVaccination = await vaccinationsService.update(id, payload as Partial<VaccinationInput>);
      const mapped = mapVaccinationResponseToLocal(updatedVaccination as VaccinationResponse);
      setVaccinations((prev) => prev.map((vaccination) => (vaccination.id === id ? mapped : vaccination)));
      setReload(!reload);
      return mapped;
    } catch (err) {
      setError('Error al actualizar la vacunacion');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteVaccination = async (id: number | string): Promise<boolean> => {
    setLoading(true);
    try {
      await vaccinationsService.delete(id);
      setVaccinations((prev) => prev.filter((v) => v.id !== Number(id)));
      setReload(!reload);
      return true;
    } catch (err) {
      setError('Error al eliminar la vacunacion');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccinations();
  }, [reload]);

  // Aliases estandarizados para compatibilidad
  const createItem = (payload: Partial<Vaccinations>) => addVaccination(payload as Vaccinations);
  const updateItem = (id: number | string, payload: Partial<Vaccinations>) => editVaccination(Number(id), payload as Vaccinations);
  const deleteItem = (id: number | string) => deleteVaccination(id);
  const refetch = () => fetchVaccinations();

  return {
    vaccinations,
    data: vaccinations,
    loading,
    error,
    fetchVaccinations,
    addVaccination,
    editVaccination,
    deleteVaccination,
    createItem,
    updateItem,
    deleteItem,
    setData: setVaccinations,
    refetch,
  };
};

function mapVaccinationResponseToLocal(r: VaccinationResponse): Vaccinations {
  return {
    id: r.id,
    animal_id: r.animal_id,
    vaccine_id: r.vaccine_id,
    application_date: r.vaccination_date,
    apprentice_id: r.apprentice_id,
    instructor_id: r.instructor_id || 0,
    animals: undefined,
    vaccines: undefined,
  };
}
 
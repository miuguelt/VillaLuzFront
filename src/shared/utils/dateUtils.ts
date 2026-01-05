/**
 * Funciones de utilidad para manejo de fechas con zona horaria de Colombia
 */

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para la zona horaria de Colombia (America/Bogota)
 * @returns {string} Fecha actual en formato YYYY-MM-DD
 */
export const getTodayColombia = (): string => {
  const now = new Date();
  
  // Opción 1: Usar toLocaleString con zona horaria específica
  const colombiaDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  
  // Formatear a YYYY-MM-DD
  const year = colombiaDate.getFullYear();
  const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(colombiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la fecha y hora actual en formato ISO para la zona horaria de Colombia
 * @returns {string} Fecha y hora actual en formato ISO con zona horaria de Colombia
 */
export const getNowColombiaISO = (): string => {
  const now = new Date();
  
  // Usar toLocaleString con zona horaria específica y luego formatear
  const colombiaDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  
  const year = colombiaDate.getFullYear();
  const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(colombiaDate.getDate()).padStart(2, '0');
  const hours = String(colombiaDate.getHours()).padStart(2, '0');
  const minutes = String(colombiaDate.getMinutes()).padStart(2, '0');
  const seconds = String(colombiaDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Convierte una fecha a formato YYYY-MM-DD en la zona horaria de Colombia
 * @param {Date | string} date - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatDateColombia = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Usar toLocaleString con zona horaria específica
  const colombiaDate = new Date(dateObj.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  
  const year = colombiaDate.getFullYear();
  const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(colombiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Verifica si una fecha es hoy en la zona horaria de Colombia
 * @param {Date | string} date - Fecha a verificar
 * @returns {boolean} True si la fecha es hoy
 */
export const isTodayColombia = (date: Date | string): boolean => {
  const today = getTodayColombia();
  const dateToCheck = formatDateColombia(date);
  return today === dateToCheck;
};
/**
 * Extrae un token JWT de diversas estructuras de datos.
 * Prioriza la extracción desde un objeto, buscando en `data.access_token`, `data.token`, `access_token` o `token`.
 * Si el valor es una cadena, busca y extrae el token si está prefijado con "Bearer ".
 * Si no encuentra un token en estos formatos, devuelve la entrada original si es una cadena, o undefined.
 *
 * @param val - El valor del que se extraerá el token (puede ser un objeto, una cadena, etc.).
 * @returns El token JWT extraído como una cadena, o undefined si no se encuentra.
 */
export const extractJWT = (val: any): string | undefined => {
  if (typeof val === 'object' && val !== null) {
    const data = val.data || val;
    const token = data.access_token || data.token;
    if (token && typeof token === 'string') {
      return token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    }
  }
  if (typeof val === 'string') {
    return val.startsWith('Bearer ') ? val.split(' ')[1] : val;
  }
  return undefined;
};
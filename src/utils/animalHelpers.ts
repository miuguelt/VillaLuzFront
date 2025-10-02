export function getAnimalLabel(animal: any): string {
  if (!animal) return '';
  if (typeof animal === 'string') return animal;
  // Eliminado uso de name para etiquetas
  return animal.record || (animal.identification ? `${animal.identification}` : (animal.id ? `#${animal.id}` : ''));
}

export function normalizeAnimalsForTable(items: any[], path: string = 'animals') {
  if (!Array.isArray(items)) return items;
  return items.map(item => {
    try {
      const a = item?.[path] || {};
      const record = getAnimalLabel(a) || '-';
      return { ...item, [path]: { ...a, record } };
    } catch (e) {
      return item;
    }
  });
}

export default { getAnimalLabel, normalizeAnimalsForTable };

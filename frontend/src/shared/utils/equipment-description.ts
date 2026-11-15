export interface EquipmentNameLike {
  codigo?: string | null;
  descripcion?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
}

/**
 * Construye el nombre completo legible de un equipo combinando su descripción/nombre
 * de producto (ej. "ANDAMIO STANDAR") y su modelo/medida (ej. "1.50MTS X 1.70MTS"),
 * evitando que se muestre únicamente la medida o el modelo incompleto.
 */
export function formatEquipmentFullName(
  eq?: EquipmentNameLike | null,
  options?: {
    fallback?: string | null;
    includeCode?: boolean;
    includeSerial?: boolean;
  },
): string {
  const desc = eq?.descripcion?.trim() || '';
  const rawModel = eq?.modelo?.trim() || '';
  const model = rawModel && rawModel.toUpperCase() !== 'S/M' ? rawModel : '';
  const fallback = options?.fallback?.trim() || 'Equipo';

  let baseName = '';
  if (desc && model) {
    if (desc.toLowerCase().includes(model.toLowerCase())) {
      baseName = desc;
    } else if (model.toLowerCase().includes(desc.toLowerCase())) {
      baseName = model;
    } else {
      baseName = `${desc} · ${model}`;
    }
  } else {
    baseName = desc || model || fallback;
  }

  const codigoTrimmed = eq?.codigo?.trim() || '';
  const hasCodeAlready =
    codigoTrimmed.length > 0 && baseName.includes(`[${codigoTrimmed}]`);
  const codePrefix =
    options?.includeCode && codigoTrimmed && !hasCodeAlready
      ? `[${codigoTrimmed}] `
      : '';

  const serialTrimmed = eq?.numeroSerie?.trim() || '';
  const serialSuffix =
    options?.includeSerial &&
    serialTrimmed &&
    !baseName.includes(serialTrimmed)
      ? ` (S/N: ${serialTrimmed})`
      : '';

  return `${codePrefix}${baseName}${serialSuffix}`;
}

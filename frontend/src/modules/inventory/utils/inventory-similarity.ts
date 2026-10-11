/**
 * Utilidades de similitud léxica, detección anti-duplicados y autogeneración
 * de códigos correlativos para el inventario de maquinaria y equipos.
 */

/**
 * Normaliza una cadena para comparación: convierte a minúsculas,
 * remueve acentos, signos de puntuación innecesarios y normaliza espacios.
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^\w\s]/gi, ' ') // Reemplazar caracteres especiales por espacios
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula el coeficiente de Dice-Sørensen entre dos cadenas (0 a 1).
 * Muy efectivo para detectar variaciones ortográficas ("MESCLADORA" vs "MEZCLADORA").
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) {
    return s1.includes(s2) || s2.includes(s1) ? 0.7 : 0.0;
  }

  // Generar bigramas de caracteres
  const getBigrams = (str: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);

  let intersection = 0;
  for (const [bigram, count1] of bigrams1.entries()) {
    if (bigrams2.has(bigram)) {
      intersection += Math.min(count1, bigrams2.get(bigram)!);
    }
  }

  const totalBigrams = (s1.length - 1) + (s2.length - 1);
  return (2.0 * intersection) / totalBigrams;
}

export interface SimilarProductMatch {
  id: string;
  nombre: string;
  familia?: string;
  marca?: string;
  similarity: number;
}

/**
 * Busca productos similares dentro de una lista de productos existentes.
 * Retorna las coincidencias que superen el umbral dado (por defecto 0.70 o 70%).
 */
export function findSimilarProducts(
  targetName: string,
  existingList: Array<{ id: string; nombre: string; familia?: string; marca?: string }>,
  threshold = 0.70
): SimilarProductMatch[] {
  if (!targetName || targetName.trim().length < 3) return [];

  const normalizedTarget = normalizeText(targetName);
  const matches: SimilarProductMatch[] = [];

  for (const item of existingList) {
    const similarity = calculateSimilarity(targetName, item.nombre);
    const normalizedItem = normalizeText(item.nombre);

    // Si coincide exactamente tras normalizar o tiene similitud >= umbral
    const isExactNormalized = normalizedTarget === normalizedItem;
    const effectiveSimilarity = isExactNormalized ? 1.0 : similarity;

    if (effectiveSimilarity >= threshold || isExactNormalized) {
      matches.push({
        id: item.id,
        nombre: item.nombre,
        familia: item.familia,
        marca: item.marca,
        similarity: Math.round(effectiveSimilarity * 100) / 100,
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Sugiere el siguiente código disponible según la familia o códigos existentes del grupo.
 * Ejemplo: si los códigos son ['01-01', '01-02', '01-16'], sugiere '01-17'.
 * Si el prefijo es '08-' y hay ['08-01', '08-02', '08-03', '08-04'], sugiere '08-05'.
 */
export function suggestNextEquipmentCode(
  existingCodes: string[],
  fallbackPrefix: string = '01'
): string {
  if (!existingCodes || existingCodes.length === 0) {
    return `${fallbackPrefix}-01`;
  }

  // Detectar el prefijo más común en la lista
  const prefixCount = new Map<string, { maxNum: number; padLen: number }>();

  for (const code of existingCodes) {
    if (!code) continue;
    // Buscar patrón tipo "01-15", "08-02", "AND-01", "CUN-100"
    const match = code.match(/^([A-Za-z0-9]+)[-_](\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const num = parseInt(numStr, 10);
      const current = prefixCount.get(prefix) || { maxNum: 0, padLen: numStr.length };
      if (num > current.maxNum) {
        current.maxNum = num;
        current.padLen = Math.max(current.padLen, numStr.length);
      }
      prefixCount.set(prefix, current);
    }
  }

  if (prefixCount.size > 0) {
    // Tomar el prefijo con el número mayor
    let bestPrefix = fallbackPrefix;
    let maxFound = 0;
    let padLength = 2;

    for (const [pfx, data] of prefixCount.entries()) {
      if (data.maxNum >= maxFound) {
        maxFound = data.maxNum;
        bestPrefix = pfx;
        padLength = data.padLen;
      }
    }

    const nextNum = (maxFound + 1).toString().padStart(padLength, '0');
    return `${bestPrefix}-${nextNum}`;
  }

  return `${fallbackPrefix}-${(existingCodes.length + 1).toString().padStart(2, '0')}`;
}

/**
 * Valida si un número de serie ya existe en la lista de equipos registrados.
 */
export function isSerialNumberDuplicate(
  serialNumber: string,
  existingSerials: string[],
  _currentEquipmentId?: string
): boolean {
  if (!serialNumber || !serialNumber.trim()) return false;
  const clean = serialNumber.trim().toUpperCase();
  if (clean === 'S/N' || clean === 'N/A' || clean === 'SN' || clean === 'SIN SERIE') {
    return false; // Valores comodín permitidos solo para no serializados si aplica
  }
  return existingSerials.some((s) => s && s.trim().toUpperCase() === clean);
}

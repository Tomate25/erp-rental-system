import { LIMITS } from '../../../shared/validation/limits';
import { redondear2 } from '../../../shared/validation/dias-horas';
import { parseNumberOrNaN } from '../../../shared/utils/numbers';
import type { DetalleCotizacion, EstadoCotizacion } from '../types/quotation.types';
import { firstQuotationError, validateQuotationPayload } from '../validators/quotation.validator';

const L = LIMITS.cotizacion;

// --- Telefono del cliente ---------------------------------------------------------------------

export interface ClientePhones {
  telMovistar?: string | null;
  telClaro?: string | null;
  telConvencional?: string | null;
  telefono?: string | null;
}

export interface TelefonoCompuesto {
  /** Numeros separados por " / ", sin prefijos, de largo <= `max`. */
  telefono: string;
  /** Numeros del cliente que no cupieron en `max` (se avisan en pantalla, no se pierden en silencio). */
  omitidos: string[];
}

/**
 * Compone el telefono de la cotizacion con SOLO los numeros del cliente (sin "Movistar:", "Claro:", "Conv:"),
 * en el orden Movistar, Claro, Convencional y el telefono general si no esta repetido. El backend limita el
 * campo a 30 caracteres: se agregan numeros mientras quepan y los que no caben se devuelven en `omitidos`.
 */
export function composeClientPhone(cliente: ClientePhones, max: number = L.telefono): TelefonoCompuesto {
  const limpio = (valor?: string | null) => (valor ?? '').trim();
  const candidatos = [cliente.telMovistar, cliente.telClaro, cliente.telConvencional].map(limpio).filter(Boolean);
  const general = limpio(cliente.telefono);
  if (general && !candidatos.some((numero) => numero.includes(general))) candidatos.push(general);

  let telefono = '';
  const omitidos: string[] = [];
  for (const numero of Array.from(new Set(candidatos))) {
    const siguiente = telefono ? `${telefono} / ${numero}` : numero;
    if (siguiente.length <= max) telefono = siguiente;
    else omitidos.push(numero);
  }
  return { telefono, omitidos };
}

// --- Descripcion de linea desde el catalogo ---------------------------------------------------

export interface EquipoDescripcion {
  descripcion?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
}

export interface DescripcionCatalogo {
  descripcion: string;
  /** Largo original cuando hubo que recortar a `max`; `null` si cupo completa. */
  largoOriginal: number | null;
}

/**
 * Descripcion de una linea creada desde el catalogo. El equipo admite hasta 2000 caracteres y la linea de la
 * cotizacion 200: si no cabe se recorta a `max` y se devuelve `largoOriginal` para avisarlo en la linea.
 */
export function buildCatalogDescription(equipo: EquipoDescripcion, max: number = L.item.descripcion): DescripcionCatalogo {
  const serie = equipo.numeroSerie ? ` (Serie: ${equipo.numeroSerie})` : '';
  const completa = equipo.descripcion?.trim()
    ? `${equipo.descripcion.trim()}${equipo.modelo && equipo.modelo !== 'S/M' ? ` · ${equipo.modelo}` : ''}${serie}`
    : `${equipo.modelo || 'Equipo'}${serie}`;
  if (completa.length <= max) return { descripcion: completa, largoOriginal: null };

  let recortada = completa.slice(0, max);
  const ultimo = recortada.charCodeAt(recortada.length - 1);
  if (ultimo >= 0xd800 && ultimo <= 0xdbff) recortada = recortada.slice(0, -1); // no partir un par sustituto
  return { descripcion: recortada.trimEnd(), largoOriginal: completa.length };
}


// --- Duracion al cambiar las fechas de renta ---------------------------------------------------

/**
 * Reescala la duracion de una linea cuando cambian los dias de renta: DIA a entero (minimo 1); HORA a
 * 2 decimales (minimo 0,01), sin perder decimales.
 *
 * Si la duracion actual esta vacia o no es un numero valido ("", "12abc") devuelve `NaN`: NO se inventa un 1.
 * Quien llama debe dejar el valor escrito tal cual (el usuario lo ve y zod lo rechaza al guardar).
 */
export function reescalarDuracion(dias: unknown, esHoraria: boolean, diasNuevos: number, diasPrevios: number): number {
  const actual = parseNumberOrNaN(dias);
  if (!Number.isFinite(actual)) return Number.NaN;
  const escalado = actual * diasNuevos / diasPrevios;
  return esHoraria ? Math.max(0.01, redondear2(escalado)) : Math.max(1, Math.round(escalado));
}

// --- Precios escalonados (Tarifas A, B y C) y Línea Amarilla -----------------------------------

export type NivelPrecio = 'PRECIO_A' | 'PRECIO_B' | 'PRECIO_C';

export interface TierPriceResolutionInput {
  precioDia?: number | null;
  precioDiaB?: number | null;
  precioDiaC?: number | null;
  precioHora?: number | null;
  precioHoraB?: number | null;
  precioHoraC?: number | null;
  tipoTarifa: 'HORA' | 'DIA';
  nivelPrecio: NivelPrecio;
  precioUnitarioActual?: number | null;
}

/**
 * Identifica si un equipo pertenece a Línea Amarilla (cobro primario por HORA).
 */
export function isYellowLineEquipment(itemOrEquipment: any): boolean {
  if (!itemOrEquipment) return false;
  const eq = itemOrEquipment.equipo || itemOrEquipment;
  if (eq.isLineaAmarilla === true) return true;
  if (eq.categoria?.isLineaAmarilla === true) return true;
  if (typeof eq.codigo === 'string' && eq.codigo.trim().startsWith('08-')) return true;
  if (eq.modalidadRenta === 'SOLO_HORA') return true;
  const desc = `${eq.descripcion || ''} ${eq.modelo || ''}`.toUpperCase();
  if (desc.includes('[POR HORA]')) return true;
  return false;
}

/**
 * Resuelve la tarifa unitaria según el nivel tarifario seleccionado (A, B o C) y la unidad (HORA o DÍA).
 * Si no hay tarifa B o C explícita, aplica el descuento estándar de política (15% para B, 25% para C).
 */
export function resolveTierPrice(input: TierPriceResolutionInput): number {
  const isHourly = input.tipoTarifa === 'HORA';
  const pDiaA = Number(input.precioDia) || 0;
  const pHoraA = Number(input.precioHora) || (pDiaA > 0 ? Math.round((pDiaA / 8) * 100) / 100 : 0);

  if (isHourly) {
    const baseH = pHoraA > 0 ? pHoraA : (pDiaA > 0 ? Math.round((pDiaA / 8) * 100) / 100 : 0);
    if (input.nivelPrecio === 'PRECIO_A') {
      return baseH || Number(input.precioUnitarioActual) || 0;
    }
    if (input.nivelPrecio === 'PRECIO_B') {
      const explicitB = Number(input.precioHoraB);
      if (explicitB > 0) return explicitB;
      return baseH > 0 ? Math.round(baseH * 0.85 * 100) / 100 : baseH;
    }
    if (input.nivelPrecio === 'PRECIO_C') {
      const explicitC = Number(input.precioHoraC);
      if (explicitC > 0) return explicitC;
      return baseH > 0 ? Math.round(baseH * 0.75 * 100) / 100 : baseH;
    }
  } else {
    const baseD = pDiaA > 0 ? pDiaA : (pHoraA > 0 ? Math.round(pHoraA * 8 * 100) / 100 : 0);
    if (input.nivelPrecio === 'PRECIO_A') {
      return baseD || Number(input.precioUnitarioActual) || 0;
    }
    if (input.nivelPrecio === 'PRECIO_B') {
      const explicitB = Number(input.precioDiaB);
      if (explicitB > 0) return explicitB;
      return baseD > 0 ? Math.round(baseD * 0.85 * 100) / 100 : baseD;
    }
    if (input.nivelPrecio === 'PRECIO_C') {
      const explicitC = Number(input.precioDiaC);
      if (explicitC > 0) return explicitC;
      return baseD > 0 ? Math.round(baseD * 0.75 * 100) / 100 : baseD;
    }
  }

  return Number(input.precioUnitarioActual) || 0;
}

/**
 * Autoselecciona el nivel de precio según los días de renta.
 * Si se renta > 8 días, asigna PRECIO_B (descuento por volumen).
 * Si la línea ya tiene PRECIO_C (tarifa especial autorizada), no la sobreescribe automáticamente.
 */
export function resolveAutoTier(
  diasCount: number,
  currentTier?: NivelPrecio
): NivelPrecio {
  if (currentTier === 'PRECIO_C') return 'PRECIO_C';
  return diasCount > 8 ? 'PRECIO_B' : 'PRECIO_A';
}

// --- Importe de una linea (solo para mostrar en pantalla) --------------------------------------------

export interface ImporteLinea {
  descuento: number;
  subtotal: number;
}

/**
 * Descuento y subtotal que se muestran en una linea. Es solo para pantalla: lo que se envia es el valor crudo
 * de cada campo y lo valida zod. Si cantidad, duracion o precio estan vacios o no son un numero valido
 * ("12abc"), el importe mostrado es 0: NO se sustituyen por 1 ni por 0 para calcular otro importe, y los campos
 * escritos por el usuario no se modifican.
 */
export function calcularImporteLinea(
  linea: Pick<DetalleCotizacion, 'cantidad' | 'dias' | 'precioUnitario' | 'descuento' | 'tipoDescuento' | 'descuentoInput'>,
  duracion: unknown = linea.dias,
): ImporteLinea {
  const base = parseNumberOrNaN(linea.cantidad) * parseNumberOrNaN(duracion) * parseNumberOrNaN(linea.precioUnitario);
  const valido = (valor: unknown) => {
    const numero = parseNumberOrNaN(valor);
    return Number.isFinite(numero) ? numero : 0;
  };
  const descuento = linea.tipoDescuento === 'PORCENTAJE'
    ? (Number.isFinite(base) ? Math.round(((base * valido(linea.descuentoInput)) / 100) * 100) / 100 : 0)
    : valido(linea.descuento);
  return { descuento, subtotal: Number.isFinite(base) ? Math.max(0, base - descuento) : 0 };
}

// --- Payload de la cotizacion ------------------------------------------------------------------

export interface QuotationFormState {
  clienteId: string;
  proyecto: string;
  atencion: string;
  telefono: string;
  email: string;
  referencia: string;
  condiciones: string;
  /** Valor tal cual esta en el formulario (puede ser NaN): no se sustituye por un valor por defecto. */
  validezDias: number;
  fechaInicioRenta: string;
  fechaFinRenta: string;
  descuento: number;
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoCotizacion;
  asesorId?: string;
  items: DetalleCotizacion[];
}

/**
 * Arma el payload de crear/actualizar cotizacion. NO sustituye valores invalidos por defectos (`dias || 1`,
 * `cantidad || 1`, `validezDias || 15`, ...): lo que el usuario escribio llega crudo a la validacion zod.
 * Los montos se redondean a 2 decimales y el correo vacio se omite (el backend rechaza '').
 */
export function buildQuotationPayload(estado: QuotationFormState) {
  const correo = estado.email.trim();
  return {
    clienteId: estado.clienteId,
    proyecto: estado.proyecto,
    atencion: estado.atencion,
    telefono: estado.telefono,
    email: correo === '' ? undefined : correo,
    referencia: estado.referencia,
    asesorId: estado.asesorId || undefined,
    condiciones: estado.condiciones,
    validezDias: Number(estado.validezDias),
    fechaInicioRenta: `${estado.fechaInicioRenta}T12:00:00.000Z`,
    fechaFinRenta: `${estado.fechaFinRenta}T12:00:00.000Z`,
    descuento: redondear2(estado.descuento),
    subtotal: redondear2(estado.subtotal),
    iva: redondear2(estado.iva),
    total: redondear2(estado.total),
    estado: estado.estado,
    items: estado.items.map((i) => {
      const isHourly = i.tipoCobro === 'POR_HORA' || i.tipoTarifa === 'HORA';
      const duracion = parseNumberOrNaN(i.dias);
      const tipoCobro: 'POR_HORA' | 'POR_DIA' = isHourly ? 'POR_HORA' : 'POR_DIA';
      return {
        equipoId: i.equipoId || undefined,
        descripcion: i.descripcion,
        tipoCobro,
        tipoTarifa: (isHourly ? 'HORA' : 'DIA') as 'HORA' | 'DIA',
        cantidad: parseNumberOrNaN(i.cantidad),
        dias: duracion,
        horas: isHourly ? duracion : undefined,
        precioUnitario: parseNumberOrNaN(i.precioUnitario),
        nivelPrecio: i.nivelPrecio || undefined,
        descuento: redondear2(parseNumberOrNaN(i.descuento)),
        subtotal: redondear2(parseNumberOrNaN(i.subtotal)),
      };
    }),
  };
}

export type PreparedQuotation =
  | { ok: true; payload: ReturnType<typeof buildQuotationPayload> }
  | { ok: false; error: string };

/** Arma y valida el payload: lo que hace `handleSubmit` antes de llamar a la API. */
export function prepareQuotationSubmit(estado: QuotationFormState): PreparedQuotation {
  const payload = buildQuotationPayload(estado);
  const result = validateQuotationPayload(payload);
  return result.success ? { ok: true, payload } : { ok: false, error: firstQuotationError(result.error) };
}

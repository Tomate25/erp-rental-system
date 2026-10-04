import { LIMITS } from '../../../shared/validation/limits';
import { redondear2 } from '../../../shared/validation/dias-horas';
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
 */
export function reescalarDuracion(dias: unknown, esHoraria: boolean, diasNuevos: number, diasPrevios: number): number {
  const escalado = (Number(dias) || 1) * diasNuevos / diasPrevios;
  return esHoraria ? Math.max(0.01, redondear2(escalado)) : Math.max(1, Math.round(escalado));
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
      const duracion = parseFloat(i.dias as any);
      const tipoCobro: 'POR_HORA' | 'POR_DIA' = isHourly ? 'POR_HORA' : 'POR_DIA';
      return {
        equipoId: i.equipoId || undefined,
        descripcion: i.descripcion,
        tipoCobro,
        tipoTarifa: (isHourly ? 'HORA' : 'DIA') as 'HORA' | 'DIA',
        cantidad: parseFloat(i.cantidad as any),
        dias: duracion,
        horas: isHourly ? duracion : undefined,
        precioUnitario: parseFloat(i.precioUnitario as any),
        descuento: redondear2(parseFloat(i.descuento as any)),
        subtotal: redondear2(parseFloat(i.subtotal as any)),
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

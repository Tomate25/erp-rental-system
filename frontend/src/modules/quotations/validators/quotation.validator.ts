import { z } from 'zod';
import { maxLen, money, qty } from '../../../shared/validation/helpers';
import { LIMITS } from '../../../shared/validation/limits';

const L = LIMITS.cotizacion;
const I = L.item;

/**
 * Esquema del payload de crear/actualizar cotizaciones (lo que arma `QuotationForm.handleSubmit`).
 *
 * IMPORTANTE sobre `dias` / `horas` (rangos provisionales, la semantica NO cambia en este esquema):
 * - Linea DIA: `dias` entero de 1 a 3650.
 * - Linea HORA: `dias` y `horas` solo deben ser numeros finitos mayores a 0 (sin tope ni limite de decimales).
 *   El rango final de HORA (0,01 a 87.600 con 2 decimales) se fija en un commit posterior, cuando
 *   el backend migre a Decimal.
 */

const importeCalculado = (label: string, max: number) => money({ max, decimals: null, label });

const horaFinita = (label: string) =>
  z
    .number({ message: `${label} debe ser un número válido` })
    .refine((value) => Number.isFinite(value), { message: `${label} debe ser un número válido` })
    .refine((value) => value > 0, { message: `${label} debe ser mayor a 0` });

const lineaBase = {
  equipoId: z.string().max(I.equipoId, maxLen('El equipo', I.equipoId)).optional(),
  descripcion: z.string({ message: 'La descripción es requerida' }).max(I.descripcion, maxLen('La descripción', I.descripcion)),
  tipoCobro: z.enum(['POR_DIA', 'POR_HORA'], { message: 'El tipo de cobro debe ser POR_DIA o POR_HORA' }),
  cantidad: qty({ min: I.cantidad.min, max: I.cantidad.max, label: 'La cantidad' }),
  precioUnitario: money({ min: I.precioUnitario.min, max: I.precioUnitario.max, decimals: I.precioUnitario.decimales, label: 'El precio unitario' }),
  descuento: importeCalculado('El descuento de la línea', I.descuento.max),
  subtotal: importeCalculado('El subtotal de la línea', I.subtotal.max),
};

const lineaDia = z.object({
  ...lineaBase,
  tipoTarifa: z.literal('DIA'),
  dias: qty({ min: I.dias.min, max: I.dias.max, label: 'La duración en días' }),
});

const lineaHora = z.object({
  ...lineaBase,
  tipoTarifa: z.literal('HORA'),
  dias: horaFinita('La duración de la línea'),
  horas: horaFinita('Las horas de la línea'),
});

export const quotationItemSchema = z.discriminatedUnion('tipoTarifa', [lineaDia, lineaHora], {
  message: 'La tarifa de la línea debe ser DIA u HORA',
});

export const quotationSchema = z.object({
  clienteId: z.string().min(1, { message: 'Debes seleccionar un cliente.' }).max(L.clienteId, maxLen('El cliente', L.clienteId)),
  proyecto: z.string().max(L.proyecto, maxLen('El proyecto', L.proyecto)).optional(),
  atencion: z.string().max(L.atencion, maxLen('La atención', L.atencion)).optional(),
  telefono: z.string().max(L.telefono, maxLen('El teléfono', L.telefono)).optional(),
  email: z.string().max(L.email, maxLen('El correo', L.email)).optional(),
  referencia: z.string().max(L.referencia, maxLen('La referencia', L.referencia)).optional(),
  asesorId: z.string().max(L.asesorId, maxLen('El asesor', L.asesorId)).optional(),
  condiciones: z.string().max(L.condiciones, maxLen('Las condiciones', L.condiciones)).optional(),
  validezDias: z
    .number({ message: 'La validez (días) debe ser un número válido' })
    .int({ message: 'La validez (días) debe ser un número entero' })
    .min(L.validezDias.min, { message: `La validez (días) debe ser al menos ${L.validezDias.min}` })
    .max(L.validezDias.max, { message: `La validez (días) no puede superar ${L.validezDias.max} días` }),
  descuento: importeCalculado('El descuento', L.descuento.max),
  subtotal: importeCalculado('El subtotal', L.subtotal.max),
  iva: importeCalculado('El IVA', L.iva.max),
  total: importeCalculado('El total', L.total.max),
  items: z
    .array(quotationItemSchema)
    .min(1, { message: 'Debes agregar al menos un ítem a la cotización.' })
    .max(L.itemsMax, { message: `La cotización no puede tener más de ${L.itemsMax} líneas` }),
});

export type QuotationPayloadValues = z.infer<typeof quotationSchema>;

/** Valida el payload completo; usar `firstQuotationError` para mostrar el primer problema. */
export const validateQuotationPayload = (input: unknown) => quotationSchema.safeParse(input);

/** Primer mensaje de error; si es de una linea, lo prefija con "Línea N: ". */
export const firstQuotationError = (error: z.ZodError): string => {
  const issue = error.issues[0];
  if (!issue) return 'La cotización no es válida';
  const [raiz, indice] = issue.path;
  return raiz === 'items' && typeof indice === 'number' ? `Línea ${indice + 1}: ${issue.message}` : issue.message;
};

/** Observaciones al devolver una cotizacion al asesor (`notasRevision`): obligatorias, hasta 2000. */
export const notasRevisionSchema = z
  .string()
  .trim()
  .min(1, { message: 'Debes especificar la razón u observación de la devolución.' })
  .max(L.notasRevision, maxLen('La observación', L.notasRevision));

/** Motivo de rechazo desde el enlace publico: de 5 a 1000 caracteres. */
export const motivoRechazoSchema = z
  .string()
  .trim()
  .min(L.rechazo.motivo.min, { message: `Por favor ingrese un motivo detallado de al menos ${L.rechazo.motivo.min} caracteres.` })
  .max(L.rechazo.motivo.max, maxLen('El motivo del rechazo', L.rechazo.motivo.max));

/** Correo de destino al enviar la cotizacion al cliente. */
export const emailDestinoSchema = z
  .string()
  .trim()
  .min(1, { message: 'El cliente no tiene un correo de facturación válido.' })
  .email({ message: 'El correo de destino no es válido' })
  .max(L.envioEmail.emailDestino, maxLen('El correo de destino', L.envioEmail.emailDestino));

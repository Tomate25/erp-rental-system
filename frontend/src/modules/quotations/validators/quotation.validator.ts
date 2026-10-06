import { z } from 'zod';
import { maxLen, money, qty } from '../../../shared/validation/helpers';
import { redondear2, validarDiasHorasLinea } from '../../../shared/validation/dias-horas';
import { LIMITS } from '../../../shared/validation/limits';

const L = LIMITS.cotizacion;
const I = L.item;

/**
 * Esquema del payload de crear/actualizar cotizaciones (lo que arma `buildQuotationPayload`).
 *
 * `dias` / `horas` dependen de la tarifa y siguen exactamente al backend (commit b9ae54b), con sus mismos textos:
 * - Linea DIA: `dias` entero de 1 a 3650; `horas` opcional, de 0 a 87600 con maximo 2 decimales.
 * - Linea HORA: `dias` y `horas` de 0,01 a 87600 con maximo 2 decimales (tolerancia de 1e-6 al ruido de coma flotante).
 * Ver `shared/validation/dias-horas.ts`.
 */

const importeCalculado = (label: string, max: number) => money({ max, decimals: null, label });

const moneda = (value: number): string =>
  `C$ ${value.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Tolerancia de 1 centavo al comparar montos ya redondeados. */
const CENTAVO = 0.005;

const lineaBase = {
  equipoId: z.string().max(I.equipoId, maxLen('El equipo', I.equipoId)).optional(),
  descripcion: z
    .string({ message: 'La descripción es requerida' })
    .max(I.descripcion, { message: `${maxLen('La descripción', I.descripcion).message}; acórtala en esa línea` })
    .trim()
    .min(1, { message: 'La descripción es requerida' }),
  tipoCobro: z.enum(['POR_DIA', 'POR_HORA'], { message: 'El tipo de cobro debe ser POR_DIA o POR_HORA' }),
  tipoTarifa: z.enum(['DIA', 'HORA'], { message: 'La tarifa de la línea debe ser DIA u HORA' }),
  cantidad: qty({ min: I.cantidad.min, max: I.cantidad.max, label: 'La cantidad' }),
  precioUnitario: money({ min: I.precioUnitario.min, max: I.precioUnitario.max, decimals: I.precioUnitario.decimales, label: 'El precio unitario' }),
  nivelPrecio: z.enum(['PRECIO_A', 'PRECIO_B', 'PRECIO_C']).optional(),
  descuento: importeCalculado('El descuento de la línea', I.descuento.max),
  subtotal: importeCalculado('El subtotal de la línea', I.subtotal.max),
  // `dias` y `horas` se validan en el superRefine: sus reglas y textos dependen de la tarifa.
  dias: z.unknown(),
  horas: z.unknown(),
};

export const quotationItemSchema = z.object(lineaBase).superRefine((linea, ctx) => {
  const erroresDiasHoras = validarDiasHorasLinea(linea);
  for (const error of erroresDiasHoras) {
    ctx.addIssue({ code: 'custom', path: [error.campo], message: error.message });
  }
  // El descuento no puede superar el importe de la linea (antes se recortaba en silencio a subtotal 0).
  // Solo se compara si `dias` es valido: con una duracion invalida el error de `dias` ya lo explica.
  if (!erroresDiasHoras.some((e) => e.campo === 'dias') && typeof linea.dias === 'number') {
    const importe = redondear2(linea.cantidad * linea.dias * linea.precioUnitario);
    if (Number.isFinite(importe) && linea.descuento > importe + CENTAVO) {
      ctx.addIssue({
        code: 'custom',
        path: ['descuento'],
        message: `El descuento (${moneda(linea.descuento)}) no puede superar el importe de la línea (${moneda(importe)})`,
      });
    }
  }
});

export const quotationSchema = z
  .object({
    clienteId: z.string().min(1, { message: 'Debes seleccionar un cliente.' }).max(L.clienteId, maxLen('El cliente', L.clienteId)),
    proyecto: z.string().max(L.proyecto, maxLen('El proyecto', L.proyecto)).optional(),
    atencion: z.string().max(L.atencion, maxLen('La atención', L.atencion)).optional(),
    telefono: z.string().max(L.telefono, maxLen('El teléfono', L.telefono)).optional(),
    // Opcional: si esta vacio se omite del payload (el backend rechaza ''); si viene, debe ser un correo valido.
    email: z
      .string()
      .email({ message: 'El correo no es válido' })
      .max(L.email, maxLen('El correo', L.email))
      .optional(),
    referencia: z.string().max(L.referencia, maxLen('La referencia', L.referencia)).optional(),
    asesorId: z.string().max(L.asesorId, maxLen('El asesor', L.asesorId)).optional(),
    condiciones: z
      .string()
      .max(L.condiciones, { message: `${maxLen('Las condiciones', L.condiciones).message.replace('no puede', 'no pueden')}` })
      .optional(),
    // Sin valor por defecto: NaN, 0, vacio o fuera de 1 a 365 es un error visible, no un 15 silencioso.
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
  })
  .superRefine((cotizacion, ctx) => {
    // El descuento global no puede superar el subtotal (antes se recortaba en silencio a 0).
    if (cotizacion.descuento > cotizacion.subtotal + CENTAVO) {
      ctx.addIssue({
        code: 'custom',
        path: ['descuento'],
        message: `El descuento global (${moneda(cotizacion.descuento)}) no puede superar el subtotal (${moneda(cotizacion.subtotal)})`,
      });
    }
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

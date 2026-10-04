import { z } from 'zod';
import { maxLen, money } from '../../../shared/validation/helpers';
import { LIMITS } from '../../../shared/validation/limits';

const L = LIMITS.cliente;

/** Texto opcional con longitud máxima según la tabla de límites del backend. */
const textoOpcional = (label: string, max: number) => z.string().max(max, maxLen(label, max)).optional();

/**
 * El campo del formulario es un `<input type="number">` sin conversión: llega como texto, número, vacío o null.
 * Vacío/null/undefined = sin límite de crédito; cualquier otro valor debe ser un importe válido (0 a 999,999,999.99, 2 decimales).
 */
const limiteCreditoSchema = z.any().superRefine((raw, ctx) => {
  if (raw === '' || raw === null || raw === undefined) return;
  const valor = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN;
  const resultado = money({ min: L.limiteCredito.min, max: L.limiteCredito.max, decimals: L.limiteCredito.decimales, label: 'El límite de crédito' }).safeParse(valor);
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      ctx.addIssue({ code: 'custom', message: issue.message });
    }
  }
});

export const clientSchema = z.object({
  numeroCliente: textoOpcional('El número de cliente', L.numeroCliente),
  nombre: z
    .string()
    .min(1, { message: 'El nombre es requerido' })
    .max(L.nombre, maxLen('El nombre', L.nombre)),
  razonSocial: textoOpcional('La razón social', L.razonSocial),
  rfc: textoOpcional('El RUC', L.rfc),
  cedula: textoOpcional('La cédula', L.cedula),
  direccion: textoOpcional('La dirección', L.direccion),
  emailFacturacion: z
    .string()
    .email({ message: 'El correo no es válido' })
    .max(L.emailFacturacion, maxLen('El correo', L.emailFacturacion))
    .optional()
    .or(z.literal('')),
  telefono: textoOpcional('El teléfono', L.telefono),
  telMovistar: textoOpcional('El teléfono Movistar', L.telMovistar),
  telClaro: textoOpcional('El teléfono Claro', L.telClaro),
  telConvencional: textoOpcional('El teléfono convencional', L.telConvencional),
  vendedor: textoOpcional('El vendedor', L.vendedor),
  limiteCredito: limiteCreditoSchema,
  condicionPago: textoOpcional('La condición de pago', L.condicionPago),
  whatsappHabilitado: z.boolean(),
  whatsappNumero: textoOpcional('El número de WhatsApp', L.whatsappNumero),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

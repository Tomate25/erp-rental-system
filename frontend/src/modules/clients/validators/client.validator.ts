import { z } from 'zod';

export const clientSchema = z.object({
  numeroCliente: z.string().optional(),
  nombre: z.string().min(1, { message: 'El nombre es requerido' }),
  razonSocial: z.string().optional(),
  rfc: z.string().optional(),
  cedula: z.string().optional(),
  direccion: z.string().optional(),
  emailFacturacion: z.string().email({ message: 'El correo no es válido' }).optional().or(z.literal('')),
  telefono: z.string().optional(),
  telMovistar: z.string().optional(),
  telClaro: z.string().optional(),
  telConvencional: z.string().optional(),
  vendedor: z.string().optional(),
  limiteCredito: z.any(),
  condicionPago: z.string().optional(),
  whatsappHabilitado: z.boolean(),
  whatsappNumero: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

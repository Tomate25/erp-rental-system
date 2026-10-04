import { z } from 'zod';
import { maxLen } from '../../../shared/validation/helpers';
import { LIMITS } from '../../../shared/validation/limits';

const L = LIMITS.auth;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'El correo electrónico es requerido' })
    .email({ message: 'El correo electrónico no es válido' })
    .max(L.email, maxLen('El correo electrónico', L.email)),
  password: z
    .string()
    .min(1, { message: 'La contraseña es requerida' })
    .min(L.password.min, { message: `La contraseña debe tener al menos ${L.password.min} caracteres` })
    .max(L.password.max, maxLen('La contraseña', L.password.max)),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

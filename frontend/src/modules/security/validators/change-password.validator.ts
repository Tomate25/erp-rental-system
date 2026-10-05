import { z } from 'zod';
import { maxLen } from '../../../shared/validation/helpers';
import { LIMITS } from '../../../shared/validation/limits';

const L = LIMITS.usuario.cambioPassword;

/**
 * Cambio de contraseña obligatorio (primer ingreso). El mínimo de 8 con complejidad ya existía y no se toca;
 * solo se añaden los máximos del backend (128).
 */
export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, { message: 'La contraseña actual es requerida' })
      .max(L.oldPassword, maxLen('La contraseña actual', L.oldPassword)),
    password: z
      .string()
      .min(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
      .max(L.newPassword.max, maxLen('La nueva contraseña', L.newPassword.max))
      .regex(/[a-z]/, { message: 'Incluye una letra minúscula' })
      .regex(/[A-Z]/, { message: 'Incluye una letra mayúscula' })
      .regex(/\d/, { message: 'Incluye un número' })
      .regex(/[^A-Za-z0-9]/, { message: 'Incluye un carácter especial' }),
    confirmPassword: z
      .string()
      .min(8, { message: 'La confirmación es requerida' })
      .max(L.newPassword.max, maxLen('La confirmación de la contraseña', L.newPassword.max)),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

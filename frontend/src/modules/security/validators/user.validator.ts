import { z } from 'zod';
import { maxLen } from '../../../shared/validation/helpers';
import { LIMITS } from '../../../shared/validation/limits';

const L = LIMITS.usuario;

/**
 * Alta de usuario. La contraseña mínima SIGUE en 6 (el backend aún no confirmó 8);
 * el cambio de contraseña (8 con complejidad) vive en otro formulario y no se toca aquí.
 * `roles` acepta nombres de rol del sistema y los personalizados creados en Seguridad,
 * por eso no se restringe a una lista fija.
 */
export const userSchema = z.object({
  nombre: z
    .string()
    .min(1, { message: 'El nombre es requerido' })
    .max(L.nombre, maxLen('El nombre', L.nombre)),
  apellido: z
    .string()
    .min(1, { message: 'El apellido es requerido' })
    .max(L.apellido, maxLen('El apellido', L.apellido)),
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
  sucursalId: z.string().optional(),
  roles: z
    .array(z.string().min(1).max(L.rol, maxLen('El nombre del rol', L.rol)))
    .min(1, { message: 'Debes seleccionar al menos un rol para el usuario' })
    .max(L.rolesMax, { message: `No puedes asignar más de ${L.rolesMax} roles a un usuario` }),
});

export type UserFormValues = z.infer<typeof userSchema>;

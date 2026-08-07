import { z } from 'zod';

export const userSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es requerido' }),
  apellido: z.string().min(1, { message: 'El apellido es requerido' }),
  email: z
    .string()
    .min(1, { message: 'El correo electrónico es requerido' })
    .email({ message: 'El correo electrónico no es válido' }),
  password: z
    .string()
    .min(1, { message: 'La contraseña es requerida' })
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  sucursalId: z.string().optional(),
  roles: z.array(z.string()).min(1, { message: 'Debes seleccionar al menos un rol para el usuario' }),
});

export type UserFormValues = z.infer<typeof userSchema>;

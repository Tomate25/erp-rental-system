import { describe, expect, it } from 'vitest';
import { userSchema } from './user.validator';
import { loginSchema } from '../../auth/validators/login.validator';
import { SYSTEM_ROLES } from '../constants/roles';

const valido = {
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ana@empresa.com',
  password: 'secreto',
  sucursalId: '',
  roles: ['COMERCIAL'],
};

const mensajes = (schema: typeof userSchema | typeof loginSchema, input: unknown): string[] => {
  const r = schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('userSchema: límites del backend', () => {
  it('acepta un usuario válido', () => {
    expect(userSchema.safeParse(valido).success).toBe(true);
  });

  it('acepta textos justo en el límite', () => {
    expect(userSchema.safeParse({ ...valido, nombre: 'n'.repeat(120), apellido: 'a'.repeat(120), password: 'p'.repeat(128) }).success).toBe(true);
  });

  it('rechaza nombre y apellido demasiado largos', () => {
    expect(mensajes(userSchema, { ...valido, nombre: 'n'.repeat(121) })).toContain('El nombre no puede superar 120 caracteres');
    expect(mensajes(userSchema, { ...valido, apellido: 'a'.repeat(121) })).toContain('El apellido no puede superar 120 caracteres');
  });

  it('rechaza correo de más de 254 caracteres', () => {
    const largo = `${'a'.repeat(250)}@x.com`;
    expect(mensajes(userSchema, { ...valido, email: largo })).toContain('El correo electrónico no puede superar 254 caracteres');
  });

  it('mantiene la contraseña mínima en 6 y añade máximo de 128', () => {
    expect(userSchema.safeParse({ ...valido, password: '123456' }).success).toBe(true);
    expect(mensajes(userSchema, { ...valido, password: '12345' })).toContain('La contraseña debe tener al menos 6 caracteres');
    expect(mensajes(userSchema, { ...valido, password: 'p'.repeat(129) })).toContain('La contraseña no puede superar 128 caracteres');
  });

  it('mantiene requeridos y al menos un rol', () => {
    expect(mensajes(userSchema, { ...valido, nombre: '' })).toContain('El nombre es requerido');
    expect(mensajes(userSchema, { ...valido, email: '' })).toContain('El correo electrónico es requerido');
    expect(mensajes(userSchema, { ...valido, roles: [] })).toContain('Debes seleccionar al menos un rol para el usuario');
  });

  it('limita a 20 roles y 120 caracteres por rol', () => {
    expect(userSchema.safeParse({ ...valido, roles: Array.from({ length: 20 }, (_, i) => `ROL_${i}`) }).success).toBe(true);
    expect(userSchema.safeParse({ ...valido, roles: Array.from({ length: 21 }, (_, i) => `ROL_${i}`) }).success).toBe(false);
    expect(userSchema.safeParse({ ...valido, roles: ['R'.repeat(121)] }).success).toBe(false);
  });
});

describe('loginSchema: límites del backend', () => {
  it('acepta credenciales válidas y mantiene el mínimo de 6', () => {
    expect(loginSchema.safeParse({ email: 'ana@empresa.com', password: '123456' }).success).toBe(true);
    expect(mensajes(loginSchema, { email: 'ana@empresa.com', password: '12345' })).toContain('La contraseña debe tener al menos 6 caracteres');
  });

  it('rechaza correo y contraseña demasiado largos', () => {
    expect(mensajes(loginSchema, { email: `${'a'.repeat(250)}@x.com`, password: '123456' })).toContain('El correo electrónico no puede superar 254 caracteres');
    expect(mensajes(loginSchema, { email: 'ana@empresa.com', password: 'p'.repeat(129) })).toContain('La contraseña no puede superar 128 caracteres');
  });
});

describe('roles reales del sistema', () => {
  it('son exactamente los siete roles vigentes, sin TECNICO ni CLIENTE', () => {
    expect([...SYSTEM_ROLES]).toEqual(['ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION', 'CONTABILIDAD', 'MANTENIMIENTO']);
    expect((SYSTEM_ROLES as readonly string[]).includes('TECNICO')).toBe(false);
    expect((SYSTEM_ROLES as readonly string[]).includes('CLIENTE')).toBe(false);
  });
});

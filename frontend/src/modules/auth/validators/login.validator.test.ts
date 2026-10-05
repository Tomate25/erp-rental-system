import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.validator';

const mensajes = (input: unknown): string[] => {
  const r = loginSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('loginSchema: recorte del correo', () => {
  it('el correo con espacios al inicio y al final pasa y sale recortado', () => {
    const r = loginSchema.safeParse({ email: '  admin@rental.com \t', password: 'secreto1' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('admin@rental.com');
  });

  it('no cambia las mayúsculas del correo', () => {
    const r = loginSchema.safeParse({ email: ' Admin@Rental.com ', password: 'secreto1' });
    expect(r.success && r.data.email).toBe('Admin@Rental.com');
  });

  it('un correo de solo espacios es "requerido"', () => {
    // El formulario muestra el primer mensaje del campo.
    expect(mensajes({ email: '   ', password: 'secreto1' })[0]).toBe('El correo electrónico es requerido');
  });

  it('el límite de 254 se aplica al correo ya recortado', () => {
    const en254 = `${'a'.repeat(248)}@x.com`;
    expect(en254).toHaveLength(254);
    expect(loginSchema.safeParse({ email: ` ${en254} `, password: 'secreto1' }).success).toBe(true);
    expect(mensajes({ email: `${'a'.repeat(249)}@x.com`, password: 'secreto1' })).toContain('El correo electrónico no puede superar 254 caracteres');
  });
});

describe('loginSchema: la contraseña no se recorta', () => {
  it('conserva un espacio al final (y al inicio)', () => {
    const r = loginSchema.safeParse({ email: 'admin@rental.com', password: ' clave123 ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.password).toBe(' clave123 ');
  });

  it('seis espacios cuentan como contraseña de 6 caracteres (el backend los acepta igual)', () => {
    expect(loginSchema.safeParse({ email: 'admin@rental.com', password: '      ' }).success).toBe(true);
  });

  it('mantiene los límites 6 a 128', () => {
    expect(mensajes({ email: 'admin@rental.com', password: '12345' })).toEqual(['La contraseña debe tener al menos 6 caracteres']);
    expect(loginSchema.safeParse({ email: 'admin@rental.com', password: 'p'.repeat(128) }).success).toBe(true);
    expect(mensajes({ email: 'admin@rental.com', password: 'p'.repeat(129) })).toEqual(['La contraseña no puede superar 128 caracteres']);
  });
});
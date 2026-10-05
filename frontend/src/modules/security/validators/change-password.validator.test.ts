import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from './change-password.validator';

const clave = (n: number) => `Aa1!${'x'.repeat(n - 4)}`;

const valido = {
  oldPassword: 'cualquiera',
  password: 'Abcdef1!',
  confirmPassword: 'Abcdef1!',
};

const mensajes = (input: unknown): string[] => {
  const r = changePasswordSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('changePasswordSchema: maximos del backend', () => {
  it('acepta un cambio valido y mantiene el minimo de 8 con complejidad', () => {
    expect(changePasswordSchema.safeParse(valido).success).toBe(true);
    expect(mensajes({ ...valido, password: 'Abc1!xy', confirmPassword: 'Abc1!xy' })).toContain(
      'La nueva contrase\u00f1a debe tener al menos 8 caracteres'
    );
  });

  it('contrase\u00f1a actual: 128 pasa, 129 falla', () => {
    expect(changePasswordSchema.safeParse({ ...valido, oldPassword: 'o'.repeat(128) }).success).toBe(true);
    expect(mensajes({ ...valido, oldPassword: 'o'.repeat(129) })).toContain(
      'La contrase\u00f1a actual no puede superar 128 caracteres'
    );
  });

  it('contrase\u00f1a nueva: 128 pasa, 129 falla', () => {
    expect(changePasswordSchema.safeParse({ ...valido, password: clave(128), confirmPassword: clave(128) }).success).toBe(true);
    expect(mensajes({ ...valido, password: clave(129), confirmPassword: clave(129) })).toContain(
      'La nueva contrase\u00f1a no puede superar 128 caracteres'
    );
  });

  it('confirmacion: 128 pasa, 129 falla', () => {
    expect(mensajes({ ...valido, password: clave(128), confirmPassword: clave(129) })).toContain(
      'La confirmaci\u00f3n de la contrase\u00f1a no puede superar 128 caracteres'
    );
    expect(mensajes({ ...valido, password: clave(128), confirmPassword: clave(128) })).toEqual([]);
  });

  it('mantiene la regla de que ambas contrase\u00f1as coincidan', () => {
    expect(mensajes({ ...valido, confirmPassword: 'Abcdef1?' })).toContain('Las contrase\u00f1as no coinciden');
  });
});
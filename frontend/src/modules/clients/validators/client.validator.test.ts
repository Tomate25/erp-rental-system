import { describe, expect, it } from 'vitest';
import { clientSchema } from './client.validator';

const base = { nombre: 'Constructora Díaz', whatsappHabilitado: false, limiteCredito: null };

const mensajes = (input: unknown): string[] => {
  const r = clientSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('clientSchema: límites del backend', () => {
  it('acepta un cliente mínimo y uno completo', () => {
    expect(clientSchema.safeParse(base).success).toBe(true);
    expect(
      clientSchema.safeParse({
        ...base,
        numeroCliente: 'CLI-0001',
        razonSocial: 'Constructora Díaz S.A.',
        rfc: 'J0310000000000',
        cedula: '001-111286-0060S',
        direccion: 'Km 12 carretera norte',
        emailFacturacion: 'facturas@empresa.com',
        telMovistar: '8888-8888',
        limiteCredito: '50000.50',
      }).success,
    ).toBe(true);
  });

  it('acepta los textos justo en el límite', () => {
    expect(clientSchema.safeParse({ ...base, nombre: 'a'.repeat(200), direccion: 'd'.repeat(300), rfc: 'r'.repeat(30) }).success).toBe(true);
  });

  it('rechaza textos demasiado largos con mensaje en español', () => {
    expect(mensajes({ ...base, nombre: 'a'.repeat(201) })).toContain('El nombre no puede superar 200 caracteres');
    expect(mensajes({ ...base, direccion: 'd'.repeat(301) })).toContain('La dirección no puede superar 300 caracteres');
    expect(mensajes({ ...base, rfc: 'r'.repeat(31) })).toContain('El RUC no puede superar 30 caracteres');
    expect(mensajes({ ...base, cedula: 'c'.repeat(31) })).toContain('La cédula no puede superar 30 caracteres');
    expect(mensajes({ ...base, telClaro: '1'.repeat(31) })).toContain('El teléfono Claro no puede superar 30 caracteres');
    expect(mensajes({ ...base, vendedor: 'v'.repeat(121) })).toContain('El vendedor no puede superar 120 caracteres');
    expect(mensajes({ ...base, condicionPago: 'p'.repeat(121) })).toContain('La condición de pago no puede superar 120 caracteres');
  });

  it('mantiene el nombre requerido y el correo válido', () => {
    expect(mensajes({ ...base, nombre: '' })).toContain('El nombre es requerido');
    expect(mensajes({ ...base, emailFacturacion: 'no-es-correo' })).toContain('El correo no es válido');
    expect(clientSchema.safeParse({ ...base, emailFacturacion: '' }).success).toBe(true);
  });

  it('rechaza un correo de más de 254 caracteres', () => {
    const largo = `${'a'.repeat(250)}@x.com`;
    expect(clientSchema.safeParse({ ...base, emailFacturacion: largo }).success).toBe(false);
  });

  it('acepta límite de crédito vacío, nulo, numérico o texto numérico', () => {
    for (const limiteCredito of [null, undefined, '', 0, '0', 1500, '1500.25', 999999999.99]) {
      expect(clientSchema.safeParse({ ...base, limiteCredito }).success).toBe(true);
    }
  });

  it('rechaza límite de crédito negativo, fuera de rango o con 3 decimales', () => {
    expect(mensajes({ ...base, limiteCredito: '-5' })).toContain('El límite de crédito no puede ser negativo');
    expect(mensajes({ ...base, limiteCredito: 1000000000 }).join(' ')).toContain('El límite de crédito no puede ser mayor a');
    expect(mensajes({ ...base, limiteCredito: '10.123' })).toContain('El límite de crédito admite como máximo 2 decimales');
    expect(mensajes({ ...base, limiteCredito: 'abc' })).toContain('El límite de crédito debe ser un número válido');
  });
});

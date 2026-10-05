import { describe, expect, it } from 'vitest';
import { ROLES_RESERVADOS, SYSTEM_ROLES, esRolReservado } from './roles';

describe('ROLES_RESERVADOS (sincronizada con SYSTEM_ROLES del backend)', () => {
  it('son exactamente los 10 nombres del backend, en su orden', () => {
    expect([...ROLES_RESERVADOS]).toEqual([
      'ADMIN',
      'GERENTE',
      'COMERCIAL',
      'OPERACIONES',
      'FACTURACION',
      'CONTABILIDAD',
      'MANTENIMIENTO',
      'CLIENTE',
      'TECNICO',
      'INVENTARIO',
    ]);
    expect(new Set(ROLES_RESERVADOS).size).toBe(ROLES_RESERVADOS.length);
  });

  it('incluye los 7 roles asignables a usuarios', () => {
    for (const rol of SYSTEM_ROLES) expect(ROLES_RESERVADOS).toContain(rol);
  });
});

describe('esRolReservado', () => {
  it.each(['ADMIN', 'OPERACIONES', 'CLIENTE', 'TECNICO', 'INVENTARIO'])('%s es reservado', (nombre) => {
    expect(esRolReservado(nombre)).toBe(true);
  });

  it('compara recortado y sin distinguir mayúsculas, como el backend', () => {
    expect(esRolReservado('  operaciones ')).toBe(true);
    expect(esRolReservado('Inventario')).toBe(true);
  });

  it.each(['SUPERVISOR', 'OPERACIONES2', 'ADMIN GENERAL', ''])('%j no es reservado', (nombre) => {
    expect(esRolReservado(nombre)).toBe(false);
  });
});
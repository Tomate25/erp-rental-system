import { describe, it, expect } from 'vitest';
import { validateImportRows } from './import-inventory.service';
import type { RawImportRow } from '../types/import-inventory.types';
import type { GroupedProduct } from '../types/grouped-inventory.types';

describe('import-inventory.service', () => {
  const existingProducts: GroupedProduct[] = [
    {
      productoId: 'prod-1',
      nombre: 'Mezcladora 2 sacos CIPSA',
      familia: 'Mezcladoras',
      marca: 'CIPSA',
      tarifa: 'DIA',
      tipoControl: 'SERIALIZADO',
      total: 3,
      porEstado: { DISPONIBLE: 3, ALQUILADO: 0, RESERVADO: 0, EN_REPARACION: 0, BAJA: 0 },
      porcentajeRentado: 0,
      porcentajeOcupacion: 0,
    },
  ];

  const existingEquipments = [
    { codigo: '01-01', numeroSerie: 'SERIE-DB-001' },
    { codigo: '01-02', numeroSerie: 'SERIE-DB-002' },
  ];

  it('marks valid unique rows as VALID_NEW (Green)', () => {
    const rawRows: RawImportRow[] = [
      {
        codigo: '05-01',
        descripcion: 'Vibrador de concreto Honda 5.5HP',
        cantidad: 1,
        tarifa: 'POR DIA',
        tipo: 'Concreto',
        marca: 'Honda',
        modelo: 'GX160',
        serie: 'VIB-HONDA-999',
      },
    ];

    const { summary, rows } = validateImportRows(rawRows, existingProducts, existingEquipments);
    expect(summary.totalRows).toBe(1);
    expect(summary.validNewCount).toBe(1);
    expect(summary.errorCount).toBe(0);
    expect(summary.canCommit).toBe(true);
    expect(rows[0].status).toBe('VALID_NEW');
  });

  it('marks exact match as VALID_EXISTING (Blue)', () => {
    const rawRows: RawImportRow[] = [
      {
        codigo: '01-03',
        descripcion: 'Mezcladora 2 sacos CIPSA',
        cantidad: 1,
        tarifa: 'POR DIA',
        tipo: 'Mezcladoras',
        marca: 'CIPSA',
        modelo: 'Maxi2',
        serie: 'CIPSA-NEW-01',
      },
    ];

    const { summary, rows } = validateImportRows(rawRows, existingProducts, existingEquipments);
    expect(summary.validExistingCount).toBe(1);
    expect(summary.errorCount).toBe(0);
    expect(rows[0].status).toBe('VALID_EXISTING');
    expect(rows[0].matchedProductId).toBe('prod-1');
  });

  it('marks spelling variation as WARNING (Amber)', () => {
    const rawRows: RawImportRow[] = [
      {
        codigo: '01-04',
        descripcion: 'MESCLADORA 2 SACOS CIPSA',
        cantidad: 1,
        tarifa: 'POR DIA',
        tipo: 'Mezcladoras',
        marca: 'CIPSA',
        modelo: 'Estándar',
        serie: 'CIPSA-NEW-02',
      },
    ];

    const { summary, rows } = validateImportRows(rawRows, existingProducts, existingEquipments);
    expect(summary.warningCount).toBe(1);
    expect(rows[0].status).toBe('WARNING');
    expect(rows[0].warnings.length).toBeGreaterThan(0);
  });

  it('flags errors for duplicate serials within the file or DB as ERROR (Red)', () => {
    const rawRows: RawImportRow[] = [
      {
        codigo: '01-05',
        descripcion: 'Compactadora Masalta',
        cantidad: 1,
        tarifa: 'POR DIA',
        tipo: 'Compactación',
        marca: 'Masalta',
        modelo: 'MS60',
        serie: 'SERIE-DB-001', // Ya existe en la base de datos
      },
      {
        codigo: '01-06',
        descripcion: 'Generador 5KW',
        cantidad: 1,
        tarifa: 'POR DIA',
        tipo: 'Generadores',
        marca: 'Yamaha',
        modelo: 'EF5000',
        serie: 'SERIE-FILE-DUP',
      },
      {
        codigo: '01-07',
        descripcion: 'Generador 5KW Extra',
        cantidad: 1,
        tarifa: 'POR DIA',
        tipo: 'Generadores',
        marca: 'Yamaha',
        modelo: 'EF5000',
        serie: 'SERIE-FILE-DUP', // Duplicada dentro del mismo archivo
      },
    ];

    const { summary, rows } = validateImportRows(rawRows, existingProducts, existingEquipments);
    expect(summary.errorCount).toBe(3);
    expect(summary.canCommit).toBe(false);
    expect(rows[0].status).toBe('ERROR');
    expect(rows[0].errors).toContain('La serie "SERIE-DB-001" ya está registrada en la base de datos.');
    expect(rows[1].status).toBe('ERROR');
    expect(rows[1].errors).toContain('La serie "SERIE-FILE-DUP" está duplicada dentro del archivo.');
    expect(rows[2].status).toBe('ERROR');
  });

  it('flags errors for invalid tariff and non-positive quantity', () => {
    const rawRows: RawImportRow[] = [
      {
        codigo: '01-08',
        descripcion: 'Andamio',
        cantidad: -5, // Inválido
        tarifa: 'POR SEMANA', // Inválido
        tipo: 'Andamios',
      },
    ];

    const { summary, rows } = validateImportRows(rawRows, existingProducts, existingEquipments);
    expect(summary.errorCount).toBe(1);
    expect(summary.canCommit).toBe(false);
    expect(rows[0].errors.some((e) => e.includes('cantidad'))).toBe(true);
    expect(rows[0].errors.some((e) => e.includes('Tarifa'))).toBe(true);
  });
});

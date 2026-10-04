import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Contract } from '../../operations/services/operations.api';
import { ContractPrintView } from './ContractPrintView';

const contrato = (dias: unknown): Contract =>
  ({
    codigo: 'CTR-1',
    fechaInicio: '2026-10-05T12:00:00.000Z',
    fechaFin: '2026-10-08T12:00:00.000Z',
    cliente: { nombre: 'Constructora Norte' },
    items: [{ id: 'i1', cantidad: 1, precioRenta: 1000, dias, equipo: { modelo: 'Retroexcavadora', numeroSerie: 'SN1' } }],
  }) as unknown as Contract;

const html = (dias: unknown) => renderToStaticMarkup(<ContractPrintView contract={contrato(dias)} onBack={() => undefined} />);

describe('ContractPrintView: duracion de la linea', () => {
  it('con una duracion valida calcula el total y no muestra aviso', () => {
    const salida = html(2);
    expect(salida).not.toContain('role="alert"');
    expect(salida).toContain('C$ 2,000.00'); // 1 x 1000 x 2 dias
    expect(salida).toContain('C$ 2,300.00'); // + 15 % de IVA
  });

  it.each([[0], [Number.NaN], ['abc'], [null], [undefined]])(
    'con dias = %j muestra un aviso visible y NO calcula el total con 1',
    (dias) => {
      const salida = html(dias);
      expect(salida).toContain('role="alert"');
      expect(salida).toContain('no se puede calcular el total');
      expect(salida).toContain('Sin duración válida');
      // la tarifa (C$ 1,000.00 / día) sí se muestra; lo que no debe aparecer es un importe calculado con 1 día
      expect(salida).not.toMatch(/>C\$ 1,000\.00</);
      expect(salida).not.toMatch(/>C\$ 1,150\.00</);
      expect(salida).toContain('>—<');
    }
  );
});
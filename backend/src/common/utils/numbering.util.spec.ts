import {
  nextContractCode,
  nextQuoteNumber,
  nextSequenceValue,
  SECUENCIA_GLOBAL,
} from './numbering.util';

/** Simula el UPSERT atómico de Prisma sobre la clave única (empresaId, tipo). */
function crearTxFalso() {
  const filas = new Map<string, number>();
  const upsert = jest.fn(async ({ where, create, update }: any) => {
    const { empresaId, tipo } = where.empresaId_tipo;
    // El "await" cede el turno para forzar intercalado entre llamadas concurrentes;
    // el cuerpo posterior es síncrono, como la operación atómica en la BD.
    await Promise.resolve();
    const clave = `${empresaId}|${tipo}`;
    const actual = filas.get(clave);
    const nuevo =
      actual === undefined ? create.ultimoValor : actual + update.ultimoValor.increment;
    filas.set(clave, nuevo);
    return { ultimoValor: nuevo };
  });
  return { tx: { secuenciaNumeracion: { upsert } } as any, upsert, filas };
}

describe('numbering.util', () => {
  it('cotizaciones: cada empresa lleva su propia secuencia COT-0001...', async () => {
    const { tx } = crearTxFalso();
    expect(await nextQuoteNumber(tx, 'empresa-a')).toBe('COT-0001');
    expect(await nextQuoteNumber(tx, 'empresa-a')).toBe('COT-0002');
    expect(await nextQuoteNumber(tx, 'empresa-b')).toBe('COT-0001');
    expect(await nextQuoteNumber(tx, 'empresa-a')).toBe('COT-0003');
  });

  it('usa la clave única (empresaId, tipo) con increment atómico', async () => {
    const { tx, upsert } = crearTxFalso();
    await nextQuoteNumber(tx, 'empresa-a');
    expect(upsert).toHaveBeenCalledWith({
      where: { empresaId_tipo: { empresaId: 'empresa-a', tipo: 'COTIZACION' } },
      create: { empresaId: 'empresa-a', tipo: 'COTIZACION', ultimoValor: 1 },
      update: { ultimoValor: { increment: 1 } },
      select: { ultimoValor: true },
    });
  });

  it('sin condición de carrera: 50 solicitudes concurrentes no repiten número', async () => {
    const { tx } = crearTxFalso();
    const numeros = await Promise.all(
      Array.from({ length: 50 }, () => nextQuoteNumber(tx, 'empresa-a')),
    );
    expect(new Set(numeros).size).toBe(50);
    expect(numeros).toContain('COT-0050');
  });

  it('contratos: contador global por año, formato CTR-AAAA-NNNN y reinicio por año', async () => {
    const { tx, upsert } = crearTxFalso();
    expect(await nextContractCode(tx, 2026)).toBe('CTR-2026-0001');
    expect(await nextContractCode(tx, 2026)).toBe('CTR-2026-0002');
    expect(await nextContractCode(tx, 2027)).toBe('CTR-2027-0001');
    expect(upsert.mock.calls[0][0].where.empresaId_tipo).toEqual({
      empresaId: SECUENCIA_GLOBAL,
      tipo: 'CONTRATO:2026',
    });
  });

  it('contratos concurrentes no generan códigos duplicados', async () => {
    const { tx } = crearTxFalso();
    const codigos = await Promise.all(
      Array.from({ length: 30 }, () => nextContractCode(tx, 2026)),
    );
    expect(new Set(codigos).size).toBe(30);
  });

  it('nextSequenceValue devuelve el valor del upsert', async () => {
    const { tx } = crearTxFalso();
    expect(await nextSequenceValue(tx, 'x', 'T')).toBe(1);
    expect(await nextSequenceValue(tx, 'x', 'T')).toBe(2);
  });
});
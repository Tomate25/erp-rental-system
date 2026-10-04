import type { Prisma } from '@prisma/client';

/** Clave de empresa para contadores compartidos por todos los tenants. */
export const SECUENCIA_GLOBAL = 'GLOBAL';

type SequenceClient = Pick<Prisma.TransactionClient, 'secuenciaNumeracion'>;

/**
 * Incrementa y devuelve el siguiente valor de una secuencia de forma atómica.
 *
 * Usa un UPSERT de un solo statement (INSERT .. ON CONFLICT DO UPDATE de
 * Prisma) sobre la clave única (empresaId, tipo): el bloqueo de fila que toma
 * el UPDATE se mantiene hasta el commit de la transacción, por lo que dos
 * transacciones concurrentes nunca obtienen el mismo número. DEBE ejecutarse
 * dentro de la misma transacción que crea el documento.
 */
export async function nextSequenceValue(
  tx: SequenceClient,
  empresaId: string,
  tipo: string,
): Promise<number> {
  const fila = await tx.secuenciaNumeracion.upsert({
    where: { empresaId_tipo: { empresaId, tipo } },
    create: { empresaId, tipo, ultimoValor: 1 },
    update: { ultimoValor: { increment: 1 } },
    select: { ultimoValor: true },
  });
  return fila.ultimoValor;
}

/** COT-0001, por empresa. */
export async function nextQuoteNumber(
  tx: SequenceClient,
  empresaId: string,
): Promise<string> {
  const n = await nextSequenceValue(tx, empresaId, 'COTIZACION');
  return `COT-${n.toString().padStart(4, '0')}`;
}

/**
 * CTR-2026-0001. Contador global por año: `Contrato.codigo` es UNIQUE en toda
 * la base y `Contrato` no tiene empresaId, así que un contador por empresa
 * produciría códigos duplicados entre tenants.
 */
export async function nextContractCode(
  tx: SequenceClient,
  year: number = new Date().getFullYear(),
): Promise<string> {
  const n = await nextSequenceValue(tx, SECUENCIA_GLOBAL, `CONTRATO:${year}`);
  return `CTR-${year}-${n.toString().padStart(4, '0')}`;
}
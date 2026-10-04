import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { toNumberHoras } from '../utils/decimal.util';

/**
 * Tras la migracion dias/horas Int -> Decimal(10,2) Prisma devuelve esas dos
 * columnas como Decimal, que JSON.stringify serializa como TEXTO ("1" / "1.00").
 * El front compara `item.dias === 1`, que con texto da false.
 *
 * Este interceptor global recorre la respuesta y convierte a number SOLO las
 * claves exactas `dias` y `horas` cuando su valor es un Decimal. No toca
 * importes ni `horasPactadas` / `horasPorDia` ni ninguna otra clave.
 *
 * Garantias:
 *  - Devuelve una COPIA: el resultado de Prisma (y lo que el servicio conserve)
 *    no se muta.
 *  - Solo recorre arrays y objetos planos; Date, Buffer, Decimal (en otras
 *    claves), streams, etc. se conservan por referencia.
 *  - Es seguro ante referencias circulares (WeakMap) y conserva los
 *    compartidos (el mismo objeto referenciado dos veces se copia una vez).
 */
const CLAVES_NUMERICAS = new Set(['dias', 'horas']);

function esObjetoPlano(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function copiar(value: unknown, vistos: WeakMap<object, unknown>): unknown {
  if (typeof value !== 'object' || value === null) return value;

  const previo = vistos.get(value);
  if (previo !== undefined) return previo;

  if (Array.isArray(value)) {
    const copia: unknown[] = new Array<unknown>(value.length);
    vistos.set(value, copia);
    for (let i = 0; i < value.length; i++) {
      copia[i] = copiar(value[i], vistos);
    }
    return copia;
  }

  if (!esObjetoPlano(value)) return value;

  const origen = value as Record<string, unknown>;
  const copia: Record<string, unknown> = Object.create(
    Object.getPrototypeOf(value) as object | null,
  ) as Record<string, unknown>;
  vistos.set(value, copia);
  for (const clave of Object.keys(origen)) {
    const valor = origen[clave];
    copia[clave] =
      CLAVES_NUMERICAS.has(clave) && Prisma.Decimal.isDecimal(valor)
        ? toNumberHoras(valor as Prisma.Decimal)
        : copiar(valor, vistos);
  }
  return copia;
}

/** Copia `value` convirtiendo a number las claves `dias`/`horas` que sean Decimal. */
export function serializeDiasHoras<T>(value: T): T {
  return copiar(value, new WeakMap<object, unknown>()) as T;
}

@Injectable()
export class DiasHorasInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => serializeDiasHoras(data)));
  }
}

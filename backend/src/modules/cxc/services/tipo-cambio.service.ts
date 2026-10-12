import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateTipoCambioDto } from '../dto/update-tipo-cambio.dto';

@Injectable()
export class TipoCambioService {
  private readonly logger = new Logger(TipoCambioService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la tasa oficial de cambio del BCN para la fecha solicitada o el día de hoy.
   * Si no existe un registro para hoy, devuelve la tasa más reciente disponible indicando que es estimada.
   */
  async getTipoCambioHoy(fechaDeseada?: string): Promise<{
    fecha: string;
    tasa: number;
    fuente: string;
    esOficialHoy: boolean;
    avisoFaltaTasa: boolean;
  }> {
    const hoyStr = fechaDeseada
      ? fechaDeseada.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const fechaObj = new Date(hoyStr);

    const tcDirecto = await this.prisma.tipoCambioBcn.findUnique({
      where: { fecha: fechaObj },
    });

    if (tcDirecto) {
      return {
        fecha: hoyStr,
        tasa: Number(tcDirecto.tasa),
        fuente: tcDirecto.fuente,
        esOficialHoy: true,
        avisoFaltaTasa: false,
      };
    }

    // Si falta la tasa del día, buscar la tasa más reciente
    const tcReciente = await this.prisma.tipoCambioBcn.findFirst({
      orderBy: { fecha: 'desc' },
    });

    const tasaFinal = tcReciente ? Number(tcReciente.tasa) : 36.6243;
    const fechaFinal = tcReciente
      ? tcReciente.fecha.toISOString().slice(0, 10)
      : hoyStr;

    return {
      fecha: fechaFinal,
      tasa: tasaFinal,
      fuente: tcReciente?.fuente || 'BCN (Referencial)',
      esOficialHoy: false,
      avisoFaltaTasa: true,
    };
  }

  /**
   * Registra o actualiza la tasa oficial de cambio para una fecha determinada.
   */
  async setTipoCambio(dto: UpdateTipoCambioDto) {
    const fechaObj = new Date(dto.fecha.slice(0, 10));
    return this.prisma.tipoCambioBcn.upsert({
      where: { fecha: fechaObj },
      create: {
        fecha: fechaObj,
        tasa: dto.tasa,
        fuente: dto.fuente || 'BCN',
      },
      update: {
        tasa: dto.tasa,
        fuente: dto.fuente || 'BCN',
      },
    });
  }

  /**
   * Convierte un monto de C$ a US$ o viceversa según la tasa indicada o del día.
   */
  convertir(
    monto: number,
    monedaOrigen: string,
    monedaDestino: string,
    tasa: number
  ): number {
    if (monedaOrigen === monedaDestino || monto === 0) return monto;
    if (monedaOrigen === 'NIO' && monedaDestino === 'USD') {
      return Math.round((monto / tasa) * 100) / 100;
    }
    if (monedaOrigen === 'USD' && monedaDestino === 'NIO') {
      return Math.round(monto * tasa * 100) / 100;
    }
    return monto;
  }

  async obtenerTasaDelDia(fecha?: Date | string): Promise<number> {
    const fechaStr = fecha instanceof Date ? fecha.toISOString().slice(0, 10) : fecha;
    const res = await this.getTipoCambioHoy(fechaStr);
    return res.tasa;
  }

  async registrarTasa(fecha: string, tasa: number, fuente?: string) {
    return this.setTipoCambio({ fecha, tasa, fuente });
  }
}

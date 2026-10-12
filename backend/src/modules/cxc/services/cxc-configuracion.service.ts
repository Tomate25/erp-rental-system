import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateCxcConfigDto } from '../dto/update-cxc-config.dto';

@Injectable()
export class CxcConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la configuración de CxC para la empresa, sembrando la predeterminada si no existe.
   */
  async getConfiguracion(empresaId: string) {
    let config = await this.prisma.cxcConfiguracion.findUnique({
      where: { empresaId },
    });

    if (!config) {
      config = await this.prisma.cxcConfiguracion.create({
        data: {
          empresaId,
        },
      });
    }

    return config;
  }

  /**
   * Actualiza los parámetros configurables de CxC (reglas con ❓).
   */
  async updateConfiguracion(empresaId: string, dto: UpdateCxcConfigDto) {
    const data: any = { ...dto };
    if (dto.tramosAntiguedadJson) {
      data.tramosAntiguedadJson = dto.tramosAntiguedadJson;
    }

    return this.prisma.cxcConfiguracion.upsert({
      where: { empresaId },
      create: {
        empresaId,
        ...data,
      },
      update: data,
    });
  }

  async obtenerConfiguracion(empresaId: string) {
    return this.getConfiguracion(empresaId);
  }

  async actualizarConfiguracion(empresaId: string, dto: UpdateCxcConfigDto) {
    return this.updateConfiguracion(empresaId, dto);
  }
}

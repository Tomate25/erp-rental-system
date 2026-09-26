import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditoriaService } from '../services/auditoria.service';
import { QueryAuditoriaDto } from '../dto/query-auditoria.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  /**
   * Endpoint de consulta paginada y filtrada exclusivo para usuarios con rol ADMIN.
   * Filtra mandatoriamente por el empresaId del token JWT activo (aislamiento multi-tenant).
   */
  @Get()
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @Query() query: QueryAuditoriaDto,
  ) {
    const data = await this.auditoriaService.findAll(empresaId, query);
    return {
      success: true,
      data,
    };
  }

  /**
   * Obtiene un registro puntual de auditoría forense comprobando propiedad tenant.
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.auditoriaService.findById(empresaId, id);
    return {
      success: true,
      data,
    };
  }
}

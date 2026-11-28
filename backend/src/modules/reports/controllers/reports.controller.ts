import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { ReportsService } from '../services/reports.service';
import { DocumentVoidingService } from '../services/document-voiding.service';
import {
  ExecuteVoidingDto,
  ReportFilterQueryDto,
  ReportType,
  TipoDocumentoAnulable,
  VoidingListQueryDto,
} from '../dto/reports.dto';

const ROLES_REPORTES = [
  'ADMIN',
  'GERENTE',
  'CONTABILIDAD',
  'AUDITOR',
  'FACTURACION',
  'OPERACIONES',
  'COMERCIAL',
  'RRHH',
];

const ROLES_ANULACION = ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION'];

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly voidingService: DocumentVoidingService,
  ) {}

  @Get('catalog')
  @Roles(...ROLES_REPORTES)
  async getCatalog(@GetUser('empresaId') empresaId: string) {
    const data = await this.reportsService.getCatalogoReportes(empresaId);
    return { success: true, data };
  }

  @Get('consolidated')
  @Roles(...ROLES_REPORTES)
  async getConsolidated(
    @GetUser('empresaId') empresaId: string,
    @Query() query: ReportFilterQueryDto,
  ) {
    const data = await this.reportsService.getReporteConsolidado(
      empresaId,
      query,
    );
    return { success: true, data };
  }

  @Get('data/:tipo')
  @Roles(...ROLES_REPORTES)
  async getReportData(
    @GetUser('empresaId') empresaId: string,
    @Param('tipo', new ParseEnumPipe(ReportType)) tipo: ReportType,
    @Query() query: ReportFilterQueryDto,
  ) {
    const data = await this.reportsService.getReportePorTipo(
      empresaId,
      tipo,
      query,
    );
    return { success: true, data };
  }

  // --- ANULACIÓN DE DOCUMENTOS E IMPACTO INVENTARIO / CONTABILIDAD ---

  @Get('voiding/matrix')
  @Roles(...ROLES_REPORTES)
  getVoidingMatrix() {
    const data = this.voidingService.getMatrizComportamientoAnulaciones();
    return { success: true, data };
  }

  @Get('voiding/documents')
  @Roles(...ROLES_REPORTES)
  async listVoidableDocuments(
    @GetUser('empresaId') empresaId: string,
    @Query() query: VoidingListQueryDto,
  ) {
    const data = await this.voidingService.listarDocumentosAnulables(
      empresaId,
      query,
    );
    return { success: true, data };
  }

  @Get('voiding/preview/:tipoDocumento/:documentoId')
  @Roles(...ROLES_REPORTES)
  async previewVoiding(
    @GetUser('empresaId') empresaId: string,
    @Param('tipoDocumento', new ParseEnumPipe(TipoDocumentoAnulable))
    tipoDocumento: TipoDocumentoAnulable,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
  ) {
    const data = await this.voidingService.previsualizarAnulacion(
      empresaId,
      tipoDocumento,
      documentoId,
    );
    return { success: true, data };
  }

  @Post('voiding/execute')
  @Roles(...ROLES_ANULACION)
  async executeVoiding(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @GetUser() user: any,
    @Body() dto: ExecuteVoidingDto,
    @Req() req: Request,
  ) {
    const data = await this.voidingService.ejecutarAnulacion(
      empresaId,
      dto,
      usuarioId,
      user,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
    return { success: true, data };
  }

  @Get('voiding/history')
  @Roles(...ROLES_REPORTES)
  async getVoidingHistory(
    @GetUser('empresaId') empresaId: string,
    @Query() query: VoidingListQueryDto,
  ) {
    const data = await this.voidingService.getHistorialAnulaciones(
      empresaId,
      query,
    );
    return { success: true, data };
  }
}

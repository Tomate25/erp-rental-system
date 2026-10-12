import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CxcController } from './controllers/cxc.controller';
import { CxcAntiguedadService } from './services/cxc-antiguedad.service';
import { CxcEstadoCuentaService } from './services/cxc-estado-cuenta.service';
import { CxcRecibosService } from './services/cxc-recibos.service';
import { CxcArreglosService } from './services/cxc-arreglos.service';
import { CxcNotasService } from './services/cxc-notas.service';
import { TipoCambioService } from './services/tipo-cambio.service';
import { CxcConfiguracionService } from './services/cxc-configuracion.service';

@Module({
  imports: [PrismaModule],
  controllers: [CxcController],
  providers: [
    TipoCambioService,
    CxcConfiguracionService,
    CxcAntiguedadService,
    CxcEstadoCuentaService,
    CxcRecibosService,
    CxcArreglosService,
    CxcNotasService,
  ],
  exports: [
    TipoCambioService,
    CxcConfiguracionService,
    CxcAntiguedadService,
    CxcEstadoCuentaService,
    CxcRecibosService,
    CxcArreglosService,
    CxcNotasService,
  ],
})
export class CxcModule {}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' && res !== null && 'message' in res ? (res as any).message : res;
    } else if (exception && typeof exception === 'object' && 'code' in exception) {
      // Manejo específico de códigos de error de base de datos / Prisma
      const prismaError = exception as any;
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con estos datos únicos';
      } else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'El registro solicitado no fue encontrado';
      } else {
        this.logger.error(`Error de Base de Datos [${prismaError.code}]: ${prismaError.message}`, prismaError.stack);
      }
    } else {
      // Error no controlado (500)
      const err = exception as Error;
      this.logger.error(
        `Excepción no controlada en [${request.method}] ${request.url}: ${err?.message || 'Error desconocido'}`,
        err?.stack,
      );
      message = 'Error interno del servidor. Por favor contacte al soporte técnico si el problema persiste.';
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

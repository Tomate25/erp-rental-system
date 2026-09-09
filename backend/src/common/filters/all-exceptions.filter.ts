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
      message = sanitizeAndTranslateMessage(message);
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

/**
 * Traduce automáticamente los mensajes de error por defecto generados por class-validator
 * y excepciones estándar de NestJS a un español formal y comprensible para el usuario.
 */
function translateValidationMessage(msg: string): string {
  if (typeof msg !== 'string') return msg;

  if (msg === 'Unauthorized') return 'No autorizado. Por favor inicie sesión nuevamente.';
  if (msg === 'Forbidden resource') return 'Acceso denegado. No cuentas con los permisos suficientes para esta acción.';
  if (msg === 'Bad Request') return 'Solicitud inválida. Verifique los campos enviados.';
  if (msg === 'Internal Server Error') return 'Error interno del servidor.';
  if (msg === 'Not Found') return 'El recurso solicitado no fue encontrado.';

  let out = msg;
  out = out.replace(/each value in /gi, 'cada elemento en ');
  out = out.replace(/should not be empty/gi, 'no debe estar vacío');
  out = out.replace(/must not be empty/gi, 'no debe estar vacío');
  out = out.replace(/must be an email/gi, 'debe ser un correo electrónico válido');
  out = out.replace(/must be a string/gi, 'debe ser una cadena de texto');
  out = out.replace(/must be a number conforming to the specified constraints/gi, 'debe ser un valor numérico válido');
  out = out.replace(/must be an integer number/gi, 'debe ser un número entero');
  out = out.replace(/must be a number/gi, 'debe ser un número válido');
  out = out.replace(/must be a UUID/gi, 'debe ser un identificador único (UUID) válido');
  out = out.replace(/must be a boolean value/gi, 'debe ser un valor booleano');
  out = out.replace(/must be an array/gi, 'debe ser una lista');
  out = out.replace(/must be a valid ISO 8601 date string/gi, 'debe ser una fecha válida (formato ISO 8601)');
  out = out.replace(/must be a Date instance/gi, 'debe ser una fecha válida');
  out = out.replace(/must not be less than (\d+)/gi, 'no debe ser menor a $1');
  out = out.replace(/must not be greater than (\d+)/gi, 'no debe ser mayor a $1');
  out = out.replace(/property (.+?) should not exist/gi, 'el campo $1 no está permitido');
  out = out.replace(/must be longer than or equal to (\d+) characters/gi, 'debe contener al menos $1 caracteres');
  out = out.replace(/must be shorter than or equal to (\d+) characters/gi, 'no debe superar $1 caracteres');
  out = out.replace(/must be one of the following values:?/gi, 'debe ser uno de los valores permitidos:');
  return out;
}

function sanitizeAndTranslateMessage(msg: any): any {
  if (Array.isArray(msg)) {
    return msg.map((m) => (typeof m === 'string' ? translateValidationMessage(m) : m));
  }
  if (typeof msg === 'string') {
    return translateValidationMessage(msg);
  }
  return msg;
}


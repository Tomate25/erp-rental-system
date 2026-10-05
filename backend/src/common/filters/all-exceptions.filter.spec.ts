import { AllExceptionsFilter } from './all-exceptions.filter';
import {
  ArgumentsHost,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      url: '/api/v1/test',
      method: 'GET',
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse as Response,
        getRequest: () => mockRequest as Request,
      }),
    } as unknown as ArgumentsHost;
  });

  it('debe manejar HttpException estándar devolviendo su código de estado correspondiente', () => {
    const exception = new NotFoundException(
      'El recurso solicitado no fue encontrado',
    );
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        path: '/api/v1/test',
      }),
    );
  });

  it('debe mapear ForbiddenException por CORS a HTTP 403', () => {
    const exception = new ForbiddenException(
      'Origen http://localhost:5174 no permitido por política CORS',
    );
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Origen http://localhost:5174 no permitido por política CORS',
        path: '/api/v1/test',
      }),
    );
  });

  it('debe capturar errores de tipo Error con mensaje de CORS y convertirlos en HTTP 403', () => {
    const exception = new Error(
      'Origen http://malicious-site.com no permitido por política CORS',
    );
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message:
          'Origen http://malicious-site.com no permitido por política CORS',
        path: '/api/v1/test',
      }),
    );
  });

  it('debe manejar errores de Prisma P2002 con HTTP 409 CONFLICT', () => {
    const prismaError = {
      code: 'P2002',
      message: 'Unique constraint failed',
    };
    filter.catch(prismaError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'Ya existe un registro con estos datos únicos',
      }),
    );
  });

  it('debe manejar errores no controlados devolviendo HTTP 500 sin exponer detalles internos', () => {
    const unexpectedError = new Error(
      'Database connection unexpectedly closed',
    );
    filter.catch(unexpectedError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          'Error interno del servidor. Por favor contacte al soporte técnico si el problema persiste.',
      }),
    );
  });
});

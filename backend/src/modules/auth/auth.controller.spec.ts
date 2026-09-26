import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  const mockResponse = (): Partial<Response> => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  describe('login', () => {
    it('configura cookie HttpOnly/SameSite para refreshToken y lo omite del JSON devuelto', async () => {
      const loginDto = { email: 'admin@bismark.com', password: 'Password123!' };
      const user = { id: 'usr-1', email: loginDto.email, nombre: 'Admin' };
      authService.validateUser.mockResolvedValue(user);
      authService.login.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user,
      });

      const res = mockResponse();
      const result = await controller.login(loginDto, res as Response);

      expect(authService.validateUser).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledWith(user);

      // Verificación de cookie segura
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth',
        }),
      );

      // Verificación de que refreshToken NO viaja en el body JSON
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        user,
      });
      expect((result as any).refreshToken).toBeUndefined();
    });

    it('identifica al usuario autenticado para registrar su inicio de sesión', async () => {
      const loginDto = { email: 'admin@bm.com', password: 'Password123!' };
      const user = { id: 'usr-1', empresaId: 'emp-1', email: loginDto.email };
      authService.validateUser.mockResolvedValue(user);
      authService.login.mockResolvedValue({ user, accessToken: 'access', refreshToken: 'refresh' });
      const req = { headers: {} } as Request;

      await controller.login(loginDto, mockResponse() as Response, req);

      expect((req as Request & { user?: { id: string; empresaId: string } }).user).toEqual({
        id: 'usr-1', empresaId: 'emp-1',
      });
    });
  });

  describe('refresh', () => {
    it('prioriza la cookie sobre el body cuando ambos están presentes', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=cookie-token-123; other=value',
          origin: 'http://localhost:5173',
        },
      } as unknown as Request;

      const res = mockResponse();
      authService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-cookie-token',
      });

      const result = await controller.refresh(req, res as Response, {
        refreshToken: 'body-token-ignored',
      });

      // Debe haber usado cookie-token-123, ignorando body-token-ignored
      expect(authService.refreshToken).toHaveBeenCalledWith('cookie-token-123');
      expect((result as any).refreshToken).toBeUndefined();
      expect(result.accessToken).toBe('new-access-token');
    });

    it('rechaza con ForbiddenException en flujo cookie si faltan los encabezados Origin y Referer', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=cookie-token-123',
          // sin origin ni referer
        },
      } as unknown as Request;

      const res = mockResponse();

      await expect(controller.refresh(req, res as Response)).rejects.toThrow(
        ForbiddenException,
      );
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('rechaza con ForbiddenException en flujo cookie si Origin no pertenece a los permitidos', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=cookie-token-123',
          origin: 'http://sitio-malicioso.com',
        },
      } as unknown as Request;

      const res = mockResponse();

      await expect(controller.refresh(req, res as Response)).rejects.toThrow(
        ForbiddenException,
      );
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('permite fallback a body si no existe cookie (ej. clientes no browser / API externa)', async () => {
      const req = {
        headers: {}, // sin cookie
      } as unknown as Request;

      const res = mockResponse();
      authService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(req, res as Response, {
        refreshToken: 'direct-body-token',
      });

      expect(authService.refreshToken).toHaveBeenCalledWith(
        'direct-body-token',
      );
      expect(result.accessToken).toBe('new-access-token');
    });

    it('rechaza con UnauthorizedException si no se envía cookie ni body', async () => {
      const req = {
        headers: {},
      } as unknown as Request;

      const res = mockResponse();

      await expect(
        controller.refresh(req, res as Response, undefined),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('valida CSRF y rechaza si el flujo de cookie carece de Origin/Referer', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=cookie-logout-token',
          // sin Origin/Referer
        },
      } as unknown as Request;

      const res = mockResponse();

      await expect(controller.logout(req, res as Response)).rejects.toThrow(
        ForbiddenException,
      );
      expect(authService.logout).not.toHaveBeenCalled();
    });

    it('valida CSRF y rechaza si el flujo de cookie proviene de un Origin no permitido', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=cookie-logout-token',
          origin: 'http://malicious.evil.com',
        },
      } as unknown as Request;

      const res = mockResponse();

      await expect(controller.logout(req, res as Response)).rejects.toThrow(
        ForbiddenException,
      );
      expect(authService.logout).not.toHaveBeenCalled();
    });

    it('prioriza la cookie de refresh sobre el header Bearer en logout', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=cookie-to-invalidate',
          authorization: 'Bearer bearer-to-ignore',
          origin: 'http://localhost:5173',
        },
      } as unknown as Request;

      const res = mockResponse();
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req, res as Response);

      expect(authService.logout).toHaveBeenCalledWith(
        undefined,
        'cookie-to-invalidate',
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth',
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rechaza y propaga UnauthorizedException si el token es forjado, pero limpia la cookie', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=forged-cookie-token',
          origin: 'http://localhost:5173',
        },
      } as unknown as Request;

      const res = mockResponse();
      authService.logout.mockRejectedValue(
        new UnauthorizedException('Token inválido'),
      );

      await expect(controller.logout(req, res as Response)).rejects.toThrow(
        UnauthorizedException,
      );

      // Aun ante error, debe asegurarse de limpiar la cookie del cliente
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('si no hay ningún token ni cookie, limpia la cookie y responde exitosamente', async () => {
      const req = {
        headers: {},
      } as unknown as Request;

      const res = mockResponse();

      const result = await controller.logout(req, res as Response);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });
  });
});

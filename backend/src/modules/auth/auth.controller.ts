import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from './decorators/get-user.decorator';
import type { AuditedRequest } from '../auditoria/utils/audit-http.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req?: Request,
  ) {
    const user = await this.authService.validateUser(loginDto);
    const result = await this.authService.login(user);
    if (req && result.user?.id && result.user?.empresaId) {
      (req as AuditedRequest).user = {
        id: result.user.id,
        empresaId: result.user.empresaId,
      };
    }

    // Configurar cookie HttpOnly y segura para el Refresh Token (mitigación XSS)
    if (res?.cookie && result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      });
    }

    // No exponer refreshToken en el body JSON cuando se sirve con cookie HttpOnly (anti-XSS/localStorage)
    const { refreshToken: _refreshToken, ...responseBody } = result;
    return responseBody;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto?: RefreshTokenDto,
  ) {
    const cookieToken = this.extractCookie(req, 'refreshToken');
    if (cookieToken) {
      // En flujo basado en cookie de navegador se exige explícitamente Origin o Referer válido
      this.validateCsrfOrigin(req, true);
    }

    // Prioridad estricta al cookie seguro sobre el body (el body solo opera como fallback sin cookie)
    const token = cookieToken || refreshTokenDto?.refreshToken;

    if (!token) {
      throw new UnauthorizedException(
        'Token de actualización no proporcionado',
      );
    }

    const result = await this.authService.refreshToken(token);
    if (result.auditActor) {
      (req as AuditedRequest).user = result.auditActor;
    }

    if (res?.cookie && result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    // No exponer refreshToken en JSON si se utiliza cookie HttpOnly
    const { refreshToken: _refreshToken, auditActor: _auditActor, ...responseBody } = result;
    return responseBody;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieToken = this.extractCookie(req, 'refreshToken');
    if (cookieToken) {
      // Exigir encabezado Origin o Referer en flujo de cookie para mitigar CSRF
      this.validateCsrfOrigin(req, true);
    }

    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : undefined;

    // Prioridad estricta al cookie seguro sobre el Bearer token
    const tokenToInvalidate = cookieToken || bearerToken;

    if (!tokenToInvalidate) {
      if (res?.clearCookie) {
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          path: '/api/v1/auth',
        });
      }
      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
      };
    }

    // Invalidar sesión en la base de datos (con verificación de firma criptográfica anti-DoS)
    try {
      const actor = await this.authService.logout(undefined, tokenToInvalidate);
      if (actor) {
        (req as AuditedRequest).user = actor;
      }
    } finally {
      if (res?.clearCookie) {
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          path: '/api/v1/auth',
        });
      }
    }

    return {
      success: true,
      message: 'Sesión cerrada exitosamente e invalidada en base de datos',
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') // Solo usuarios ADMIN pueden registrar a otros usuarios
  async register(
    @Body() registerDto: RegisterDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') currentUserId: string,
  ) {
    return this.authService.register(registerDto, empresaId, currentUserId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: unknown) {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  private extractCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req?.headers?.cookie;
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const target = cookies.find((c) => c.startsWith(`${name}=`));
    return target
      ? decodeURIComponent(target.substring(name.length + 1))
      : undefined;
  }

  private validateCsrfOrigin(req: Request, requireHeader = false): void {
    const origin = (req.headers['origin'] || req.headers['referer']) as string;
    if (!origin) {
      if (requireHeader) {
        throw new ForbiddenException(
          'Petición con cookie requiere encabezado Origin o Referer válido',
        );
      }
      return;
    }

    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    const defaultAllowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'https://bmconstruccionesnic.digital',
    ];
    const allowed = allowedOriginsEnv
      ? allowedOriginsEnv
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : defaultAllowedOrigins;

    try {
      const parsed = new URL(origin);
      const originBase = `${parsed.protocol}//${parsed.host}`;
      const isAllowed = allowed.some((a) => {
        try {
          const aUrl = new URL(a);
          return `${aUrl.protocol}//${aUrl.host}` === originBase;
        } catch {
          return a === originBase;
        }
      });
      if (!isAllowed) {
        throw new ForbiddenException(
          'Petición cross-origin rechazada por validación CSRF/Origin',
        );
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Encabezado Origin/Referer inválido');
    }
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { roles?: string[] } }>();

    if (!user || !user.roles) {
      throw new ForbiddenException(
        'No tienes permisos suficientes para acceder a este recurso',
      );
    }

    const userRoles = user.roles.map((r) => String(r).toUpperCase());

    // Administrador cuenta con acceso irrestricto
    if (userRoles.includes('ADMIN')) {
      return true;
    }

    // Conjunto de roles efectivos con soporte de alias comercial
    const effectiveRoles = new Set<string>(userRoles);
    if (effectiveRoles.has('VENDEDOR')) {
      effectiveRoles.add('COMERCIAL');
    }
    if (effectiveRoles.has('COMERCIAL')) {
      effectiveRoles.add('VENDEDOR');
    }

    const hasRole = requiredRoles.some((role) =>
      effectiveRoles.has(String(role).toUpperCase()),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'No tienes permisos suficientes para acceder a este recurso',
      );
    }

    return true;
  }
}

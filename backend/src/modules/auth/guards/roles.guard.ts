import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  hasAuxiliaryReadAccess,
  normalizeUserModulePermissions,
  resolveModuleFromRoutePath,
  type UserModulePermissionsMap,
} from '../constants/modules.constant';

interface GuardRequestUser {
  roles?: string[];
  permisosModulosPersonalizados?: boolean;
  permisosModulos?:
    Array<{ modulo: string; nivel: string }> | UserModulePermissionsMap | null;
}

interface GuardHttpRequest {
  user?: GuardRequestUser;
  method?: string;
  originalUrl?: string;
  url?: string;
  baseUrl?: string;
  path?: string;
}

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

    const request = context.switchToHttp().getRequest<GuardHttpRequest>();
    const user = request?.user;

    if (!user || !user.roles) {
      throw new ForbiddenException(
        'No tienes permisos suficientes para acceder a este recurso',
      );
    }

    const userRoles = user.roles.map((r) => String(r).toUpperCase());

    // Administrador cuenta con acceso irrestricto a todos los módulos
    if (userRoles.includes('ADMIN')) {
      return true;
    }

    // Control granular por módulo (Sin acceso / Lectura / Escritura) cuando está personalizado
    if (user.permisosModulosPersonalizados) {
      const routePath = this.resolveRequestPath(context, request);
      const targetModule = resolveModuleFromRoutePath(routePath);

      if (targetModule) {
        const method = String(request?.method || 'GET').toUpperCase();
        const isReadMethod =
          method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
        const modulePerms = normalizeUserModulePermissions(
          user.permisosModulos,
        );
        const directLevel = modulePerms[targetModule];

        if (isReadMethod) {
          if (
            directLevel === 'LECTURA' ||
            directLevel === 'ESCRITURA' ||
            hasAuxiliaryReadAccess(targetModule, routePath, modulePerms)
          ) {
            return true;
          }
          throw new ForbiddenException(
            'No tienes permisos para consultar este módulo.',
          );
        }

        // Métodos de escritura (POST, PUT, PATCH, DELETE) exigen explícitamente nivel ESCRITURA
        if (directLevel === 'ESCRITURA') {
          return true;
        }

        if (directLevel === 'LECTURA') {
          throw new ForbiddenException(
            'Tu cuenta tiene acceso de solo lectura en este módulo. No puedes crear, editar ni eliminar registros.',
          );
        }

        throw new ForbiddenException(
          'No tienes permisos para realizar modificaciones en este módulo.',
        );
      }
    }

    // Conjunto de roles efectivos con soporte de alias comercial (modo heredado por rol)
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

  private resolveRequestPath(
    context: ExecutionContext,
    request?: GuardHttpRequest,
  ): string {
    const rawUrl =
      request?.originalUrl ||
      request?.url ||
      `${request?.baseUrl || ''}${request?.path || ''}`;
    if (rawUrl && rawUrl !== '/') {
      return rawUrl;
    }

    const controllerPath =
      this.reflector.get<string | string[]>(
        PATH_METADATA,
        context.getClass(),
      ) || '';
    const handlerPath =
      this.reflector.get<string | string[]>(
        PATH_METADATA,
        context.getHandler(),
      ) || '';

    const ctrlSegment = Array.isArray(controllerPath)
      ? controllerPath[0] || ''
      : controllerPath;
    const handlerSegment = Array.isArray(handlerPath)
      ? handlerPath[0] || ''
      : handlerPath;

    return [ctrlSegment, handlerSegment]
      .filter(Boolean)
      .map((s) => s.replace(/^\/+|\/+$/g, ''))
      .join('/');
  }
}

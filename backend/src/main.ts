import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ForbiddenException } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { extractClientIp } from './common/utils/client-ip.util';
import { runWithAuditRequestContext } from './modules/auditoria/utils/audit-request-context';
import { attachHttpAudit } from './modules/auditoria/utils/audit-http.util';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const auditPrisma = app.get(PrismaService);

  // Configuración segura de proxy inverso (explícito, nunca boolean true para mitigar spoofing de IP)
  const expressInstance = app.getHttpAdapter().getInstance() as {
    set: (setting: string, val: unknown) => void;
  };
  const trustedProxies = process.env.TRUSTED_PROXIES || 'loopback';
  const trustedProxyEntries = trustedProxies
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  expressInstance.set('trust proxy', trustedProxyEntries);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const incomingRequestId = req.header('x-request-id')?.trim();
    const requestId =
      incomingRequestId && incomingRequestId.length <= 128
        ? incomingRequestId
        : randomUUID();
    const userAgent = (req.header('user-agent') || 'Unknown').slice(0, 255);
    const ipDireccion = extractClientIp(req, trustedProxies);

    res.setHeader('X-Request-Id', requestId);
    const metadata = { requestId, userAgent, ipDireccion };
    runWithAuditRequestContext(metadata, () => {
      attachHttpAudit(auditPrisma, req, res, metadata, (error) =>
        console.error(
          'No se pudo registrar la solicitud en la bitácora:',
          error,
        ),
      );
      next();
    });
  });

  // Cabeceras HTTP de seguridad con Helmet y CSP activa compatible con la SPA
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: [
            "'self'",
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'https://bmconstruccionesnic.digital',
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests:
            process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Filtro global de excepciones sanitizadas para producción
  app.useGlobalFilters(new AllExceptionsFilter());

  // Habilitar validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Retorna error si se envían propiedades no permitidas
      transform: true, // Convierte automáticamente los payloads a las clases DTO correspondientes
    }),
  );

  // Habilitar CORS con restricción de dominios autorizados
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
    'https://bmconstruccionesnic.digital',
  ];
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((origin) => origin.trim())
    : defaultAllowedOrigins;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Permitir solicitudes sin origen, orígenes autorizados o túneles de Cloudflare
      const isCloudflareTunnel =
        Boolean(origin) &&
        (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin!) ||
          origin!.endsWith('.trycloudflare.com'));

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        isCloudflareTunnel
      ) {
        callback(null, true);
      } else {
        callback(
          new ForbiddenException(
            `Origen ${origin} no permitido por política CORS`,
          ),
        );
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
}
void bootstrap();

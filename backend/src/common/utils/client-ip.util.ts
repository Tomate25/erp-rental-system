import type { Request } from 'express';

/**
 * Normaliza una dirección IP removiendo prefijos IPv6 en formato mapeado (::ffff:)
 */
export function normalizeIp(ip?: string | null): string {
  if (!ip) return '127.0.0.1';
  let cleanIp = ip.trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }
  return cleanIp;
}

/**
 * Determina si una IP pertenece a rangos privados/loopback o proxies confiables configurados
 */
export function isTrustedProxyIp(
  ip: string,
  configuredTrusted?: string,
): boolean {
  const normalized = normalizeIp(ip);
  const normalizedLower = normalized.toLowerCase();
  const list = (configuredTrusted || 'loopback')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return list.some((entry) => {
    if (entry === normalizedLower) return true;
    if (entry === 'loopback') {
      return (
        normalizedLower === '127.0.0.1' ||
        normalizedLower === '::1' ||
        normalizedLower === 'localhost'
      );
    }
    if (entry === 'linklocal') {
      return (
        normalizedLower.startsWith('169.254.') ||
        normalizedLower.startsWith('fe80:')
      );
    }
    if (entry === 'uniquelocal') {
      return (
        normalizedLower.startsWith('10.') ||
        normalizedLower.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(normalizedLower) ||
        normalizedLower.startsWith('fc') ||
        normalizedLower.startsWith('fd')
      );
    }
    return isIpv4InCidr(normalized, entry);
  });
}

function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [network, prefixText] = cidr.split('/');
  if (!network || prefixText === undefined) return false;
  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const toNumber = (value: string): number | null => {
    const parts = value.split('.').map(Number);
    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return null;
    }
    return parts.reduce((acc, part) => (acc * 256 + part) >>> 0, 0);
  };

  const ipNumber = toNumber(ip);
  const networkNumber = toNumber(network);
  if (ipNumber === null || networkNumber === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNumber & mask) === (networkNumber & mask);
}

/**
 * Obtiene la dirección IP real del cliente protegiendo contra spoofing de X-Forwarded-For.
 * Si la conexión inmediata socket no proviene de un proxy confiable, cualquier encabezado
 * X-Forwarded-For es ignorado y se toma la IP real del socket.
 */
export function extractClientIp(
  req: Pick<Request, 'headers' | 'socket' | 'ip'>,
  customTrustedProxies?: string,
): string {
  const trustedConfig =
    customTrustedProxies ?? process.env.TRUSTED_PROXIES ?? 'loopback';

  const socketIp = normalizeIp(req.socket?.remoteAddress);

  // Si la conexión directa no viene de un proxy confiable, NUNCA confiar en X-Forwarded-For
  if (!isTrustedProxyIp(socketIp, trustedConfig)) {
    return socketIp;
  }

  // Si viene de un proxy confiable, leer X-Forwarded-For o X-Real-IP
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    const headerStr = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor;
    const ips = headerStr.split(',').map((ip) => normalizeIp(ip));

    // Recorrer desde el salto más cercano. Así un valor falso agregado a la
    // izquierda por el cliente no desplaza a la IP que recibió el proxy.
    for (let index = ips.length - 1; index >= 0; index -= 1) {
      const clientCandidate = ips[index];
      if (
        clientCandidate &&
        !isTrustedProxyIp(clientCandidate, trustedConfig)
      ) {
        return clientCandidate;
      }
    }

    // Si todas eran confiables, retornar la primera en la cadena
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp) {
    const realIpStr = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    return normalizeIp(realIpStr);
  }

  // Fallback a req.ip (gestionado por Express) o socketIp
  return normalizeIp(req.ip || socketIp);
}

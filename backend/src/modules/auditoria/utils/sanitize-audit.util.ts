const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pass/i,
  /hash/i,
  /argon2/i,
  /secret/i,
  /jwt/i,
  /token/i,
  /session_?token/i,
  /token_?publico/i,
  /refresh_?token/i,
  /access_?token/i,
  /authorization/i,
  /cookie/i,
  /credit_?card/i,
  /cvv/i,
  /pin/i,
];

const JWT_REGEX = /^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
const JWT_INLINE_REGEX =
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const PLAINTEXT_SECRET_REGEX =
  /((?:authorization|password|pass|secret|session[_-]?token|refresh[_-]?token|access[_-]?token|token[_-]?publico|cookie|jwt)\s*[:=]\s*)(?:bearer\s+)?[^\s,;]+/gi;

function sanitizePlainText(value: string): string {
  return value
    .replace(PLAINTEXT_SECRET_REGEX, '$1[REDACTED]')
    .replace(JWT_INLINE_REGEX, '[REDACTED_JWT]');
}

/**
 * Sanitiza recursivamente un objeto o valor antes de persistirlo en auditoría forense,
 * eliminando y ofuscando credenciales, contraseñas, hashes, tokens JWT y tokens de sesión.
 */
export function sanitizeAuditDetails(data: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEPTH_LIMIT]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Si parece un JWT, redactar
    if (JWT_REGEX.test(data.trim())) {
      return '[REDACTED_JWT]';
    }
    return sanitizePlainText(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditDetails(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) =>
        pattern.test(key),
      );
      if (isSensitiveKey) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeAuditDetails(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  if (typeof data === 'bigint') {
    return data.toString();
  }

  return null;
}

/**
 * Convierte los detalles de auditoría en una cadena JSON sanitizada de forma segura.
 */
export function serializeAuditDetails(
  details?: Record<string, unknown> | string | null,
): string {
  if (!details) return '{}';

  if (typeof details === 'string') {
    try {
      const parsed: unknown = JSON.parse(details);
      const sanitized = sanitizeAuditDetails(parsed);
      return JSON.stringify(sanitized);
    } catch {
      return JSON.stringify({
        rawMessage: sanitizePlainText(details).slice(0, 1000),
      });
    }
  }

  const sanitized = sanitizeAuditDetails(details);
  return JSON.stringify(sanitized);
}

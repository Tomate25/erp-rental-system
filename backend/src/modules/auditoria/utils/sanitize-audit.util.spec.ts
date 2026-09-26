import {
  sanitizeAuditDetails,
  serializeAuditDetails,
} from './sanitize-audit.util';

describe('Sanitize Audit Details', () => {
  it('redacta campos sensibles como password, token, hash, sessionToken y cookies', () => {
    const sensitivePayload = {
      email: 'admin@bismark.com',
      password: 'super-secret-password-123',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
      sessionToken: 'uuid-session-secret',
      tokenPublico: 'public-quote-token-abc',
      refreshToken: 'refresh-jwt-token',
      cookie: 'HttpOnly; Secure; session=xyz',
      nested: {
        pin: '1234',
        creditCard: '4111-2222-3333-4444',
        safeProperty: 'Contrato Formalizado',
      },
    };

    const sanitized = sanitizeAuditDetails(sensitivePayload) as Record<
      string,
      unknown
    >;

    expect(sanitized.email).toBe('admin@bismark.com');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.passwordHash).toBe('[REDACTED]');
    expect(sanitized.sessionToken).toBe('[REDACTED]');
    expect(sanitized.tokenPublico).toBe('[REDACTED]');
    expect(sanitized.refreshToken).toBe('[REDACTED]');
    expect(sanitized.cookie).toBe('[REDACTED]');
    expect((sanitized.nested as Record<string, unknown>).pin).toBe(
      '[REDACTED]',
    );
    expect((sanitized.nested as Record<string, unknown>).creditCard).toBe(
      '[REDACTED]',
    );
    expect((sanitized.nested as Record<string, unknown>).safeProperty).toBe(
      'Contrato Formalizado',
    );
  });

  it('redacta tokens JWT con formato estandar eyJ...', () => {
    const fakeJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakSignature';
    const payload = {
      authorization: fakeJwt,
      otroCampo: fakeJwt,
    };

    const sanitized = sanitizeAuditDetails(payload) as Record<string, unknown>;
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.otroCampo).toBe('[REDACTED_JWT]');
  });

  it('serializeAuditDetails retorna un JSON válido sanitizado', () => {
    const raw = {
      accion: 'LOGIN_EXITOSO',
      secretKey: 'top-secret',
      empresaId: 'emp-1',
    };

    const json = serializeAuditDetails(raw);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.accion).toBe('LOGIN_EXITOSO');
    expect(parsed.secretKey).toBe('[REDACTED]');
    expect(parsed.empresaId).toBe('emp-1');
  });

  it('retorna {} si se provee null o undefined', () => {
    expect(serializeAuditDetails(null)).toBe('{}');
    expect(serializeAuditDetails(undefined)).toBe('{}');
  });

  it('redacta secretos incrustados en texto no JSON', () => {
    const serialized = serializeAuditDetails(
      'fallo sessionToken=abc123 Authorization: Bearer super-secret password=Clave1!',
    );
    const parsed = JSON.parse(serialized) as { rawMessage: string };

    expect(parsed.rawMessage).not.toContain('abc123');
    expect(parsed.rawMessage).not.toContain('super-secret');
    expect(parsed.rawMessage).not.toContain('Clave1!');
    expect(parsed.rawMessage.match(/\[REDACTED\]/g)).toHaveLength(3);
  });

  it('redacta un JWT incrustado dentro de un mensaje de texto', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3ItMSJ9.signature-secreta';
    const serialized = serializeAuditDetails(`token recibido: ${jwt}`);

    expect(serialized).not.toContain(jwt);
    expect(serialized).toContain('[REDACTED_JWT]');
  });
});

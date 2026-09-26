import {
  extractClientIp,
  normalizeIp,
  isTrustedProxyIp,
} from './client-ip.util';
import type { Request } from 'express';

describe('Client IP Extraction and Proxy Hardening', () => {
  describe('normalizeIp', () => {
    it('normaliza IPv4 con prefijo IPv6 ::ffff:', () => {
      expect(normalizeIp('::ffff:192.168.1.50')).toBe('192.168.1.50');
      expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
    });

    it('retorna 127.0.0.1 ante valores nulos o vacíos', () => {
      expect(normalizeIp(null)).toBe('127.0.0.1');
      expect(normalizeIp(undefined)).toBe('127.0.0.1');
      expect(normalizeIp('')).toBe('127.0.0.1');
    });

    it('remueve espacios en blanco', () => {
      expect(normalizeIp('  200.10.20.30  ')).toBe('200.10.20.30');
    });
  });

  describe('isTrustedProxyIp', () => {
    it('reconoce loopback como confiable', () => {
      expect(isTrustedProxyIp('127.0.0.1')).toBe(true);
      expect(isTrustedProxyIp('::1')).toBe(true);
      expect(isTrustedProxyIp('localhost')).toBe(true);
    });

    it('solo reconoce rangos privados cuando se configuran explícitamente', () => {
      expect(isTrustedProxyIp('10.0.1.5')).toBe(false);
      expect(isTrustedProxyIp('172.18.0.2', 'uniquelocal')).toBe(true);
      expect(isTrustedProxyIp('172.25.0.10', '172.16.0.0/12')).toBe(true);
      expect(isTrustedProxyIp('192.168.0.100', 'uniquelocal')).toBe(true);
    });

    it('rechaza IPs públicas que no son proxies confiables', () => {
      expect(isTrustedProxyIp('198.51.100.5')).toBe(false);
      expect(isTrustedProxyIp('203.0.113.195')).toBe(false);
      expect(isTrustedProxyIp('8.8.8.8')).toBe(false);
    });
  });

  describe('extractClientIp - Anti Spoofing', () => {
    it('ignora X-Forwarded-For si la conexión socket directa proviene de una IP externa no confiable (anti-spoofing)', () => {
      const mockReq = {
        socket: { remoteAddress: '198.51.100.77' }, // Atacante directo
        headers: {
          'x-forwarded-for': '8.8.8.8, 1.1.1.1', // Header forjado
          'x-real-ip': '8.8.8.8',
        },
        ip: '198.51.100.77',
      } as unknown as Request;

      const clientIp = extractClientIp(mockReq, 'loopback,uniquelocal');
      // Debe retornar la IP real de conexión del atacante y NO el header forjado
      expect(clientIp).toBe('198.51.100.77');
    });

    it('acepta X-Forwarded-For si la conexión proviene de un proxy confiable (localhost o Docker network)', () => {
      const mockReq = {
        socket: { remoteAddress: '127.0.0.1' }, // Proxy local Nginx
        headers: {
          'x-forwarded-for': '203.0.113.88, 127.0.0.1',
        },
        ip: '127.0.0.1',
      } as unknown as Request;

      const clientIp = extractClientIp(mockReq);
      expect(clientIp).toBe('203.0.113.88');
    });

    it('obtiene la primera IP pública de una cadena de proxies confiables', () => {
      const mockReq = {
        socket: { remoteAddress: '172.18.0.2' }, // Docker container proxy
        headers: {
          'x-forwarded-for': '190.212.45.10, 10.0.0.1',
        },
        ip: '172.18.0.2',
      } as unknown as Request;

      const clientIp = extractClientIp(mockReq, 'loopback,uniquelocal');
      expect(clientIp).toBe('190.212.45.10');
    });

    it('ignora un valor falso antepuesto a la cadena por el cliente', () => {
      const mockReq = {
        socket: { remoteAddress: '172.18.0.2' },
        headers: {
          'x-forwarded-for': '8.8.8.8, 190.212.45.10, 10.0.0.1',
        },
        ip: '172.18.0.2',
      } as unknown as Request;

      expect(extractClientIp(mockReq, 'loopback,uniquelocal')).toBe(
        '190.212.45.10',
      );
    });

    it('soporta header X-Real-IP cuando no hay X-Forwarded-For desde proxy confiable', () => {
      const mockReq = {
        socket: { remoteAddress: '10.0.0.2' },
        headers: {
          'x-real-ip': '201.100.50.25',
        },
        ip: '10.0.0.2',
      } as unknown as Request;

      const clientIp = extractClientIp(mockReq, 'loopback,uniquelocal');
      expect(clientIp).toBe('201.100.50.25');
    });

    it('ignora encabezados forjados desde una IP privada no configurada como proxy', () => {
      const mockReq = {
        socket: { remoteAddress: '192.168.1.25' },
        headers: { 'x-forwarded-for': '8.8.8.8' },
        ip: '192.168.1.25',
      } as unknown as Request;

      expect(extractClientIp(mockReq, 'loopback')).toBe('192.168.1.25');
    });

    it('hace fallback a 127.0.0.1 si no hay socket ni headers', () => {
      const mockReq = {
        socket: {},
        headers: {},
      } as unknown as Request;

      expect(extractClientIp(mockReq)).toBe('127.0.0.1');
    });
  });
});

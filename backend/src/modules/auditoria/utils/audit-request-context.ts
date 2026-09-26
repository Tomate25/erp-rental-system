import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditRequestMetadata {
  ipDireccion: string;
  userAgent: string;
  requestId: string;
}

const auditRequestStorage = new AsyncLocalStorage<AuditRequestMetadata>();

export function runWithAuditRequestContext<T>(
  metadata: AuditRequestMetadata,
  callback: () => T,
): T {
  return auditRequestStorage.run(metadata, callback);
}

export function getAuditRequestContext(): AuditRequestMetadata | undefined {
  return auditRequestStorage.getStore();
}

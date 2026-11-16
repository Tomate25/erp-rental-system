export const VALID_MODULE_IDS = [
  'clients',
  'inventory',
  'providers',
  'purchases',
  'insumos',
  'promociones',
  'availability',
  'quotations',
  'contracts',
  'operations',
  'billing',
  'cxc',
  'accounting',
  'maintenance',
  'audit',
  'security',
  'commissions',
  'sales',
  'payroll',
  'numbering',
] as const;

const VALID_MODULE_SET = new Set<string>(VALID_MODULE_IDS);

export function readModuleFromUrl(search?: string): string | null {
  const rawSearch =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';
  const mod = new URLSearchParams(rawSearch).get('modulo');
  return mod && VALID_MODULE_SET.has(mod) ? mod : null;
}

export function syncModuleToUrl(
  nextModule: string | null,
  previousModule?: string | null,
  replace = false,
): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (nextModule && VALID_MODULE_SET.has(nextModule)) {
    url.searchParams.set('modulo', nextModule);
    if (previousModule && previousModule !== nextModule) {
      url.searchParams.delete('tab');
      url.searchParams.delete('vista');
    }
  } else {
    url.searchParams.delete('modulo');
    url.searchParams.delete('tab');
    url.searchParams.delete('vista');
  }
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

export function readTabFromUrl<T extends string>(
  validTabs: readonly T[],
  fallback: T,
  param = 'tab',
  search?: string,
): T {
  const rawSearch =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';
  const value = new URLSearchParams(rawSearch).get(param);
  return value && (validTabs as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function syncTabToUrl(tab: string, param = 'tab'): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set(param, tab);
  window.history.replaceState({}, '', url);
}

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  ERP_MODULE_AREAS,
  ERP_MODULES_CATALOG,
  getDefaultModulePermissionsForRoles,
  summarizeModulePermissions,
  type ErpModuleId,
  type ModuleAccessLevel,
  type UserModulePermissionsMap,
} from '../../../shared/constants/modules';

interface ModulePermissionsMatrixProps {
  personalized: boolean;
  onPersonalizedChange: (next: boolean) => void;
  value: UserModulePermissionsMap;
  onChange: (next: UserModulePermissionsMap) => void;
  selectedRoleNames: string[];
  disabled?: boolean;
}

export const ModulePermissionsMatrix: React.FC<ModulePermissionsMatrixProps> = ({
  personalized,
  onPersonalizedChange,
  value,
  onChange,
  selectedRoleNames,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = useMemo(
    () => selectedRoleNames.some((r) => r.toUpperCase() === 'ADMIN'),
    [selectedRoleNames],
  );

  const roleDefaults = useMemo(
    () => getDefaultModulePermissionsForRoles(selectedRoleNames),
    [selectedRoleNames],
  );

  const effectiveMap = isAdmin
    ? (Object.fromEntries(
        ERP_MODULES_CATALOG.map((m) => [m.id, 'ESCRITURA' as const]),
      ) as UserModulePermissionsMap)
    : personalized
      ? value
      : roleDefaults;

  const summary = useMemo(
    () => summarizeModulePermissions(effectiveMap),
    [effectiveMap],
  );

  const filteredModulesByArea = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ERP_MODULE_AREAS.map((area) => ({
      area,
      modules: ERP_MODULES_CATALOG.filter((m) => {
        if (m.area !== area) return false;
        if (!q) return true;
        return (
          m.nombre.toLowerCase().includes(q) ||
          m.descripcion.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
        );
      }),
    })).filter((group) => group.modules.length > 0);
  }, [searchTerm]);

  const setModuleLevel = (moduleId: ErpModuleId, nextLevel: ModuleAccessLevel) => {
    if (disabled || isAdmin) return;
    const base: UserModulePermissionsMap = personalized ? { ...value } : { ...roleDefaults };
    if (nextLevel === 'SIN_ACCESO') {
      delete base[moduleId];
    } else {
      base[moduleId] = nextLevel;
    }
    if (!personalized) {
      onPersonalizedChange(true);
    }
    onChange(base);
  };

  const applyAll = (level: ModuleAccessLevel) => {
    if (disabled || isAdmin) return;
    onPersonalizedChange(true);
    if (level === 'SIN_ACCESO') {
      onChange({});
      return;
    }
    const next: UserModulePermissionsMap = {};
    for (const m of ERP_MODULES_CATALOG) {
      next[m.id] = level;
    }
    onChange(next);
  };

  const applyRoleSuggestions = () => {
    if (disabled || isAdmin) return;
    onPersonalizedChange(true);
    onChange({ ...roleDefaults });
  };

  return (
    <div className="space-y-3">
      {/* Cabecera sobria */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-slate-900">
            Acceso por módulo ({ERP_MODULES_CATALOG.length} módulos)
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Define a qué módulos puede ingresar el usuario y el nivel permitido en cada uno.
          </p>
        </div>

        <div className="text-[11px] text-slate-600 tabular-nums shrink-0">
          <span className="font-semibold text-slate-900">{summary.total}</span> de{' '}
          {ERP_MODULES_CATALOG.length} habilitados
          <span className="mx-1.5 text-slate-300">|</span>
          <span>{summary.lectura} lectura</span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span>{summary.escritura} escritura</span>
        </div>
      </div>

      {isAdmin ? (
        <div className="px-3.5 py-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed">
          <span className="font-semibold text-slate-900">Perfil Administrador:</span>{' '}
          El rol <span className="font-mono text-[11px]">ADMIN</span> mantiene acceso completo (lectura y escritura) a los {ERP_MODULES_CATALOG.length} módulos. Para restringir módulos puntuales, asigna un rol operativo en lugar de ADMIN.
        </div>
      ) : (
        <>
          {/* Barra de control sobria */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="inline-flex bg-slate-200/70 p-0.5 rounded-md">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onPersonalizedChange(true);
                  if (!personalized && Object.keys(value).length === 0) {
                    onChange({ ...roleDefaults });
                  }
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  personalized
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Personalizado
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPersonalizedChange(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  !personalized
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Según rol
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyAll('SIN_ACCESO')}
                className="px-2 py-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 font-medium transition-colors cursor-pointer"
                title="Quitar acceso a todos los módulos para seleccionar solo los deseados"
              >
                Quitar todos
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                disabled={disabled}
                onClick={applyRoleSuggestions}
                className="px-2 py-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 font-medium transition-colors cursor-pointer"
              >
                Cargar del rol
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyAll('LECTURA')}
                className="px-2 py-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 font-medium transition-colors cursor-pointer"
              >
                Todos lectura
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyAll('ESCRITURA')}
                className="px-2 py-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 font-medium transition-colors cursor-pointer"
              >
                Todos escritura
              </button>
            </div>
          </div>

          {/* Filtro rápido */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar módulo..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Tabla estructurada de los 20 módulos */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
              {filteredModulesByArea.map((group) => (
                <div key={group.area}>
                  <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.area}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.modules.map((mod) => {
                      const level: ModuleAccessLevel = effectiveMap[mod.id] || 'SIN_ACCESO';

                      return (
                        <div
                          key={mod.id}
                          className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  level === 'ESCRITURA'
                                    ? 'bg-slate-900'
                                    : level === 'LECTURA'
                                      ? 'bg-[#1A73E8]'
                                      : 'bg-slate-300'
                                }`}
                              />
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {mod.nombre}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate pl-3.5 mt-0.5">
                              {mod.descripcion}
                            </p>
                          </div>

                          {/* Control segmentado sobrio */}
                          <div
                            className="inline-grid grid-cols-3 bg-slate-100 p-0.5 rounded-md border border-slate-200/80 shrink-0 w-full sm:w-[240px]"
                            role="radiogroup"
                            aria-label={`Permiso para ${mod.nombre}`}
                          >
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => setModuleLevel(mod.id, 'SIN_ACCESO')}
                              className={`py-1 px-2 rounded text-[11px] transition-colors cursor-pointer ${
                                level === 'SIN_ACCESO'
                                  ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/80'
                                  : 'text-slate-500 hover:text-slate-800 font-medium'
                              }`}
                            >
                              Sin acceso
                            </button>

                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => setModuleLevel(mod.id, 'LECTURA')}
                              className={`py-1 px-2 rounded text-[11px] transition-colors cursor-pointer ${
                                level === 'LECTURA'
                                  ? 'bg-white text-[#1A73E8] font-semibold shadow-2xs border border-[#1A73E8]/30'
                                  : 'text-slate-500 hover:text-slate-800 font-medium'
                              }`}
                            >
                              Solo ver
                            </button>

                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => setModuleLevel(mod.id, 'ESCRITURA')}
                              className={`py-1 px-2 rounded text-[11px] transition-colors cursor-pointer ${
                                level === 'ESCRITURA'
                                  ? 'bg-[#1B1D22] text-white font-semibold shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800 font-medium'
                              }`}
                            >
                              Escribir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredModulesByArea.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No se encontraron módulos con "{searchTerm}".
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

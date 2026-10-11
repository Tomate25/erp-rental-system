import React, { useEffect } from 'react';
import type { UnitDetail } from '../types/grouped-inventory.types';
import { X, Calendar, User, FileText, Wrench, Clock, ShieldCheck } from 'lucide-react';

interface UnitDetailDrawerProps {
  unit: UnitDetail | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const UnitDetailDrawer: React.FC<UnitDetailDrawerProps> = ({
  unit,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'DISPONIBLE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'ALQUILADO':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'RESERVADO':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'EN_REPARACION':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'BAJA':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between transform transition-transform duration-300 ease-in-out">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-200 text-slate-800">
                  {unit?.codigo || '---'}
                </span>
                {unit && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                      unit.estado
                    )}`}
                  >
                    {unit.estado}
                  </span>
                )}
              </div>
              <h2 id="drawer-title" className="text-base font-black text-slate-900">
                {unit?.productoNombre || 'Detalle de Unidad'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {unit?.marca} {unit?.modelo ? `· Mod. ${unit.modelo}` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cerrar detalle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 animate-pulse">
                Cargando historial y ficha técnica...
              </div>
            ) : !unit ? (
              <div className="py-12 text-center text-slate-400">
                No se encontró información de la unidad.
              </div>
            ) : (
              <>
                {/* 1. Datos Técnicos Básicos */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Ficha Técnica de la Unidad
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Número de Serie:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {unit.serie || 'Sin Serie (Lote)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tipo de Control:</span>
                      <span className="font-semibold text-slate-900">
                        {unit.tipoControl === 'SERIALIZADO' ? 'Serializado (1 u.)' : 'Por Cantidad'}
                      </span>
                    </div>
                    {unit.horometro !== null && unit.horometro !== undefined && (
                      <div>
                        <span className="text-slate-500 block">Horómetro Actual:</span>
                        <span className="font-mono font-bold text-amber-800">
                          {unit.horometro} hrs
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Asignación Actual / Cliente */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Asignación y Ubicación Actual
                  </span>

                  {unit.clienteActual ? (
                    <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-blue-600 font-bold uppercase block">
                            Arrendatario / Cliente
                          </span>
                          <span className="text-sm font-bold text-slate-900 block">
                            {unit.clienteActual.nombre}
                          </span>
                          {unit.clienteActual.telefono && (
                            <span className="text-slate-500 text-[11px]">
                              Tel: {unit.clienteActual.telefono}
                            </span>
                          )}
                        </div>
                      </div>

                      {unit.contratoActual && (
                        <div className="border-t border-blue-200/60 pt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block flex items-center gap-1">
                              <FileText className="w-3 h-3 text-slate-400" /> Contrato:
                            </span>
                            <span className="font-mono font-bold text-blue-800">
                              #{unit.contratoActual.numero}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" /> Fecha inicio:
                            </span>
                            <span className="font-medium text-slate-800">
                              {unit.contratoActual.fechaInicio}
                            </span>
                          </div>
                          <div className="col-span-2 mt-1 bg-white p-2 rounded-lg border border-blue-200/80">
                            <span className="text-slate-500 block flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> Devolución Prevista:
                            </span>
                            <span className="font-bold text-amber-900">
                              {unit.contratoActual.fechaDevolucionPrevista}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">Disponible en Bodega Central</span>
                        <span className="text-[11px] text-emerald-700">
                          No cuenta con contrato activo ni bloqueo por reserva.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Historial de Mantenimiento y Reparaciones */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Historial de Mantenimiento ({unit.historialMantenimiento?.length || 0})
                    </span>
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {unit.historialMantenimiento && unit.historialMantenimiento.length > 0 ? (
                    <div className="space-y-2.5">
                      {unit.historialMantenimiento.map((m) => (
                        <div
                          key={m.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                m.tipo === 'CORRECTIVO'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {m.tipo}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">{m.fecha}</span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium">{m.descripcion}</p>
                          {m.tecnicoResponsable && (
                            <span className="text-[11px] text-slate-500 block">
                              Técnico: {m.tecnicoResponsable}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-slate-400 italic">
                      Sin registros de averías o mantenimiento preventivo.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

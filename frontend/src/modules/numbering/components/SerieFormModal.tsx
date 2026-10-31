import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertTriangle, Eye, Hash, ShieldCheck } from 'lucide-react';
import type {
  SerieDocumento,
  CreateSerieDto,
  UpdateSerieDto,
  SucursalOption,
  TipoDocumentoSerie,
  EstadoSerieDocumento,
} from '../types/numbering.types';
import { numberingApi } from '../services/numbering.api';

interface SerieFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  serieAEditar?: SerieDocumento | null;
  sucursales: SucursalOption[];
}

const DOCUMENT_TYPE_LABELS: Record<TipoDocumentoSerie, string> = {
  FACTURA: 'Factura de Renta / Venta (Oficial)',
  FACTURA_DANIO: 'Factura por Daños y Reparaciones',
  RECIBO_CAJA: 'Recibo Oficial de Caja (RC)',
  NOTA_DEBITO: 'Nota de Débito (ND)',
  COTIZACION: 'Cotización Comercial (COT)',
  CONTRATO: 'Contrato de Arrendamiento (CTR)',
  SOL_DESPACHO: 'Solicitud de Despacho (SOL-DESP)',
  SOL_RETORNO: 'Solicitud de Retorno (SOL-RET)',
  ACTA_ENTREGA: 'Acta de Entrega de Equipos',
  ACTA_RECEPCION: 'Acta de Recepción / Retorno',
  OT_TALLER: 'Orden de Trabajo de Taller (OT)',
  ARREGLO_PAGO: 'Acuerdo / Arreglo de Pago',
  NOTA_CREDITO: 'Nota de Crédito (NC)',
  ASIENTO: 'Asiento Contable de Diario',
};

const SUGGESTED_PREFIXES: Record<TipoDocumentoSerie, { prefijo: string; serie: string; relleno: number; plantilla?: string }> = {
  FACTURA: { prefijo: 'FAC', serie: 'KM10', relleno: 6, plantilla: '{prefijo}-{serie}-{numero}' },
  FACTURA_DANIO: { prefijo: 'FAC', serie: 'DAN', relleno: 6, plantilla: '{prefijo}-{serie}-{numero}' },
  RECIBO_CAJA: { prefijo: 'RC', serie: 'KM10', relleno: 5, plantilla: '{prefijo}-{serie}-{numero}' },
  NOTA_DEBITO: { prefijo: 'ND', serie: '001', relleno: 6, plantilla: '{prefijo}-{numero}' },
  COTIZACION: { prefijo: 'COT', serie: '001', relleno: 4, plantilla: '{prefijo}-{numero}' },
  CONTRATO: { prefijo: 'CTR', serie: '001', relleno: 4, plantilla: '{prefijo}-{anio}-{numero}' },
  SOL_DESPACHO: { prefijo: 'SOL-DESP', serie: '001', relleno: 4, plantilla: '{prefijo}-{numero}' },
  SOL_RETORNO: { prefijo: 'SOL-RET', serie: '001', relleno: 4, plantilla: '{prefijo}-{numero}' },
  ACTA_ENTREGA: { prefijo: 'ACTA-ENT', serie: '001', relleno: 4, plantilla: '{prefijo}-{numero}' },
  ACTA_RECEPCION: { prefijo: 'ACTA-REC', serie: '001', relleno: 4, plantilla: '{prefijo}-{numero}' },
  OT_TALLER: { prefijo: 'OT', serie: '001', relleno: 4, plantilla: '{prefijo}-{numero}' },
  ARREGLO_PAGO: { prefijo: 'ARR', serie: '001', relleno: 4, plantilla: '{prefijo}-{numero}' },
  NOTA_CREDITO: { prefijo: 'NC', serie: '001', relleno: 6, plantilla: '{prefijo}-{numero}' },
  ASIENTO: { prefijo: 'AS', serie: '001', relleno: 5, plantilla: '{prefijo}-{anio}-{numero}' },
};

export const SerieFormModal: React.FC<SerieFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  serieAEditar,
  sucursales,
}) => {
  const isEditing = Boolean(serieAEditar);
  const yaEmitioFolios = Boolean(
    serieAEditar && serieAEditar.numeroActual >= serieAEditar.numeroDesde,
  );

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoSerie>('FACTURA');
  const [sucursalId, setSucursalId] = useState<string>('');
  const [serie, setSerie] = useState<string>('KM10');
  const [prefijo, setPrefijo] = useState<string>('FAC');
  const [plantilla, setPlantilla] = useState<string>('{prefijo}-{serie}-{numero}');
  const [relleno, setRelleno] = useState<number>(6);
  const [numeroDesde, setNumeroDesde] = useState<number>(1);
  const [numeroHasta, setNumeroHasta] = useState<number>(999999);
  const [reiniciaPorAnio, setReiniciaPorAnio] = useState<boolean>(false);
  const [esFiscal, setEsFiscal] = useState<boolean>(true);
  const [alertaPorcentaje, setAlertaPorcentaje] = useState<number>(80);
  const [estado, setEstado] = useState<EstadoSerieDocumento>('ACTIVA');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar estado del formulario
  useEffect(() => {
    if (serieAEditar) {
      setTipoDocumento(serieAEditar.tipoDocumento);
      setSucursalId(serieAEditar.sucursalId || '');
      setSerie(serieAEditar.serie || '');
      setPrefijo(serieAEditar.prefijo || '');
      setPlantilla(serieAEditar.plantilla || '');
      setRelleno(serieAEditar.relleno || 6);
      setNumeroDesde(serieAEditar.numeroDesde);
      setNumeroHasta(serieAEditar.numeroHasta);
      setReiniciaPorAnio(serieAEditar.reiniciaPorAnio || false);
      setEsFiscal(serieAEditar.esFiscal || false);
      setAlertaPorcentaje(serieAEditar.alertaPorcentaje || 80);
      setEstado(serieAEditar.estado || 'ACTIVA');
    } else {
      // Valores sugeridos por defecto
      const defaults = SUGGESTED_PREFIXES.FACTURA;
      setTipoDocumento('FACTURA');
      setSucursalId(sucursales[0]?.id || '');
      setSerie(defaults.serie);
      setPrefijo(defaults.prefijo);
      setPlantilla(defaults.plantilla || '{prefijo}-{serie}-{numero}');
      setRelleno(defaults.relleno);
      setNumeroDesde(1);
      setNumeroHasta(999999);
      setReiniciaPorAnio(false);
      setEsFiscal(true);
      setAlertaPorcentaje(80);
      setEstado('ACTIVA');
    }
    setError(null);
  }, [serieAEditar, isOpen, sucursales]);

  // Al cambiar tipo de documento en modo creación, sugerir configuración adecuada
  const handleTipoDocumentoChange = (newTipo: TipoDocumentoSerie) => {
    setTipoDocumento(newTipo);
    if (!isEditing) {
      const suggested = SUGGESTED_PREFIXES[newTipo];
      if (suggested) {
        setPrefijo(suggested.prefijo);
        setSerie(suggested.serie);
        setRelleno(suggested.relleno);
        setPlantilla(suggested.plantilla || '{prefijo}-{serie}-{numero}');
        setReiniciaPorAnio(newTipo === 'CONTRATO');
        setEsFiscal(newTipo === 'FACTURA');
      }
    }
  };

  // Cálculo en vivo de la vista previa del número
  const previewNumero = useMemo(() => {
    const anio = new Date().getFullYear();
    const padded = String(numeroDesde).padStart(relleno, '0');

    if (plantilla && plantilla.trim().length > 0) {
      return plantilla
        .replace(/{prefijo}/gi, prefijo || '')
        .replace(/{serie}/gi, serie || '')
        .replace(/{numero}/gi, padded)
        .replace(/{anio}/gi, String(anio))
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const parts: string[] = [];
    const p = prefijo?.trim() || '';
    const s = serie?.trim() || '';
    if (p && !s.startsWith(p)) parts.push(p);
    if (s) parts.push(s);
    parts.push(padded);
    return parts.join('-');
  }, [prefijo, serie, plantilla, relleno, numeroDesde]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numeroHasta < numeroDesde) {
      setError('El número final ("Hasta") debe ser mayor o igual al número inicial ("Desde").');
      return;
    }

    if (!serie.trim()) {
      setError('El identificador de serie es obligatorio (ej. KM10, CA, 001).');
      return;
    }

    setGuardando(true);
    try {
      if (isEditing && serieAEditar) {
        const updatePayload: UpdateSerieDto = {
          sucursalId: sucursalId ? sucursalId : null,
          numeroHasta,
          plantilla: plantilla.trim() || undefined,
          relleno,
          reiniciaPorAnio,
          esFiscal,
          alertaPorcentaje,
          estado,
        };

        if (!yaEmitioFolios) {
          updatePayload.serie = serie.trim().toUpperCase();
          updatePayload.prefijo = prefijo.trim().toUpperCase() || undefined;
          updatePayload.numeroDesde = numeroDesde;
        }

        await numberingApi.updateSerie(serieAEditar.id, updatePayload);
      } else {
        const createPayload: CreateSerieDto = {
          sucursalId: sucursalId ? sucursalId : null,
          tipoDocumento,
          serie: serie.trim().toUpperCase(),
          prefijo: prefijo.trim().toUpperCase() || undefined,
          plantilla: plantilla.trim() || undefined,
          relleno,
          numeroDesde,
          numeroHasta,
          reiniciaPorAnio,
          esFiscal,
          alertaPorcentaje,
          estado,
        };

        await numberingApi.createSerie(createPayload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error guardando serie:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Ocurrió un error al guardar la serie de numeración.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isEditing ? 'Modificar Serie de Folios' : 'Nueva Serie y Folio Documental'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `Configuración de folios para ${serieAEditar?.tipoDocumento} (${serieAEditar?.serie})`
                  : 'Define el formato, rango y alertas de agotamiento para emisión de documentos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {yaEmitioFolios && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Serie en uso activo:</strong> Ya se han emitido {serieAEditar?.foliosEmitidos} folios (último emitido: #{serieAEditar?.numeroActual}).
                Por integridad fiscal, el número inicial, prefijo y serie no pueden modificarse. Puede ampliar el límite "Hasta" si requiere más folios.
              </div>
            </div>
          )}

          {/* TARJETA DE VISTA PREVIA EN VIVO */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Eye className="w-3.5 h-3.5" /> Vista Previa del Próximo Folio
              </span>
              <div className="text-xl font-mono font-black text-indigo-900 tracking-wider">
                {previewNumero}
              </div>
              <span className="text-[11px] text-indigo-600/80">
                Relleno: {relleno} dígitos • Formato: {plantilla || '{prefijo}-{serie}-{numero}'}
              </span>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Límite Autorizado</span>
              <span className="text-xs font-mono font-bold text-slate-700">Hasta #{numeroHasta}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tipo de Documento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tipo de Documento <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isEditing}
                value={tipoDocumento}
                onChange={(e) => handleTipoDocumentoChange(e.target.value as TipoDocumentoSerie)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-60"
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([tipo, label]) => (
                  <option key={tipo} value={tipo}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sucursal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Sucursal Emisora</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <select
                disabled={yaEmitioFolios}
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-60"
              >
                <option value="">Toda la Empresa (Serie Central / Compartida)</option>
                {sucursales.map((suc) => (
                  <option key={suc.id} value={suc.id}>
                    {suc.nombre} ({suc.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Prefijo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Prefijo <span className="text-[10px] text-slate-400 font-normal">(Ej: FAC, RC, ND)</span>
              </label>
              <input
                type="text"
                disabled={yaEmitioFolios}
                value={prefijo}
                onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
                placeholder="FAC"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase disabled:opacity-60"
              />
            </div>

            {/* Serie */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Serie <span className="text-rose-500">*</span> <span className="text-[10px] text-slate-400 font-normal">(Ej: KM10, CA, 001)</span>
              </label>
              <input
                type="text"
                required
                disabled={yaEmitioFolios}
                value={serie}
                onChange={(e) => setSerie(e.target.value.toUpperCase())}
                placeholder="KM10"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase disabled:opacity-60"
              />
            </div>

            {/* Relleno de dígitos */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ceros de Relleno <span className="text-[10px] text-slate-400 font-normal">(1 - 10)</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={relleno}
                onChange={(e) => setRelleno(parseInt(e.target.value, 10) || 6)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Plantilla de Formateo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Plantilla de Formato de Código</span>
              <span className="text-[10px] text-indigo-600 font-medium">
                Variables: {'{prefijo}'}, {'{serie}'}, {'{numero}'}, {'{anio}'}
              </span>
            </label>
            <input
              type="text"
              value={plantilla}
              onChange={(e) => setPlantilla(e.target.value)}
              placeholder="{prefijo}-{serie}-{numero}"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Ejemplo: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">{'{prefijo}-{serie}-{numero}'}</code> genera <strong className="text-slate-700">FAC-KM10-000001</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rango Desde */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Número Inicial ("Desde") <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={yaEmitioFolios}
                value={numeroDesde}
                onChange={(e) => setNumeroDesde(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-60"
              />
            </div>

            {/* Rango Hasta */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Número Final Autorizado ("Hasta") <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={numeroDesde}
                required
                value={numeroHasta}
                onChange={(e) => setNumeroHasta(parseInt(e.target.value, 10) || 999999)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Alerta Porcentaje */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alerta de Agotamiento al Consumo (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="99"
                  value={alertaPorcentaje}
                  onChange={(e) => setAlertaPorcentaje(parseInt(e.target.value, 10) || 80)}
                  className="w-24 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <span className="text-xs text-slate-500">% consumido del rango</span>
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Estado de la Serie
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoSerieDocumento)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ACTIVA">ACTIVA (En uso oficial)</option>
                <option value="INACTIVA">INACTIVA (En reserva / pausada)</option>
                <option value="AGOTADA">AGOTADA</option>
                <option value="VENCIDA">VENCIDA</option>
              </select>
            </div>
          </div>

          {/* Opciones booleanas */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={esFiscal}
                onChange={(e) => setEsFiscal(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Serie con validez fiscal DGI (Pie de imprenta / Facturación oficial)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reiniciaPorAnio}
                onChange={(e) => setReiniciaPorAnio(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Reiniciar correlativo automáticamente al cambiar de año (Ej. Contratos CTR-2026-0001)</span>
            </label>
          </div>

          {/* Botones */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{guardando ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Serie de Folios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

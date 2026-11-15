import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  Save,
  RotateCcw,
  Search,
  Plus,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getSaldosIniciales,
  guardarSaldosIniciales,
  importarExcelContable,
  restaurarSaldosOficialesBm,
  type CuentaCatalogoInputPayload,
  type SaldoInicialItem,
} from '../services/accounting.api';

interface ExcelPreviewData {
  fileName: string;
  fechaCorte: string;
  catalogo: CuentaCatalogoInputPayload[];
  saldos: Array<{ codigo: string; nombre: string; deudor: number; acreedor: number }>;
  totalDeudor: number;
  totalAcreedor: number;
  reemplazarCatalogo: boolean;
}

const formatCurrency = (amount: number) => {
  const val = Number.isNaN(Number(amount)) ? 0 : Number(amount);
  return `C$ ${val.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const normalizeText = (v: unknown) =>
  String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ');

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return round2(v);
  if (typeof v === 'string') {
    const clean = v.replace(/[C$,\s]/g, '');
    const parsed = Number(clean);
    return Number.isNaN(parsed) ? 0 : round2(parsed);
  }
  return 0;
};

export const SaldosInicialesTab: React.FC = () => {
  const [items, setItems] = useState<SaldoInicialItem[]>([]);
  const [fechaCorte, setFechaCorte] = useState<string>('2026-10-31');
  const [totalCuentasCatalogo, setTotalCuentasCatalogo] = useState<number>(296);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroMayor, setFiltroMayor] = useState<string>('');
  const [soloConSaldo, setSoloConSaldo] = useState<boolean>(true);

  const [excelPreview, setExcelPreview] = useState<ExcelPreviewData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newCuenta, setNewCuenta] = useState<{
    codigo: string;
    nombre: string;
    mayorCodigo: string;
    mayorNombre: string;
    naturaleza: 'Deudora' | 'Acreedora';
    estado: string;
    renglon: string;
    deudor: string;
    acreedor: string;
  }>({
    codigo: '',
    nombre: '',
    mayorCodigo: '',
    mayorNombre: '',
    naturaleza: 'Deudora',
    estado: 'BG',
    renglon: '',
    deudor: '0',
    acreedor: '0',
  });

  const applyServerData = (res: Awaited<ReturnType<typeof getSaldosIniciales>>) => {
    setItems(res.items || []);
    if (res.fechaCorte) setFechaCorte(res.fechaCorte.slice(0, 10));
    setTotalCuentasCatalogo(res.totalCuentasCatalogo || 296);
    setHasUnsavedChanges(false);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSaldosIniciales();
      applyServerData(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudieron cargar los datos y saldos iniciales.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totales = useMemo(() => {
    let totalDeudor = 0;
    let totalAcreedor = 0;
    let cuentasConSaldo = 0;
    for (const item of items) {
      totalDeudor = round2(totalDeudor + (Number(item.deudor) || 0));
      totalAcreedor = round2(totalAcreedor + (Number(item.acreedor) || 0));
      if ((Number(item.deudor) || 0) > 0 || (Number(item.acreedor) || 0) > 0) {
        cuentasConSaldo += 1;
      }
    }
    const diferencia = round2(totalDeudor - totalAcreedor);
    return {
      totalDeudor,
      totalAcreedor,
      diferencia,
      cuadrado: Math.abs(diferencia) < 0.05,
      cuentasConSaldo,
    };
  }, [items]);

  const mayoresList = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      if (it.mayorCodigo && !map.has(it.mayorCodigo)) {
        map.set(it.mayorCodigo, it.mayorNombre || `Mayor ${it.mayorCodigo}`);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (soloConSaldo && item.deudor === 0 && item.acreedor === 0) {
        return false;
      }
      if (filtroMayor && item.mayorCodigo !== filtroMayor) {
        return false;
      }
      if (q) {
        const match =
          item.codigo.toLowerCase().includes(q) ||
          item.nombre.toLowerCase().includes(q) ||
          item.mayorCodigo.toLowerCase().includes(q) ||
          item.mayorNombre.toLowerCase().includes(q) ||
          item.renglon.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, soloConSaldo, filtroMayor, searchTerm]);

  const handleAmountChange = (
    codigo: string,
    field: 'deudor' | 'acreedor',
    rawValue: string,
  ) => {
    const num = Math.max(0, toNumber(rawValue));
    setItems((prev) =>
      prev.map((it) => {
        if (it.codigo !== codigo) return it;
        return {
          ...it,
          deudor: field === 'deudor' ? num : num > 0 ? 0 : it.deudor,
          acreedor: field === 'acreedor' ? num : num > 0 ? 0 : it.acreedor,
        };
      }),
    );
    setHasUnsavedChanges(true);
    setSuccessMsg(null);
  };

  const handleNotasChange = (codigo: string, notas: string) => {
    setItems((prev) =>
      prev.map((it) => (it.codigo === codigo ? { ...it, notas } : it)),
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveManual = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await guardarSaldosIniciales({
        fechaCorte,
        items: items.map((it) => ({
          codigo: it.codigo,
          nombre: it.nombre,
          deudor: round2(it.deudor),
          acreedor: round2(it.acreedor),
          notas: it.notas || undefined,
        })),
      });
      applyServerData(res);
      setSuccessMsg(
        `Datos iniciales guardados correctamente (${res.cuentasConSaldo} cuentas con saldo al ${res.fechaCorte}).`,
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Error al guardar los datos y saldos iniciales.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestaurarOficial = async () => {
    if (
      !confirm(
        '¿Restaurar el catálogo oficial de 250 cuentas y los saldos iniciales oficiales de BM Construcciones al 31/10/2026?',
      )
    ) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await restaurarSaldosOficialesBm();
      applyServerData(res);
      setSuccessMsg(
        'Catálogo oficial BM y saldos iniciales al 31/10/2026 restaurados correctamente.',
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Error al restaurar los datos oficiales BM.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcelFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setSuccessMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      const catSheetName =
        wb.SheetNames.find((n) => n.toLowerCase().includes('catalog')) ||
        wb.SheetNames[0];
      const saldosSheetName = wb.SheetNames.find((n) =>
        n.toLowerCase().includes('saldo'),
      );

      const catRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[catSheetName], {
        header: 1,
        defval: '',
      });

      // Detectar fila de encabezados en hoja Catalogo (Codigo / Nombre de la cuenta / Mayor / Nat.)
      let catHeaderIdx = catRows.findIndex((row) =>
        row.some((cell) => normalizeText(cell).toLowerCase() === 'codigo'),
      );
      if (catHeaderIdx < 0) catHeaderIdx = 0;

      const catHeaders = catRows[catHeaderIdx].map((h) =>
        normalizeText(h).toLowerCase(),
      );
      const colIdx = (aliases: string[]) =>
        catHeaders.findIndex((h) => aliases.some((a) => h.includes(a)));

      const cCodigo = colIdx(['codigo', 'código']);
      const cNombre = colIdx(['nombre de la cuenta', 'nombre']);
      const cMayor = colIdx(['mayor']);
      const cMayorNombre = colIdx(['nombre del mayor', 'mayor nombre']);
      const cNat = colIdx(['nat']);
      const cEstado = colIdx(['estado']);
      const cRenglon = colIdx(['renglon', 'renglón']);

      const parsedCatalogo: CuentaCatalogoInputPayload[] = [];
      for (let i = catHeaderIdx + 1; i < catRows.length; i++) {
        const row = catRows[i];
        const codigo = normalizeText(row[cCodigo >= 0 ? cCodigo : 0]);
        const nombre = normalizeText(row[cNombre >= 0 ? cNombre : 1]);
        if (!codigo || !nombre || !/^\d{4,}$/.test(codigo)) continue;

        const natRaw = normalizeText(row[cNat >= 0 ? cNat : 4]).toUpperCase();
        const naturaleza: 'Deudora' | 'Acreedora' = natRaw.startsWith('A')
          ? 'Acreedora'
          : 'Deudora';

        parsedCatalogo.push({
          codigo,
          nombre,
          mayorCodigo:
            normalizeText(row[cMayor >= 0 ? cMayor : 2]) || codigo.slice(0, 4),
          mayorNombre: normalizeText(row[cMayorNombre >= 0 ? cMayorNombre : 3]),
          naturaleza,
          estado: normalizeText(row[cEstado >= 0 ? cEstado : 5]) || undefined,
          renglon: normalizeText(row[cRenglon >= 0 ? cRenglon : 6]) || undefined,
        });
      }

      const parsedSaldos: Array<{
        codigo: string;
        nombre: string;
        deudor: number;
        acreedor: number;
      }> = [];
      let totalDeudor = 0;
      let totalAcreedor = 0;

      if (saldosSheetName) {
        const salRows = XLSX.utils.sheet_to_json<any[]>(
          wb.Sheets[saldosSheetName],
          { header: 1, defval: '' },
        );
        let salHeaderIdx = salRows.findIndex((row) =>
          row.some((cell) => normalizeText(cell).toLowerCase() === 'codigo'),
        );
        if (salHeaderIdx < 0) salHeaderIdx = 0;

        const salHeaders = salRows[salHeaderIdx].map((h) =>
          normalizeText(h).toLowerCase(),
        );
        const sIdx = (aliases: string[]) =>
          salHeaders.findIndex((h) => aliases.some((a) => h.includes(a)));

        const sCodigo = sIdx(['codigo', 'código']);
        const sNombre = sIdx(['nombre']);
        const sDeudor = sIdx(['deudor', 'debe']);
        const sAcreedor = sIdx(['acreedor', 'haber']);

        for (let i = salHeaderIdx + 1; i < salRows.length; i++) {
          const row = salRows[i];
          const codigo = normalizeText(row[sCodigo >= 0 ? sCodigo : 0]);
          const nombre = normalizeText(row[sNombre >= 0 ? sNombre : 1]);
          if (!codigo || !/^\d{4,}$/.test(codigo)) continue;

          const deudor = toNumber(row[sDeudor >= 0 ? sDeudor : 2]);
          const acreedor = toNumber(row[sAcreedor >= 0 ? sAcreedor : 3]);
          totalDeudor = round2(totalDeudor + deudor);
          totalAcreedor = round2(totalAcreedor + acreedor);
          parsedSaldos.push({ codigo, nombre, deudor, acreedor });
        }
      }

      if (parsedCatalogo.length === 0 && parsedSaldos.length === 0) {
        setError(
          'No se detectaron cuentas ni saldos válidos en el archivo Excel seleccionado.',
        );
        return;
      }

      setExcelPreview({
        fileName: file.name,
        fechaCorte,
        catalogo: parsedCatalogo,
        saldos: parsedSaldos,
        totalDeudor,
        totalAcreedor,
        reemplazarCatalogo: parsedCatalogo.length > 0,
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo leer el archivo Excel (.xlsx). Verifica el formato.');
    }
  };

  const handleConfirmImportExcel = async () => {
    if (!excelPreview) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await importarExcelContable({
        fechaCorte: excelPreview.fechaCorte,
        reemplazarCatalogo: excelPreview.reemplazarCatalogo,
        catalogo:
          excelPreview.catalogo.length > 0 ? excelPreview.catalogo : undefined,
        saldos: excelPreview.saldos,
      });
      applyServerData(res);
      setExcelPreview(null);
      setSuccessMsg(
        `Excel importado exitosamente: ${res.totalCuentasDetalle} cuentas de detalle (${res.totalCuentasCatalogo} nodos jerárquicos) y ${res.cuentasConSaldo} saldos iniciales guardados.`,
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Error al importar el catálogo y los saldos desde Excel.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCuentaYSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCuenta.codigo.trim() || !newCuenta.nombre.trim()) {
      setError('El código y nombre de la nueva cuenta son requeridos.');
      return;
    }

    const deudor = toNumber(newCuenta.deudor);
    const acreedor = toNumber(newCuenta.acreedor);
    if (deudor > 0 && acreedor > 0) {
      setError(
        'Ingresa el saldo inicial únicamente en Deudor o en Acreedor (no ambos positivos).',
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const nextSaldos = [
        ...items
          .filter((it) => it.codigo !== newCuenta.codigo.trim())
          .map((it) => ({
            codigo: it.codigo,
            nombre: it.nombre,
            deudor: round2(it.deudor),
            acreedor: round2(it.acreedor),
            notas: it.notas || undefined,
          })),
        {
          codigo: newCuenta.codigo.trim(),
          nombre: newCuenta.nombre.trim(),
          deudor,
          acreedor,
          notas: 'Cuenta agregada manualmente',
        },
      ];

      const res = await importarExcelContable({
        fechaCorte,
        reemplazarCatalogo: false,
        catalogo: [
          {
            codigo: newCuenta.codigo.trim(),
            nombre: newCuenta.nombre.trim(),
            mayorCodigo:
              newCuenta.mayorCodigo.trim() || newCuenta.codigo.trim().slice(0, 4),
            mayorNombre: newCuenta.mayorNombre.trim() || undefined,
            naturaleza: newCuenta.naturaleza,
            estado: newCuenta.estado.trim() || 'BG',
            renglon: newCuenta.renglon.trim() || undefined,
          },
        ],
        saldos: nextSaldos,
      });

      applyServerData(res);
      setShowAddForm(false);
      setNewCuenta({
        codigo: '',
        nombre: '',
        mayorCodigo: '',
        mayorNombre: '',
        naturaleza: 'Deudora',
        estado: 'BG',
        renglon: '',
        deudor: '0',
        acreedor: '0',
      });
      setSuccessMsg('Nueva cuenta y saldo inicial registrados correctamente.');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Error al registrar la nueva cuenta contable.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-[#1B1D22] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#1A73E8]" />
            Ingreso e Importación de Datos Iniciales BM
          </h3>
          <p className="text-xs text-[#747780] font-medium mt-0.5">
            Administra los saldos iniciales de apertura por cuenta contable o importa el archivo Excel oficial (.xlsx).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E5E8EE] px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[#747780] font-bold">Fecha de Corte:</span>
            <input
              type="date"
              value={fechaCorte}
              onChange={(e) => {
                setFechaCorte(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="bg-transparent font-mono font-bold text-[#1B1D22] focus:outline-hidden"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            className="btn-precision-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>Importar Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleRestaurarOficial}
            disabled={isSaving}
            className="btn-precision-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
            title="Cargar el catálogo oficial BM y saldos iniciales al 31/10/2026"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Cargar Oficial BM</span>
          </button>

          <button
            type="button"
            onClick={handleSaveManual}
            disabled={isSaving || isLoading}
            className="px-4 py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-black shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Datos Iniciales'}</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-2xl flex items-center justify-between">
          <span>Tienes cambios pendientes de guardar en los saldos iniciales.</span>
          <button
            type="button"
            onClick={handleSaveManual}
            className="underline font-black text-amber-950"
          >
            Guardar ahora
          </button>
        </div>
      )}

      {/* Vista previa de Excel a importar */}
      {excelPreview && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-[#1A73E8]" />
              <div>
                <h4 className="text-sm font-black text-[#1B1D22]">
                  Vista Previa: {excelPreview.fileName}
                </h4>
                <p className="text-xs text-[#44474E]">
                  {excelPreview.catalogo.length} cuentas de detalle detectadas ·{' '}
                  {excelPreview.saldos.length} saldos iniciales leídos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setExcelPreview(null)}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E8EE] text-xs font-bold text-[#747780]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImportExcel}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-[#1A73E8] text-white text-xs font-black shadow-xs"
              >
                {isSaving ? 'Importando...' : 'Confirmar e Importar a Base de Datos'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-blue-100">
              <span className="text-[10px] font-bold text-[#747780] uppercase block">
                Suma Deudor Excel
              </span>
              <span className="font-mono font-black text-sm text-[#1B1D22]">
                {formatCurrency(excelPreview.totalDeudor)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-blue-100">
              <span className="text-[10px] font-bold text-[#747780] uppercase block">
                Suma Acreedor Excel
              </span>
              <span className="font-mono font-black text-sm text-[#1B1D22]">
                {formatCurrency(excelPreview.totalAcreedor)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-blue-100 flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold text-[#1B1D22] cursor-pointer">
                <input
                  type="checkbox"
                  checked={excelPreview.reemplazarCatalogo}
                  onChange={(e) =>
                    setExcelPreview({
                      ...excelPreview,
                      reemplazarCatalogo: e.target.checked,
                    })
                  }
                  disabled={excelPreview.catalogo.length === 0}
                  className="rounded-sm"
                />
                <span>Reemplazar catálogo anterior completo</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* KPIs de Saldos Iniciales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
            Total Saldo Inicial Deudor
          </span>
          <span className="text-lg font-black font-mono text-[#1B1D22]">
            {formatCurrency(totales.totalDeudor)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
            Total Saldo Inicial Acreedor
          </span>
          <span className="text-lg font-black font-mono text-[#1B1D22]">
            {formatCurrency(totales.totalAcreedor)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
            Diferencia de Cuadre Inicial
          </span>
          <span
            className={`text-lg font-black font-mono ${
              totales.cuadrado ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(Math.abs(totales.diferencia))}
          </span>
        </div>

        <div
          className={`p-5 rounded-3xl border shadow-xs flex items-center gap-3 ${
            totales.cuadrado
              ? 'border-emerald-300 bg-emerald-50/70'
              : 'border-amber-300 bg-amber-50/70'
          }`}
        >
          {totales.cuadrado ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-8 h-8 text-amber-600 shrink-0" />
          )}
          <div>
            <span className="text-[10px] font-black uppercase text-[#747780] block">
              Cuentas Cargadas ({totales.cuentasConSaldo} / {items.length})
            </span>
            <span className="text-xs font-black text-[#1B1D22]">
              {totales.cuadrado
                ? `Cuadre Inicial OK · ${totalCuentasCatalogo} nodos`
                : 'Desbalance en Datos Iniciales'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Alta de Cuenta Manual */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#747780] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cuenta por código (ej. 110101), nombre o mayor..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E5E8EE] focus:outline-hidden focus:border-[#1A73E8] bg-[#F8FAFC]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filtroMayor}
              onChange={(e) => setFiltroMayor(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E5E8EE] bg-[#F8FAFC] text-[#1B1D22]"
            >
              <option value="">Todos los Mayores ({mayoresList.length})</option>
              {mayoresList.map(([cod, nom]) => (
                <option key={cod} value={cod}>
                  {cod} - {nom}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs font-bold text-[#1B1D22] cursor-pointer px-2">
              <input
                type="checkbox"
                checked={soloConSaldo}
                onChange={(e) => setSoloConSaldo(e.target.checked)}
                className="rounded-sm border-[#E5E8EE] text-[#1A73E8]"
              />
              <span>Solo con saldo</span>
            </label>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="px-3 py-2 rounded-xl bg-[#F4F6F9] hover:bg-[#E5E8EE] text-xs font-black text-[#1B1D22] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>Nueva Cuenta Inicial</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddCuentaYSaldo}
            className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E5E8EE] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label className="block font-bold text-[#44474E] mb-1">
                Código Cuenta *
              </label>
              <input
                type="text"
                required
                placeholder="ej. 110209"
                value={newCuenta.codigo}
                onChange={(e) =>
                  setNewCuenta({ ...newCuenta, codigo: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-[#44474E] mb-1">
                Nombre de la Cuenta *
              </label>
              <input
                type="text"
                required
                placeholder="Nombre contable"
                value={newCuenta.nombre}
                onChange={(e) =>
                  setNewCuenta({ ...newCuenta, nombre: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#44474E] mb-1">
                Naturaleza *
              </label>
              <select
                value={newCuenta.naturaleza}
                onChange={(e) =>
                  setNewCuenta({
                    ...newCuenta,
                    naturaleza: e.target.value as 'Deudora' | 'Acreedora',
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white"
              >
                <option value="Deudora">Deudora (D)</option>
                <option value="Acreedora">Acreedora (A)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#44474E] mb-1">
                Mayor (4 dígitos)
              </label>
              <input
                type="text"
                placeholder="ej. 1102"
                value={newCuenta.mayorCodigo}
                onChange={(e) =>
                  setNewCuenta({ ...newCuenta, mayorCodigo: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-[#44474E] mb-1">
                Nombre del Mayor
              </label>
              <input
                type="text"
                placeholder="ej. Bancos"
                value={newCuenta.mayorNombre}
                onChange={(e) =>
                  setNewCuenta({ ...newCuenta, mayorNombre: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#44474E] mb-1">
                Saldo Inicial Deudor (C$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newCuenta.deudor}
                onChange={(e) =>
                  setNewCuenta({ ...newCuenta, deudor: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white font-mono text-right"
              />
            </div>
            <div>
              <label className="block font-bold text-[#44474E] mb-1">
                Saldo Inicial Acreedor (C$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newCuenta.acreedor}
                onChange={(e) =>
                  setNewCuenta({ ...newCuenta, acreedor: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white font-mono text-right"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-[#1A73E8] text-white font-black"
              >
                Agregar y Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-xl border border-[#E5E8EE] bg-white font-bold text-[#747780]"
              >
                Cerrar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tabla Editable de Saldos Iniciales */}
      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#747780]">
            Cargando datos iniciales del catálogo BM...
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E8EE] flex items-center justify-between text-xs font-bold text-[#747780]">
            <span>
              Mostrando {filteredItems.length} de {items.length} cuentas de detalle
            </span>
            <span>Corte contable: {fechaCorte}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[9px] font-black uppercase text-[#747780] tracking-wider">
                  <th className="p-3 w-28">Código</th>
                  <th className="p-3">Nombre de la Cuenta</th>
                  <th className="p-3 w-48">Mayor / Renglón</th>
                  <th className="p-3 text-center w-20">Nat.</th>
                  <th className="p-3 text-right w-40">Saldo Deudor (C$)</th>
                  <th className="p-3 text-right w-40">Saldo Acreedor (C$)</th>
                  <th className="p-3 w-48">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-xs font-bold text-[#747780]"
                    >
                      No se encontraron cuentas con saldo o criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => (
                    <tr
                      key={it.codigo}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="p-2.5 font-mono font-bold text-[#1B1D22]">
                        {it.codigo}
                      </td>
                      <td className="p-2.5 font-medium text-[#1B1D22]">
                        {it.nombre}
                      </td>
                      <td className="p-2.5 text-[11px] text-[#747780]">
                        <span className="font-mono font-bold text-[#44474E]">
                          {it.mayorCodigo}
                        </span>{' '}
                        {it.mayorNombre}
                        {it.renglon ? (
                          <span className="block text-[10px] text-[#9AA0A6]">
                            {it.estado} · {it.renglon}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                            it.naturaleza === 'Deudora'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {it.naturaleza === 'Deudora' ? 'D' : 'A'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.deudor}
                          onChange={(e) =>
                            handleAmountChange(it.codigo, 'deudor', e.target.value)
                          }
                          className="w-full px-2.5 py-1 rounded-lg border border-[#E5E8EE] font-mono text-right text-xs font-bold focus:outline-hidden focus:border-[#1A73E8] bg-[#FAFBFD]"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.acreedor}
                          onChange={(e) =>
                            handleAmountChange(
                              it.codigo,
                              'acreedor',
                              e.target.value,
                            )
                          }
                          className="w-full px-2.5 py-1 rounded-lg border border-[#E5E8EE] font-mono text-right text-xs font-bold focus:outline-hidden focus:border-[#1A73E8] bg-[#FAFBFD]"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={it.notas}
                          placeholder="Observación opcional..."
                          onChange={(e) =>
                            handleNotasChange(it.codigo, e.target.value)
                          }
                          className="w-full px-2.5 py-1 rounded-lg border border-[#E5E8EE] text-[11px] focus:outline-hidden focus:border-[#1A73E8] bg-[#FAFBFD]"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot>
                  <tr className="bg-[#1B1D22] text-white font-mono font-black">
                    <td colSpan={4} className="p-3.5 text-right uppercase text-xs">
                      Sumas Totales Iniciales ({items.length} cuentas):
                    </td>
                    <td className="p-3.5 text-right text-xs text-emerald-400">
                      {formatCurrency(totales.totalDeudor)}
                    </td>
                    <td className="p-3.5 text-right text-xs text-blue-300">
                      {formatCurrency(totales.totalAcreedor)}
                    </td>
                    <td className="p-3.5 text-xs">
                      {totales.cuadrado
                        ? 'CUADRADO (0.00)'
                        : `DIF: ${formatCurrency(Math.abs(totales.diferencia))}`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

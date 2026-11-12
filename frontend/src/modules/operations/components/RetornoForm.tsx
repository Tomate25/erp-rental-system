import React, { useMemo, useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createRetorno } from '../services/operations.api';
import {
  ArrowLeft,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Trash2,
  Gauge,
  CalendarClock,
  WalletCards,
  Wrench,
  Clock,
  Package,
  Truck,
  Building2,
  Minus,
  Sparkles,
} from 'lucide-react';
import { calculateReturnTiming, returnClassificationLabel } from '../utils/returnTiming';

interface RetornoFormProps {
  contract: Contract;
  onBack: () => void;
  onSuccess: (createdRetorno?: any) => void;
}

const COMMON_DAMAGE_CHIPS = [
  'Manguera con fuga / Daño de mangueras',
  'Chasis doblado / Daño estructural',
  'Motor no arranca / Falla eléctrica',
  'Rosca o pines barridos',
  'Fuga de aceite / Hidráulico',
  'Revisión preventiva por uso pesado',
];

export const RetornoForm: React.FC<RetornoFormProps> = ({ contract, onBack, onSuccess }) => {
  const [recibidoPor, setRecibidoPor] = useState('');
  const [entregadoPor, setEntregadoPor] = useState(contract.cliente?.nombre || '');
  const [cedulaEntregante, setCedulaEntregante] = useState(contract.cliente?.rfc || contract.cliente?.cedula || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptPreview] = useState(() => new Date());
  const [motivoRetorno, setMotivoRetorno] = useState('');
  const [confirmacion, setConfirmacion] = useState(false);

  // Calcular despachos y retornos previos para saldo real en posesión del cliente
  const despachosPrevios = contract.despachos || [];
  const retornosPrevios = contract.devoluciones || [];

  // Formularios por ítem de retorno
  const [itemForms, setItemForms] = useState(() =>
    contract.items.map((item) => {
      const explicitTipoControl = item.tipoControl || item.equipo?.tipoControl;
      const hasAssignedSerial = Boolean(item.equipo?.numeroSerie && item.equipo.numeroSerie.trim() !== '');
      const isQuantity = explicitTipoControl === 'POR_CANTIDAD' || (!hasAssignedSerial && (item.cantidad || 1) > 1);
      const resolvedTipoControl: 'SERIALIZADO' | 'POR_CANTIDAD' = isQuantity
        ? 'POR_CANTIDAD'
        : (explicitTipoControl || (hasAssignedSerial ? 'SERIALIZADO' : 'POR_CANTIDAD'));

      const tieneHorometro =
        item.equipo?.tieneHorometro !== undefined
          ? Boolean(item.equipo.tieneHorometro)
          : !isQuantity &&
            (Boolean((item.equipo as any)?.categoria?.isLineaAmarilla) ||
              (item.equipo?.horometro || 0) > 0);

      // Despachadas en contrato / despachos
      const despachadas = despachosPrevios.length > 0
        ? despachosPrevios.reduce((acc: number, d: any) => {
            const matches = (d.items || []).filter((di: any) =>
              di.equipoId === item.equipoId || (di.equipo?.id && di.equipo.id === item.equipoId)
            );
            return acc + matches.reduce((iAcc: number, di: any) => iAcc + (Number(di.cantidad) || Number(di.cantidadDespachada) || 1), 0);
          }, 0) || (item.cantidad || 1)
        : (item.cantidad || 1);

      // Retornadas previas
      const yaRetornadas = retornosPrevios.reduce((acc: number, r: any) => {
        const matches = (r.items || []).filter((ri: any) =>
          ri.equipoId === item.equipoId || (ri.equipo?.id && ri.equipo.id === item.equipoId)
        );
        return acc + matches.reduce((iAcc: number, ri: any) => iAcc + (Number(ri.cantidadRetornada) || 0) + (Number(ri.cantidadPerdida) || 0), 0);
      }, 0);

      const saldoEnObra = Math.max(0, despachadas - yaRetornadas);
      const inicialRetornada = saldoEnObra;

      return {
        equipoId: item.equipoId,
        nombreEquipo: item.equipo?.modelo || 'Equipo',
        tipoControl: resolvedTipoControl,
        tieneHorometro,
        numeroSerie: item.equipo?.numeroSerie || '',
        tipoMedicionCombustible: item.equipo?.tipoMedicionCombustible || 'NO_APLICA',
        cantidadDespachada: despachadas,
        cantidadYaRetornada: yaRetornadas,
        saldoEnObra,
        // Los 3 contadores clave:
        cantidadRetornada: inicialRetornada as number | string,
        cantidadPendiente: 0 as number | string,
        cantidadDañada: 0 as number | string,
        cantidadPerdida: 0 as number | string,
        // Avería simplificada para taller
        motivoAveria: '',
        // Horómetro y combustible
        horometroInicial: tieneHorometro ? (item.equipo?.horometro || item.horometroInicial || 0) : 0,
        horometroFinal: (tieneHorometro ? '' : 0) as number | string,
        combustibleRetorno: '',
        inspeccionEstado: {
          funcionamiento: 'FUNCIONA' as '' | 'FUNCIONA' | 'NO_FUNCIONA' | 'NO_VERIFICADO',
          estadoFisico: 'BUENO' as '' | 'BUENO' | 'DESGASTE_NORMAL' | 'DANADO',
          accesoriosCompletos: true as boolean | null,
          observaciones: '',
          fotosTexto: '',
        },
        daniosDetectados: false,
        descripcionDanios: '',
        danios: [] as any[],
        estadoSeleccionado: 'BUENO' as 'BUENO' | 'DANADO' | 'PENDIENTE' | 'PERDIDO',
      };
    })
  );

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...itemForms];
    (updated[index] as any)[field] = value;
    setItemForms(updated);
  };

  // Helpers para manejo numérico y eliminación inmediata de '0' al hacer click
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>, index: number, field: string) => {
    const val = (itemForms[index] as any)[field];
    if (val === 0 || val === '0') {
      handleItemChange(index, field, '');
    }
    e.target.select();
  };

  const handleNumberClick = (e: React.MouseEvent<HTMLInputElement>, index: number, field: string) => {
    const val = (itemForms[index] as any)[field];
    if (val === 0 || val === '0') {
      handleItemChange(index, field, '');
    }
    (e.target as HTMLInputElement).select();
  };

  const handleWheelPrevent = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLElement).blur();
  };

  // Selector de Estado para Equipos Serializados (1 unidad)
  const handleSetSerializedState = (
    index: number,
    state: 'BUENO' | 'DANADO' | 'PENDIENTE' | 'PERDIDO'
  ) => {
    const updated = [...itemForms];
    const item = { ...updated[index] };
    item.estadoSeleccionado = state;

    if (state === 'BUENO') {
      item.cantidadRetornada = 1;
      item.cantidadDañada = 0;
      item.cantidadPendiente = 0;
      item.cantidadPerdida = 0;
      item.inspeccionEstado = {
        ...item.inspeccionEstado,
        funcionamiento: 'FUNCIONA',
        estadoFisico: 'BUENO',
        accesoriosCompletos: true,
      };
      item.daniosDetectados = false;
      item.danios = [];
      item.motivoAveria = '';
    } else if (state === 'DANADO') {
      item.cantidadRetornada = 1;
      item.cantidadDañada = 1;
      item.cantidadPendiente = 0;
      item.cantidadPerdida = 0;
      item.inspeccionEstado = {
        ...item.inspeccionEstado,
        funcionamiento: 'NO_FUNCIONA',
        estadoFisico: 'DANADO',
        accesoriosCompletos: true,
      };
      item.daniosDetectados = true;
      if (!item.motivoAveria) {
        item.motivoAveria = 'Avería detectada al retorno (envío a taller)';
      }
      if (item.danios.length === 0) {
        item.danios = [{
          componente: 'Equipo / Maquinaria',
          tipoDano: item.motivoAveria || 'Avería detectada al retorno (envío a taller)',
          severidad: 'MEDIA',
          cobrable: true,
          costoEstimado: '',
        }];
      }
    } else if (state === 'PENDIENTE') {
      item.cantidadRetornada = 0;
      item.cantidadDañada = 0;
      item.cantidadPendiente = 1;
      item.cantidadPerdida = 0;
      item.daniosDetectados = false;
      item.danios = [];
      item.motivoAveria = '';
    } else if (state === 'PERDIDO') {
      item.cantidadRetornada = 0;
      item.cantidadDañada = 0;
      item.cantidadPendiente = 0;
      item.cantidadPerdida = 1;
      item.daniosDetectados = false;
      item.danios = [];
      item.motivoAveria = '';
    }

    updated[index] = item;
    setItemForms(updated);
  };

  // Selector de Presets Rápidos para Equipos por Cantidad / Volumen
  const handleSetQuantityPreset = (
    index: number,
    preset: 'TODOS_BUENOS' | 'CON_DANOS' | 'TODOS_EN_OBRA'
  ) => {
    const updated = [...itemForms];
    const item = { ...updated[index] };
    const maxSaldo = Number(item.saldoEnObra || item.cantidadDespachada) || 1;

    if (preset === 'TODOS_BUENOS') {
      item.cantidadRetornada = maxSaldo;
      item.cantidadDañada = 0;
      item.cantidadPendiente = 0;
      item.cantidadPerdida = 0;
      item.inspeccionEstado = {
        ...item.inspeccionEstado,
        funcionamiento: 'FUNCIONA',
        estadoFisico: 'BUENO',
        accesoriosCompletos: true,
      };
      item.daniosDetectados = false;
      item.danios = [];
      item.motivoAveria = '';
      item.estadoSeleccionado = 'BUENO';
    } else if (preset === 'CON_DANOS') {
      item.cantidadRetornada = maxSaldo;
      item.cantidadPendiente = 0;
      item.cantidadPerdida = 0;
      if (Number(item.cantidadDañada) <= 0) {
        item.cantidadDañada = 1;
      }
      item.inspeccionEstado = {
        ...item.inspeccionEstado,
        estadoFisico: 'DANADO',
      };
      item.daniosDetectados = true;
      if (!item.motivoAveria) {
        item.motivoAveria = 'Piezas dañadas para reparación en taller';
      }
      if (item.danios.length === 0) {
        item.danios = [{
          componente: 'Lote de equipos',
          tipoDano: item.motivoAveria,
          severidad: 'MEDIA',
          cobrable: true,
          costoEstimado: '',
        }];
      }
      item.estadoSeleccionado = 'DANADO';
    } else if (preset === 'TODOS_EN_OBRA') {
      item.cantidadRetornada = 0;
      item.cantidadDañada = 0;
      item.cantidadPendiente = maxSaldo;
      item.cantidadPerdida = 0;
      item.daniosDetectados = false;
      item.danios = [];
      item.motivoAveria = '';
      item.estadoSeleccionado = 'PENDIENTE';
    }

    updated[index] = item;
    setItemForms(updated);
  };

  // Manejo reactivo bidireccional de cantidades para que SIEMPRE cuadre solo
  const handleQuantityChange = (index: number, field: string, rawVal: string | number) => {
    const updated = [...itemForms];
    const item = { ...updated[index] };
    const maxSaldo = Number(item.saldoEnObra || item.cantidadDespachada) || 1;

    let numVal: number | string = '';
    if (rawVal !== '') {
      const parsed = typeof rawVal === 'number' ? rawVal : parseInt(rawVal, 10);
      numVal = isNaN(parsed) ? '' : Math.max(0, parsed);
    }

    if (field === 'cantidadRetornada') {
      if (numVal === '') {
        item.cantidadRetornada = '';
        item.cantidadPendiente = maxSaldo;
        item.cantidadDañada = 0;
      } else {
        const clampedRec = Math.min(maxSaldo, Number(numVal));
        item.cantidadRetornada = clampedRec;
        const perd = item.cantidadPerdida === '' ? 0 : Number(item.cantidadPerdida);
        item.cantidadPendiente = Math.max(0, maxSaldo - clampedRec - perd);
        // Dañadas no pueden superar las recibidas
        const dan = item.cantidadDañada === '' ? 0 : Number(item.cantidadDañada);
        if (dan > clampedRec) {
          item.cantidadDañada = clampedRec;
        }
      }
    } else if (field === 'cantidadPendiente') {
      if (numVal === '') {
        item.cantidadPendiente = '';
        item.cantidadRetornada = maxSaldo;
      } else {
        const clampedPend = Math.min(maxSaldo, Number(numVal));
        item.cantidadPendiente = clampedPend;
        const perd = item.cantidadPerdida === '' ? 0 : Number(item.cantidadPerdida);
        const autoRec = Math.max(0, maxSaldo - clampedPend - perd);
        item.cantidadRetornada = autoRec;
        const dan = item.cantidadDañada === '' ? 0 : Number(item.cantidadDañada);
        if (dan > autoRec) {
          item.cantidadDañada = autoRec;
        }
      }
    } else if (field === 'cantidadDañada') {
      const rec = item.cantidadRetornada === '' ? 0 : Number(item.cantidadRetornada);
      if (numVal === '') {
        item.cantidadDañada = '';
        item.daniosDetectados = false;
      } else {
        const clampedDan = Math.min(rec, Number(numVal));
        item.cantidadDañada = clampedDan;
        if (clampedDan > 0) {
          item.daniosDetectados = true;
          if (item.inspeccionEstado.estadoFisico !== 'DANADO') {
            item.inspeccionEstado = { ...item.inspeccionEstado, estadoFisico: 'DANADO' };
          }
          if (!item.motivoAveria) {
            item.motivoAveria = 'Piezas dañadas para reparación en taller';
          }
        } else {
          item.daniosDetectados = false;
        }
      }
    } else if (field === 'cantidadPerdida') {
      const clampedPerd = numVal === '' ? 0 : Math.min(maxSaldo, Number(numVal));
      item.cantidadPerdida = numVal === '' ? '' : clampedPerd;
      const rec = item.cantidadRetornada === '' ? 0 : Number(item.cantidadRetornada);
      item.cantidadPendiente = Math.max(0, maxSaldo - rec - clampedPerd);
    }

    updated[index] = item;
    setItemForms(updated);
  };

  // Botones +/- de ajuste rápido en 1 unidad
  const handleStepQuantity = (index: number, field: string, delta: number) => {
    const current = itemForms[index] as any;
    const currentVal = current[field] === '' ? 0 : Number(current[field]);
    const nextVal = Math.max(0, currentVal + delta);
    handleQuantityChange(index, field, nextVal);
  };

  const handleAddDanio = (itemIndex: number) => {
    const updated = [...itemForms];
    updated[itemIndex].danios.push({
      componente: '',
      tipoDano: '',
      severidad: 'MEDIA',
      cobrable: true,
      costoEstimado: '',
    });
    updated[itemIndex].daniosDetectados = true;
    setItemForms(updated);
  };

  const handleRemoveDanio = (itemIndex: number, danioIndex: number) => {
    const updated = [...itemForms];
    updated[itemIndex].danios = updated[itemIndex].danios.filter((_, i) => i !== danioIndex);
    if (updated[itemIndex].danios.length === 0 && !updated[itemIndex].motivoAveria) {
      updated[itemIndex].daniosDetectados = false;
      if (Number(updated[itemIndex].cantidadDañada) > 0) {
        updated[itemIndex].cantidadDañada = 0;
      }
    }
    setItemForms(updated);
  };

  const handleDanioChange = (itemIndex: number, danioIndex: number, field: string, value: any) => {
    const updated = [...itemForms];
    updated[itemIndex].danios[danioIndex][field] = value;
    setItemForms(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Debe haber al menos un equipo recibido o perdido en este retorno
    const totalMovimiento = itemForms.reduce(
      (sum, it) => sum + (Number(it.cantidadRetornada) || 0) + (Number(it.cantidadPerdida) || 0),
      0
    );
    if (totalMovimiento === 0) {
      setError('Debe registrar al menos un equipo recibido o reportado como perdido en este retorno.');
      return;
    }

    // 2. Validación de inspección solo para los equipos que físicamente regresan
    if (
      itemForms.some((item) => {
        const isReturning = (Number(item.cantidadRetornada) || 0) > 0;
        if (!isReturning) return false;
        return (
          !item.inspeccionEstado.funcionamiento ||
          !item.inspeccionEstado.estadoFisico ||
          item.inspeccionEstado.accesoriosCompletos === null
        );
      })
    ) {
      setError('Complete la inspección de funcionamiento, estado físico y accesorios de cada equipo recibido.');
      return;
    }

    // 3. Validación de horómetro solo para máquinas con motor recibidas
    if (
      itemForms.some((item) => {
        const isReturning = (Number(item.cantidadRetornada) || 0) > 0;
        if (!isReturning) return false;
        return (
          item.tieneHorometro &&
          (item.horometroFinal === '' ||
            (item.tipoMedicionCombustible !== 'NO_APLICA' && !item.combustibleRetorno.trim()))
        );
      })
    ) {
      setError('Registre la lectura real del horómetro y combustible de cada máquina recibida.');
      return;
    }

    if (
      itemForms.some((item) => {
        const isReturning = (Number(item.cantidadRetornada) || 0) > 0;
        if (!isReturning) return false;
        return (
          item.tieneHorometro &&
          (Number(item.horometroFinal) < Number(item.horometroInicial) ||
            !Number.isFinite(Number(item.horometroFinal)))
        );
      })
    ) {
      setError('El horómetro final debe ser igual o mayor que la lectura inicial registrada.');
      return;
    }

    // 4. Validación de balance de unidades para lotes
    for (const it of itemForms) {
      if (it.tipoControl !== 'SERIALIZADO') {
        const maxSaldo = Number(it.saldoEnObra || it.cantidadDespachada) || 1;
        const rec = Number(it.cantidadRetornada) || 0;
        const pend = Number(it.cantidadPendiente) || 0;
        const perd = Number(it.cantidadPerdida) || 0;
        const dan = Number(it.cantidadDañada) || 0;
        const totalRegistrado = rec + pend + perd;
        if (totalRegistrado !== maxSaldo) {
          setError(
            `Descuadre en "${it.nombreEquipo}": Se registraron ${rec} recibidas (${Math.max(0, rec - dan)} sanas + ${dan} a taller) + ${pend} pendientes en obra + ${perd} perdidas (${totalRegistrado} u. en total), pero el cliente tiene ${maxSaldo} unidades pendientes. Debe cuadrar exactamente la suma antes de emitir el acta.`
          );
          return;
        }
        if (dan > rec) {
          setError(
            `En "${it.nombreEquipo}", la cantidad para reparación (${dan}) no puede ser mayor que las unidades recibidas (${rec}).`
          );
          return;
        }
      }
    }

    if (timing.classification === 'ANTICIPADO' && !motivoRetorno.trim()) {
      setError('Indique el motivo del retorno anticipado para incorporarlo al acta.');
      return;
    }
    if (!confirmacion) {
      setError('Confirme que revisó la inspección y la liquidación preliminar.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const itemsRetornados = itemForms.filter(
        (it) => (Number(it.cantidadRetornada) || 0) + (Number(it.cantidadPerdida) || 0) > 0
      );

      const res = await createRetorno({
        contratoId: contract.id,
        actaRetornoData: {
          fechaInicioPactada: contract.fechaInicio,
          fechaFinPactada: contract.fechaFinPactada || contract.fechaFin,
          fechaRecepcionFisica: receiptPreview.toISOString(),
          clasificacionEstimada: timing.classification,
          motivoRetorno: motivoRetorno.trim() || undefined,
          politicaCobro: 'TIEMPO_EFECTIVO_TARIFA_PACTADA',
          excluirDiaDevolucion: true,
          ceseCobro: 'RECEPCION_FISICA',
          tipoRetorno: isTotalReturn ? 'TOTAL' : 'PARCIAL',
          liquidacionPreliminar: {
            diasPactados: timing.contractedDays,
            diasCobrados: timing.effectiveDays,
            diasAnticipados: timing.classification === 'ANTICIPADO' ? timing.differenceDays : 0,
          },
          items: itemForms.map((item) => {
            const rec = Number(item.cantidadRetornada) || 0;
            const perd = Number(item.cantidadPerdida) || 0;
            const dan = Number(item.cantidadDañada) || 0;
            const pend = Number(item.cantidadPendiente) || 0;
            const destino = perd > 0
              ? 'FUERA_DE_SERVICIO'
              : rec === 0
                ? 'EN_OBRA_PENDIENTE'
                : dan > 0 || item.daniosDetectados || item.inspeccionEstado.estadoFisico === 'DANADO'
                  ? 'MANTENIMIENTO'
                  : 'DISPONIBLE';

            // Auto-poblar daños si hay unidades a taller pero no se desgarró tabla manual
            const finalDanios = (item.danios && item.danios.length > 0)
              ? item.danios
              : (dan > 0 || item.daniosDetectados || destino === 'MANTENIMIENTO')
                ? [{
                    componente: 'Equipo / Maquinaria',
                    tipoDano: item.motivoAveria || item.descripcionDanios || 'Avería detectada al retorno (envío a taller)',
                    severidad: 'MEDIA',
                    cobrable: true,
                    costoEstimado: '',
                  }]
                : [];

            return {
              equipoId: item.equipoId,
              nombreEquipo: item.nombreEquipo,
              numeroSerie: item.numeroSerie,
              cantidadDespachada: Number(item.cantidadDespachada),
              cantidadRetornada: rec,
              cantidadBuenEstado: Math.max(0, rec - dan),
              cantidadDañada: dan,
              cantidadPendienteObra: pend,
              cantidadPerdida: perd,
              destinoEquipo: destino,
              motivoAveria: item.motivoAveria || undefined,
              horometroInicial: item.tieneHorometro ? Number(item.horometroInicial) : 0,
              horometroFinal: !item.tieneHorometro || item.horometroFinal === '' ? undefined : Number(item.horometroFinal),
              horasTrabajadas: !item.tieneHorometro || item.horometroFinal === '' ? undefined : Math.max(0, Number(item.horometroFinal) - Number(item.horometroInicial)),
              combustibleRetorno: item.combustibleRetorno || undefined,
              inspeccionEstado: item.inspeccionEstado,
              danios: finalDanios,
            };
          }),
        },
        recibidoPor,
        entregadoPor,
        cedulaEntregante,
        items: itemsRetornados.map((item) => {
          const rec = Number(item.cantidadRetornada) || 0;
          const perd = Number(item.cantidadPerdida) || 0;
          const dan = Number(item.cantidadDañada) || 0;
          const pend = Number(item.cantidadPendiente) || 0;

          const finalDanios = (item.danios && item.danios.length > 0)
            ? item.danios
            : (dan > 0 || item.daniosDetectados || item.inspeccionEstado.estadoFisico === 'DANADO')
              ? [{
                  componente: 'Equipo / Maquinaria',
                  tipoDano: item.motivoAveria || item.descripcionDanios || 'Avería detectada al retorno (envío a taller)',
                  severidad: 'MEDIA',
                  cobrable: true,
                  costoEstimado: '',
                }]
              : [];

          return {
            equipoId: item.equipoId,
            numeroSerie: item.numeroSerie,
            cantidadDespachada: Number(item.cantidadDespachada),
            cantidadRetornada: rec,
            cantidadBuenEstado: Math.max(0, rec - dan),
            cantidadDañada: dan,
            cantidadPendienteObra: pend,
            cantidadPerdida: perd,
            horometroFinal: !item.tieneHorometro || item.horometroFinal === '' ? undefined : Number(item.horometroFinal),
            combustibleRetorno: item.combustibleRetorno || undefined,
            inspeccionEstado: {
              funcionamiento: (item.inspeccionEstado.funcionamiento || (dan > 0 ? 'NO_FUNCIONA' : 'FUNCIONA')) as 'FUNCIONA' | 'NO_FUNCIONA' | 'NO_VERIFICADO',
              estadoFisico: (item.inspeccionEstado.estadoFisico || (dan > 0 ? 'DANADO' : 'BUENO')) as 'BUENO' | 'DESGASTE_NORMAL' | 'DANADO',
              accesoriosCompletos: Boolean(item.inspeccionEstado.accesoriosCompletos),
              observaciones: [item.inspeccionEstado.observaciones, item.motivoAveria].filter(Boolean).join(' · '),
              fotosUrls: item.inspeccionEstado.fotosTexto.split(/[\n,]/).map(value => value.trim()).filter(Boolean),
            },
            daniosDetectados: item.daniosDetectados || dan > 0,
            descripcionDanios: item.descripcionDanios || item.motivoAveria,
            danios: finalDanios.map(({ costoEstimado, ...danio }: any) => ({
              ...danio,
              ...(costoEstimado === '' || costoEstimado == null ? {} : { costoEstimado: Number(costoEstimado) }),
            }))
          };
        })
      });

      onSuccess(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar la recepción de retorno');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateInspection = (index: number, field: string, value: string | boolean) => {
    setItemForms(current => current.map((item, position) => {
      if (position !== index) return item;
      const updatedInspection = { ...item.inspeccionEstado, [field]: value };
      return {
        ...item,
        inspeccionEstado: updatedInspection,
      };
    }));
  };

  const timing = useMemo(() => calculateReturnTiming(contract, receiptPreview), [contract, receiptPreview]);
  const isTotalReturn = itemForms.every((item) =>
    (Number(item.cantidadRetornada) || 0) + (Number(item.cantidadPerdida) || 0) >= Number(item.saldoEnObra || item.cantidadDespachada),
  );
  const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat('es-NI', {
    timeZone: 'America/Managua', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
  const money = (value: number) => `C$ ${value.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Métricas Consolidadas del Viaje de Retorno
  const totalNosTraen = itemForms.reduce((sum, it) => sum + (Number(it.cantidadRetornada) || 0), 0);
  const totalEnObra = itemForms.reduce((sum, it) => sum + (Number(it.cantidadPendiente) || 0), 0);
  const totalMantenimiento = itemForms.reduce((sum, it) => sum + (Number(it.cantidadDañada) || 0), 0);
  const totalSanosBodega = Math.max(0, totalNosTraen - totalMantenimiento);

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full max-w-5xl mx-auto">
      
      {/* Encabezado Principal Completo de Pantalla */}
      <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-4 bg-white p-6 rounded-2xl border shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="btn-precision-outline text-xs flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          
          <div>
            <span className="text-[10px] font-black text-[#C55500] uppercase tracking-wider block font-mono">
              RETORNO DE CONTRATO N°: {contract.codigo}
            </span>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">
              Registrar Retorno de Equipos e Inspección de Recepción
            </h2>
            <p className="text-xs text-[#747780] font-medium">
              Cliente: <span className="font-bold text-[#1B1D22]">{contract.cliente?.nombre}</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-[#FDF2E9] text-[#C55500] px-4 py-2 rounded-xl border border-[#C55500]/20">
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Recepción Oficial</span>
        </div>
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E8EE] rounded-3xl p-8 shadow-xs space-y-6">
        
        {error && (
          <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 📊 RESUMEN CONSOLIDADO DEL VIAJE DE RETORNO */}
        <section className="bg-gradient-to-r from-[#F8FAFC] via-white to-[#F8FAFC] p-4 rounded-2xl border-2 border-[#E5E8EE] space-y-2">
          <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
            <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C55500]" /> Resumen de Recepción del Viaje
            </span>
            <span className="text-[11px] font-bold text-[#747780]">
              Control Inmediato de Patio BM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Nos Traen */}
            <div className="bg-emerald-50/80 border-2 border-emerald-300 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">
                  1. Nos Traen (Recibidas)
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-mono text-emerald-800">{totalNosTraen}</span>
                  <span className="text-xs font-bold text-emerald-700">unidades</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  ({totalSanosBodega} sanas entran a bodega)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            {/* 2. En Obra */}
            <div className="bg-blue-50/80 border-2 border-blue-300 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">
                  2. Quedan en Obra
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-mono text-blue-800">{totalEnObra}</span>
                  <span className="text-xs font-bold text-blue-700">unidades</span>
                </div>
                <span className="text-[10px] text-blue-700 font-semibold block">
                  (Continúan en renta activa)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* 3. A Mantenimiento */}
            <div className="bg-amber-50/80 border-2 border-amber-300 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                  3. A Mantenimiento / Taller
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-mono text-amber-800">{totalMantenimiento}</span>
                  <span className="text-xs font-bold text-amber-700">unidades</span>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold block">
                  (Pasan a orden de trabajo)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Vigencia */}
        <section className="rounded-2xl border border-[#1A73E8]/25 bg-[#E8F0FE]/45 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#1A73E8]" /> Vigencia pactada vs. recepción física
            </h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${timing.classification === 'ANTICIPADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : timing.classification === 'TARDIO' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
              {returnClassificationLabel(timing)}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Inicio pactado</span><b>{formatDateTime(contract.fechaInicio)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Retorno previsto</span><b>{formatDateTime(contract.fechaFinPactada || contract.fechaFin)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Recepción física</span><b>{formatDateTime(receiptPreview)}</b><small className="block text-[#747780] mt-1">Vista previa; el servidor fija la hora oficial al guardar.</small></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Tipo de retorno</span><b>{isTotalReturn ? 'TOTAL' : 'PARCIAL'}</b></div>
          </div>
          {timing.classification === 'ANTICIPADO' && <label className="text-xs font-extrabold uppercase block">Motivo del retorno anticipado
            <textarea value={motivoRetorno} onChange={e => setMotivoRetorno(e.target.value)} className="precision-input text-xs mt-1" placeholder="Motivo informado por el cliente" required />
          </label>}
          <p className="text-[11px] text-[#37474F]">El cobro termina al recibirse físicamente el equipo. El día de devolución no se cobra.</p>
        </section>

        {/* Información del Receptor */}
        <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E5E8EE] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-extrabold text-[#37474F] uppercase">Entregado por
              <input value={entregadoPor} onChange={e => setEntregadoPor(e.target.value)} className="precision-input text-xs mt-1" placeholder="Persona que devuelve el equipo" required />
            </label>
            <label className="text-xs font-extrabold text-[#37474F] uppercase">Cédula de quien entrega
              <input value={cedulaEntregante} onChange={e => setCedulaEntregante(e.target.value)} className="precision-input text-xs mt-1" placeholder="Número de identificación" />
            </label>
          </div>
          <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block">
            Personal Responsable de la Recepción en Almacén BM
          </label>
          <input
            type="text"
            value={recibidoPor}
            onChange={(e) => setRecibidoPor(e.target.value)}
            placeholder="Ej. Pedro Morales (Jefe de Almacén BM)"
            className="precision-input text-xs"
            required
          />
        </div>

        {/* Inspección por Ítem */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider border-b border-[#E5E8EE] pb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C55500]" />
            Control de Retorno, Estado Físico y Destino por Equipo
          </h3>

          <div className="space-y-5">
            {itemForms.map((item, idx) => {
              const horasUso = item.horometroFinal === '' ? null : Math.max(0, Number(item.horometroFinal) - Number(item.horometroInicial));
              const estaRecibido = (Number(item.cantidadRetornada) || 0) > 0;
              const estaEnObra = item.estadoSeleccionado === 'PENDIENTE' || (!estaRecibido && Number(item.cantidadPendiente) > 0);

              const despachadas = Number(item.cantidadDespachada) || 1;
              const yaRetornadas = Number(item.cantidadYaRetornada) || 0;
              const maxSaldo = Number(item.saldoEnObra || despachadas) || 1;
              const recibidas = item.cantidadRetornada === '' ? 0 : Number(item.cantidadRetornada);
              const danadas = item.cantidadDañada === '' ? 0 : Number(item.cantidadDañada);
              const buenEstado = Math.max(0, recibidas - danadas);
              const pendientes = item.cantidadPendiente === '' ? 0 : Number(item.cantidadPendiente);
              const perdidas = item.cantidadPerdida === '' ? 0 : Number(item.cantidadPerdida);
              const totalBalance = recibidas + pendientes + perdidas;
              const balanceDiff = maxSaldo - totalBalance;
              const isBalanced = balanceDiff === 0;

              return (
                <div key={idx} className="bg-white border-2 border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4">
                  
                  {/* Encabezado del Ítem */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E8EE] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        item.tipoControl === 'SERIALIZADO' ? 'bg-[#1A73E8]/10 text-[#1A73E8]' : 'bg-[#C55500]/10 text-[#C55500]'
                      }`}>
                        {item.tipoControl === 'SERIALIZADO' ? 'Maquinaria Serializada' : 'Lote por Cantidad'}
                      </span>
                      <h4 className="font-extrabold text-[#1B1D22] text-sm uppercase">{item.nombreEquipo}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {item.numeroSerie && (
                        <span className="text-xs font-mono font-bold text-[#747780] bg-slate-100 px-2 py-0.5 rounded">
                          S/N: {item.numeroSerie}
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-[#747780]">
                        Despachadas: {despachadas} u.
                        {yaRetornadas > 0 && <span className="text-emerald-700 ml-1">({yaRetornadas} devueltas previas)</span>}
                        {maxSaldo < despachadas && <span className="text-blue-700 ml-1">· Saldo en obra: {maxSaldo} u.</span>}
                      </span>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      CASO A: EQUIPO SERIALIZADO (Selector de 4 Estados Visuales)
                     ───────────────────────────────────────────────────────────── */}
                  {item.tipoControl === 'SERIALIZADO' && (
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
                        <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#1A73E8]" />
                          Estado de Retorno del Equipo
                        </label>
                        <span className="text-[10px] font-bold text-[#747780]">
                          Seleccione la situación del equipo en esta devolución
                        </span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        
                        {/* 1. Llegó Operativo / Sano */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'BUENO')}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            item.estadoSeleccionado === 'BUENO'
                              ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                              : 'bg-white border-[#E5E8EE] hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Llegó Operativo
                            </span>
                            {item.estadoSeleccionado === 'BUENO' && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                          </div>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            En buen estado. Pasa a <b className="text-emerald-900">DISPONIBLE</b> en almacén.
                          </p>
                        </button>

                        {/* 2. Llegó Dañado / A Reparación (Taller) */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'DANADO')}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            item.estadoSeleccionado === 'DANADO'
                              ? 'bg-amber-50 border-amber-500 shadow-xs'
                              : 'bg-white border-[#E5E8EE] hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                              <Wrench className="w-4 h-4 text-amber-600" /> Llegó Dañado
                            </span>
                            {item.estadoSeleccionado === 'DANADO' && (
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                            )}
                          </div>
                          <p className="text-[10px] text-amber-700 font-medium">
                            Avería detectada. Pasa a <b className="text-amber-900">TALLER / REPARACIÓN</b>.
                          </p>
                        </button>

                        {/* 3. No Regresó (Falta / Queda en Obra) */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'PENDIENTE')}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            item.estadoSeleccionado === 'PENDIENTE'
                              ? 'bg-blue-50 border-blue-500 shadow-xs'
                              : 'bg-white border-[#E5E8EE] hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-blue-600" /> No Regresó
                            </span>
                            {item.estadoSeleccionado === 'PENDIENTE' && (
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="text-[10px] text-blue-700 font-medium">
                            Falta por devolver. <b className="text-blue-900">Continúa en obra</b> bajo renta.
                          </p>
                        </button>

                        {/* 4. Extraviado / Perdido */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'PERDIDO')}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            item.estadoSeleccionado === 'PERDIDO'
                              ? 'bg-red-50 border-red-500 shadow-xs'
                              : 'bg-white border-[#E5E8EE] hover:border-red-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-red-800 flex items-center gap-1.5">
                              <Trash2 className="w-4 h-4 text-red-600" /> Extraviado
                            </span>
                            {item.estadoSeleccionado === 'PERDIDO' && (
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </div>
                          <p className="text-[10px] text-red-700 font-medium">
                            Pérdida definitiva. Pasa a <b className="text-red-900">BAJA / REPOSICIÓN</b>.
                          </p>
                        </button>

                      </div>

                      {/* Notificación informativa del estado */}
                      {item.estadoSeleccionado === 'PENDIENTE' && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            <b>Equipo pendiente en obra:</b> Esta máquina no vino en el camión de retorno. Continuará en estado <b>ALQUILADO</b> en el contrato y se omiten las lecturas físicas de horómetro y de taller hasta su recepción futura.
                          </span>
                        </div>
                      )}

                      {item.estadoSeleccionado === 'DANADO' && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <b>Equipo enviado a taller / reparación:</b> Al registrar este retorno, el sistema creará automáticamente la orden de trabajo en Mantenimiento y clasificará el equipo como <b>EN MANTENIMIENTO</b>. Escribe el motivo abajo.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO B: EQUIPOS POR CANTIDAD (Desglose Volumétrico y Tarjetas)
                     ───────────────────────────────────────────────────────────── */}
                  {item.tipoControl !== 'SERIALIZADO' && (
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE] space-y-4">
                      
                      {/* Cabecera con Botones Rápidos de 1 Clic */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8EE] pb-2.5">
                        <div>
                          <span className="text-xs font-black uppercase text-[#1B1D22] flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-[#C55500]" /> Desglose de Retorno y Balance de Obra
                          </span>
                          <span className="text-[11px] text-[#747780] font-medium">
                            Total en Obra del Cliente: <b className="font-mono text-[#1B1D22]">{maxSaldo} u.</b>
                            {despachadas !== maxSaldo && <span className="ml-1 text-[10px]">({despachadas} despachadas inicialmente)</span>}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'TODOS_BUENOS')}
                            className="px-2.5 py-1 text-[11px] font-black rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Llegaron Todos Sanos ({maxSaldo} u.)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'CON_DANOS')}
                            className="px-2.5 py-1 text-[11px] font-black rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Wrench className="w-3.5 h-3.5" /> Reportar Dañados a Taller
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'TODOS_EN_OBRA')}
                            className="px-2.5 py-1 text-[11px] font-black rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" /> Ninguno Regresó (En Obra)
                          </button>
                        </div>
                      </div>

                      {/* Tarjetas de Cantidad en 4 Columnas con Steppers +/- */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        
                        {/* 1. Recibidas en este viaje */}
                        <div className="bg-white p-3 rounded-xl border-2 border-emerald-300 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-emerald-900 uppercase">
                              1. ¿Cuánto vino? (Recibidas) *
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              En Almacén
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadRetornada', -1)}
                              className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black border border-emerald-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Restar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={maxSaldo}
                              value={item.cantidadRetornada}
                              onChange={(e) => handleQuantityChange(idx, 'cantidadRetornada', e.target.value)}
                              onFocus={(e) => handleNumberFocus(e, idx, 'cantidadRetornada')}
                              onClick={(e) => handleNumberClick(e, idx, 'cantidadRetornada')}
                              onWheel={handleWheelPrevent}
                              className="w-full precision-input text-center text-base font-mono font-black text-emerald-800 bg-emerald-50/40 border-emerald-300 focus:border-emerald-600"
                              placeholder="0"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadRetornada', 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black border border-emerald-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-emerald-800 font-bold block text-center">
                            Flete actual: {recibidas} u.
                          </span>
                        </div>

                        {/* 2. Dañadas a Taller / Reparación */}
                        <div className="bg-white p-3 rounded-xl border-2 border-amber-300 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-amber-900 uppercase">
                              2. Dañadas (A Taller)
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Reparación
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadDañada', -1)}
                              className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-black border border-amber-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Restar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={recibidas}
                              value={item.cantidadDañada}
                              onChange={(e) => handleQuantityChange(idx, 'cantidadDañada', e.target.value)}
                              onFocus={(e) => handleNumberFocus(e, idx, 'cantidadDañada')}
                              onClick={(e) => handleNumberClick(e, idx, 'cantidadDañada')}
                              onWheel={handleWheelPrevent}
                              className="w-full precision-input text-center text-base font-mono font-black text-amber-900 bg-amber-50/40 border-amber-300 focus:border-amber-600"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadDañada', 1)}
                              className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-black border border-amber-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-emerald-700 font-bold">
                              Sanas: <b>{buenEstado} u.</b>
                            </span>
                            <span className="text-amber-800 font-bold">
                              Taller: <b>{danadas} u.</b>
                            </span>
                          </div>
                        </div>

                        {/* 3. Faltan por regresar (En Obra) */}
                        <div className="bg-white p-3 rounded-xl border-2 border-blue-300 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-blue-900 uppercase">
                              3. ¿Cuánto falta? (En Obra) ⏳
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              Pendiente
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPendiente', -1)}
                              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-black border border-blue-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Restar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={maxSaldo}
                              value={item.cantidadPendiente}
                              onChange={(e) => handleQuantityChange(idx, 'cantidadPendiente', e.target.value)}
                              onFocus={(e) => handleNumberFocus(e, idx, 'cantidadPendiente')}
                              onClick={(e) => handleNumberClick(e, idx, 'cantidadPendiente')}
                              onWheel={handleWheelPrevent}
                              className="w-full precision-input text-center text-base font-mono font-black text-blue-900 bg-blue-50/40 border-blue-300 focus:border-blue-600"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPendiente', 1)}
                              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-black border border-blue-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-blue-800 font-bold block text-center">
                            Quedan alquiladas en obra
                          </span>
                        </div>

                        {/* 4. Perdidas / Extraviadas */}
                        <div className="bg-white p-3 rounded-xl border-2 border-red-300 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-red-900 uppercase">
                              4. Perdidas / Extraviadas
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                              Reposición
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPerdida', -1)}
                              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 font-black border border-red-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Restar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={maxSaldo}
                              value={item.cantidadPerdida}
                              onChange={(e) => handleQuantityChange(idx, 'cantidadPerdida', e.target.value)}
                              onFocus={(e) => handleNumberFocus(e, idx, 'cantidadPerdida')}
                              onClick={(e) => handleNumberClick(e, idx, 'cantidadPerdida')}
                              onWheel={handleWheelPrevent}
                              className="w-full precision-input text-center text-base font-mono font-black text-red-900 bg-red-50/40 border-red-300 focus:border-red-600"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPerdida', 1)}
                              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 font-black border border-red-200 flex items-center justify-center cursor-pointer shrink-0"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-red-700 font-bold block text-center">
                            Cobro de reposición
                          </span>
                        </div>

                      </div>

                      {/* Barra Reactiva de Balance y Validación Matemática */}
                      <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        isBalanced
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          {isBalanced ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          <span className="font-bold">
                            {isBalanced ? (
                              <>
                                Balance exacto: <span className="font-black">{recibidas} recibidas</span> ({buenEstado} sanas + {danadas} taller) + <span className="font-black">{pendientes} en obra</span> + <span className="font-black">{perdidas} perdidas</span> = <span className="font-black">{maxSaldo} despachadas</span>.
                              </>
                            ) : (
                              <>
                                Descuadre de balance: Registradas {totalBalance} de {maxSaldo} unidades en obra.{' '}
                                {balanceDiff > 0
                                  ? `Faltan ${balanceDiff} u. por justificar (indique si quedan en obra o están perdidas).`
                                  : `Sobran ${Math.abs(balanceDiff)} u. por encima de las ${maxSaldo} unidades.`}
                              </>
                            )}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                          isBalanced ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {isBalanced ? 'CUADRADO' : `${Math.abs(balanceDiff)} DIFERENCIA`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      HORÓMETRO FINAL (Solo si la máquina fue recibida)
                     ───────────────────────────────────────────────────────────── */}
                  {item.tieneHorometro && !estaEnObra && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                            Horómetro Inicial
                          </label>
                          <input
                            type="text"
                            value={`${item.horometroInicial} hrs`}
                            disabled
                            className="precision-input text-xs font-mono font-bold bg-[#EFF3F8]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                            Horómetro Final (Retorno) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={item.horometroFinal}
                              onChange={(e) => handleItemChange(idx, 'horometroFinal', e.target.value)}
                              onFocus={(e) => handleNumberFocus(e, idx, 'horometroFinal')}
                              onClick={(e) => handleNumberClick(e, idx, 'horometroFinal')}
                              onWheel={handleWheelPrevent}
                              className="precision-input text-xs font-mono font-black pl-8 border-[#C55500]/40 focus:border-[#C55500]"
                              placeholder="0.0"
                              required={estaRecibido}
                            />
                            <Gauge className="w-4 h-4 text-[#C55500] absolute left-2.5 top-2.5" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                            Horas de Uso Calculadas
                          </label>
                          <div className="precision-input text-xs font-mono font-black bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-between">
                            <span>{horasUso === null ? 'Pendiente de lectura' : `+${horasUso.toFixed(1)} hrs`}</span>
                            <span className="text-[9px] font-bold uppercase">Uso Registrado</span>
                          </div>
                        </div>
                      </div>

                      {item.tipoMedicionCombustible !== 'NO_APLICA' && (
                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                            Combustible al retornar ({item.tipoMedicionCombustible})
                          </label>
                          <input
                            value={item.combustibleRetorno}
                            onChange={(e) => handleItemChange(idx, 'combustibleRetorno', e.target.value)}
                            className="precision-input text-xs"
                            placeholder="Lectura real del indicador"
                            required={estaRecibido}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      LISTA DE INSPECCIÓN (Solo si fue recibido físicamente)
                     ───────────────────────────────────────────────────────────── */}
                  {!estaEnObra && (
                    <div className="rounded-2xl border border-[#E5E8EE] bg-[#F8FAFC] p-4 space-y-3">
                      <h5 className="text-xs font-black uppercase text-[#37474F] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1A73E8]" /> Inspección Técnica de Recepción
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="text-xs font-bold">Funcionamiento
                          <select
                            value={item.inspeccionEstado.funcionamiento}
                            onChange={(e) => updateInspection(idx, 'funcionamiento', e.target.value)}
                            className="precision-input text-xs mt-1"
                            required={estaRecibido}
                          >
                            <option value="">Seleccione</option>
                            <option value="FUNCIONA">Funciona</option>
                            <option value="NO_FUNCIONA">No funciona</option>
                            <option value="NO_VERIFICADO">No se pudo verificar</option>
                          </select>
                        </label>
                        <label className="text-xs font-bold">Estado físico
                          <select
                            value={item.inspeccionEstado.estadoFisico}
                            onChange={(e) => updateInspection(idx, 'estadoFisico', e.target.value)}
                            className="precision-input text-xs mt-1"
                            required={estaRecibido}
                          >
                            <option value="">Seleccione</option>
                            <option value="BUENO">Buen estado</option>
                            <option value="DESGASTE_NORMAL">Desgaste normal</option>
                            <option value="DANADO">Dañado</option>
                          </select>
                        </label>
                        <label className="text-xs font-bold">Accesorios
                          <select
                            value={item.inspeccionEstado.accesoriosCompletos === null ? '' : String(item.inspeccionEstado.accesoriosCompletos)}
                            onChange={(e) => updateInspection(idx, 'accesoriosCompletos', e.target.value === 'true')}
                            className="precision-input text-xs mt-1"
                            required={estaRecibido}
                          >
                            <option value="">Seleccione</option>
                            <option value="true">Completos</option>
                            <option value="false">Faltantes</option>
                          </select>
                        </label>
                      </div>
                      <textarea
                        value={item.inspeccionEstado.observaciones}
                        onChange={(e) => updateInspection(idx, 'observaciones', e.target.value)}
                        className="precision-input text-xs"
                        placeholder="Observaciones de la inspección física"
                        aria-label="Observaciones de la inspección"
                      />
                      <textarea
                        value={item.inspeccionEstado.fotosTexto}
                        onChange={(e) => updateInspection(idx, 'fotosTexto', e.target.value)}
                        className="precision-input text-xs"
                        placeholder="Enlaces de fotos, uno por línea"
                        aria-label="Enlaces de fotos del retorno"
                      />
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      REPORTE DE DAÑOS Y ENVÍO A REPARACIÓN / TALLER
                     ───────────────────────────────────────────────────────────── */}
                  {!estaEnObra && (
                    <div className="border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-[#C55500]" />
                          <span className="text-xs font-extrabold text-[#1B1D22] uppercase tracking-wider">
                            Determinar fallas y enviar a mantenimiento
                          </span>
                          {(item.daniosDetectados || Number(item.cantidadDañada) > 0 || item.inspeccionEstado.estadoFisico === 'DANADO' || item.estadoSeleccionado === 'DANADO') && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Se enviará a Taller ({item.tipoControl === 'SERIALIZADO' ? '1 u.' : `${item.cantidadDañada || 1} u.`})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddDanio(idx)}
                          className="text-xs font-bold text-[#C55500] hover:text-[#A04400] flex items-center gap-1 cursor-pointer bg-[#FDF2E9] px-3 py-1.5 rounded-xl border border-[#C55500]/20"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar Detalle Específico de Daño
                        </button>
                      </div>

                      {/* Campo Rápido de Avería Directa (Sin Bloqueos) */}
                      <div className="p-3 bg-amber-50/60 border border-amber-300 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase text-amber-900 block">
                            Motivo o Avería para Taller (Opcional si llegó sano)
                          </label>
                          {Number(item.cantidadDañada) > 0 && (
                            <span className="text-[10px] font-black text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                              {item.cantidadDañada} u. a reparación
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.motivoAveria || ''}
                          onChange={(e) => handleItemChange(idx, 'motivoAveria', e.target.value)}
                          placeholder="Ej. Fuga de aceite, manguera rota, motor no enciende, rosca barrida"
                          className="precision-input text-xs bg-white border-amber-300 focus:border-amber-600"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-amber-800">Fallas comunes:</span>
                          {COMMON_DAMAGE_CHIPS.map((chip, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => {
                                handleItemChange(idx, 'motivoAveria', chip);
                                if (Number(item.cantidadDañada) === 0 && item.tipoControl !== 'SERIALIZADO') {
                                  handleQuantityChange(idx, 'cantidadDañada', 1);
                                }
                              }}
                              className="text-[10px] font-semibold bg-white hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300 transition-all cursor-pointer"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tabla Opcional de Detalle Avanzado de Daños */}
                      {item.danios.map((d: any, dIdx: number) => (
                        <div key={dIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-[#FDF2E9] p-3 rounded-xl border border-[#C55500]/30 items-end">
                          <div>
                            <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Componente *</label>
                            <input
                              type="text"
                              value={d.componente}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'componente', e.target.value)}
                              className="precision-input text-xs"
                              placeholder="Ej. Brazo, Manguera, Motor"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Tipo de Daño *</label>
                            <input
                              type="text"
                              value={d.tipoDano}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'tipoDano', e.target.value)}
                              className="precision-input text-xs"
                              placeholder="Ej. Fuga, Rotura, Golpe"
                              required
                            />
                          </div>
                          <label className="text-[9px] font-black text-[#C55500] uppercase">Responsabilidad
                            <select
                              value={String(d.cobrable)}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'cobrable', e.target.value === 'true')}
                              className="precision-input text-xs mt-1"
                            >
                              <option value="false">Costo interno</option>
                              <option value="true">Cobrar al cliente</option>
                            </select>
                          </label>
                          <div>
                            <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Costo Estimado (C$)</label>
                            <input
                              type="number"
                              value={d.costoEstimado}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'costoEstimado', e.target.value)}
                              onFocus={(e) => {
                                if (d.costoEstimado === 0 || d.costoEstimado === '0') {
                                  handleDanioChange(idx, dIdx, 'costoEstimado', '');
                                }
                                e.target.select();
                              }}
                              onClick={(e) => {
                                if (d.costoEstimado === 0 || d.costoEstimado === '0') {
                                  handleDanioChange(idx, dIdx, 'costoEstimado', '');
                                }
                                (e.target as HTMLInputElement).select();
                              }}
                              onWheel={handleWheelPrevent}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="precision-input text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveDanio(idx, dIdx)}
                              className="p-2 text-red-600 hover:text-red-800 cursor-pointer"
                              title="Eliminar daño"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Sección de Estimación y Liquidación Preliminar */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <WalletCards className="w-4 h-4 text-emerald-700" /> Estimación preliminar · pendiente de cálculo oficial y aprobación manual
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Período pactado</span><b>{timing.contractedDays} días · {money(timing.contractedAmount)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Tiempo efectivo</span><b>{timing.effectiveDays} días · {money(timing.accruedAmount)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Tarifa pactada</span><b>{money(timing.dailyRate)} / día</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Diferencia no devengada</span><b className="text-emerald-700">{money(timing.unearnedDifference)}</b></div>
          </div>
          <div className="p-3 bg-white border rounded-xl text-[11px] text-[#37474F] space-y-1">
            <p><b>Importante:</b> esta estimación usa el período completo y puede variar si hubo despachos parciales o escalonados. El cálculo oficial lo realizará el servidor al registrar el retorno.</p>
            <p>Si existe facturación previa, la nota de crédito se tramita por separado. Después se seleccionará por separado el destino: reembolso o saldo a favor.</p>
          </div>
          <label className="flex items-start gap-2 text-xs font-bold cursor-pointer">
            <input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)} className="mt-0.5" />
            Confirmo que revisé los datos físicos, la inspección y el cálculo preliminar. La liquidación quedará pendiente de aprobación manual.
          </label>
        </section>

        {/* Pie de Página */}
        <div className="border-t border-[#E5E8EE] pt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="btn-precision-outline text-xs"
            disabled={isSubmitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-precision-primary bg-[#C55500] hover:bg-[#A04400] text-xs py-3 px-8 cursor-pointer font-black"
          >
            {isSubmitting ? (
              <span>Procesando Retorno...</span>
            ) : (
              <>
                <Check className="w-4 h-4" /> Registrar Retorno e Imprimir Acta de Recepción
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

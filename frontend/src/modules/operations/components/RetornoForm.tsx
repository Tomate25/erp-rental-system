import React, { useMemo, useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createRetorno } from '../services/operations.api';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ShieldAlert,
  Plus,
  Trash2,
  Gauge,
  CalendarClock,
  Wrench,
  Clock,
} from 'lucide-react';
import { calculateReturnTiming, returnClassificationLabel } from '../utils/returnTiming';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { QuantityStepper } from '../../../shared/components/QuantityStepper';
import { StickyActionBar } from '../../../shared/components/StickyActionBar';
import { SectionCard } from '../../../shared/components/SectionCard';
import { formatEquipmentFullName } from '../../../shared/utils/equipment-description';

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
  const [entregadoPor, setEntregadoPor] = useState('');
  const [cedulaEntregante, setCedulaEntregante] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptPreview] = useState(() => new Date());
  const [motivoRetorno, setMotivoRetorno] = useState('');
  const [confirmacion, setConfirmacion] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(() => new Set([0]));
  const toggleItem = (index: number) => setExpandedItems(current => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  // Despachos y devoluciones previas
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

      // Despachadas
      const despachadas = despachosPrevios.length > 0
        ? despachosPrevios.reduce((acc: number, d: any) => {
            const matches = (d.items || []).filter((di: any) =>
              di.equipoId === item.equipoId || (di.equipo?.id && di.equipo.id === item.equipoId)
            );
            return acc + matches.reduce((iAcc: number, di: any) => iAcc + (Number(di.cantidad) || Number(di.cantidadDespachada) || 1), 0);
          }, 0) || (item.cantidad || 1)
        : (item.cantidad || 1);

      // Ya retornadas
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
        nombreEquipo: formatEquipmentFullName(item.equipo, { includeCode: true }),
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

  // Helpers para manejo numérico
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

  // Manejo reactivo bidireccional de cantidades
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
    setExpandedItems(new Set(itemForms.map((_, index) => index)));

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

  const unbalancedCount = itemForms.filter(item => (Number(item.cantidadRetornada) || 0) + (Number(item.cantidadPendiente) || 0) + (Number(item.cantidadPerdida) || 0) !== Number(item.saldoEnObra || item.cantidadDespachada)).length;
  const totalPerdidas = itemForms.reduce((sum, item) => sum + (Number(item.cantidadPerdida) || 0), 0);

  return (
    <div className="space-y-5 font-sans w-full max-w-7xl mx-auto pb-24 text-precision-neutral-dark">
      
      {/* Encabezado Corporativo Sobrio (Estilo Documental / Normas APA) */}
      <div className="sticky top-14 z-20 flex items-center justify-between bg-precision-canvas/95 px-4 py-3 rounded-xl backdrop-blur-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-precision-neutral-dark hover:bg-precision-neutral-light border border-precision-neutral-border px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-precision-neutral-dark" /> Volver
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-precision-secondary uppercase tracking-wider">
                CONTRATO {contract.codigo}
              </span>
              <span className="text-precision-neutral font-bold">·</span>
              <span className="text-xs font-bold text-precision-neutral-dark uppercase">
                {contract.cliente?.nombre}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-precision-neutral-dark tracking-tight mt-0.5">
              Recepción Física y Retorno de Equipos
            </h2>
          </div>
        </div>

      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <main className="order-last space-y-4 lg:order-first">
        {/* Sección de Vigencia y Fecha */}
        <section className="bg-white border border-precision-neutral-border rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-precision-neutral-border pb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-precision-neutral-dark flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-precision-neutral-dark" /> Vigencia contractual y recepción
            </h3>
            <StatusBadge tone={timing.classification === 'ANTICIPADO' ? 'warning' : 'neutral'}>
              {returnClassificationLabel(timing)}
            </StatusBadge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="border border-precision-neutral-border p-3 rounded-lg bg-white">
              <span className="text-xs uppercase font-bold text-precision-neutral block mb-0.5">Inicio pactado</span>
              <span className="font-bold text-precision-neutral-dark">{formatDateTime(contract.fechaInicio)}</span>
            </div>
            <div className="border border-precision-neutral-border p-3 rounded-lg bg-white">
              <span className="text-xs uppercase font-bold text-precision-neutral block mb-0.5">Retorno previsto</span>
              <span className="font-bold text-precision-neutral-dark">{formatDateTime(contract.fechaFinPactada || contract.fechaFin)}</span>
            </div>
            <div className="border border-precision-neutral-border p-3 rounded-lg bg-white">
              <span className="text-xs uppercase font-bold text-precision-neutral block mb-0.5">Recepción física</span>
              <span className="font-bold text-precision-neutral-dark">{formatDateTime(receiptPreview)}</span>
            </div>
            <div className="border border-precision-neutral-border p-3 rounded-lg bg-white">
              <span className="text-xs uppercase font-bold text-precision-neutral block mb-0.5">Modalidad</span>
              <span className="font-bold text-precision-neutral-dark">{isTotalReturn ? 'RETORNO TOTAL' : 'RETORNO PARCIAL'}</span>
            </div>
          </div>

          {timing.classification === 'ANTICIPADO' && (
            <div className="pt-2">
              <label className="text-xs font-bold text-precision-neutral-dark block mb-1">
                Motivo del retorno anticipado *
              </label>
              <textarea
                value={motivoRetorno}
                onChange={e => setMotivoRetorno(e.target.value)}
                className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary"
                placeholder="Razón indicada por el cliente para el cierre anticipado"
                required
              />
            </div>
          )}
        </section>

        {/* Responsables de Entrega y Recepción */}
        <div className="bg-white border border-precision-neutral-border p-5 rounded-xl space-y-4">
          <div className="border-b border-precision-neutral-border pb-2">
            <h3 className="text-xs font-semibold text-precision-neutral-dark uppercase tracking-wider">
              Responsables de Entrega y Recepción
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-precision-neutral-dark block mb-1">Entregado por *</label>
              <input
                value={entregadoPor}
                onChange={e => setEntregadoPor(e.target.value)}
                className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary"
                placeholder="Nombre del conductor o representante del cliente"
                required
              />
              <p className="mt-1 text-xs text-precision-neutral">Cliente: {contract.cliente?.nombre}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-precision-neutral-dark block mb-1">Cédula / Identificación de quien entrega</label>
              <input
                value={cedulaEntregante}
                onChange={e => setCedulaEntregante(e.target.value)}
                className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary"
                placeholder="Número de cédula o documento"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-precision-neutral-dark block mb-1">
              Personal Responsable de la Recepción en Almacén BM
            </label>
            <input
              type="text"
              value={recibidoPor}
              onChange={(e) => setRecibidoPor(e.target.value)}
              placeholder="Ej. Pedro Morales (Jefe de Almacén BM)"
              className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary"
              required
            />
          </div>
        </div>

        {/* Lista de Equipos a Retornar */}
        <div className="space-y-4">
          <div className="border-b-2 border-precision-neutral-border pb-2">
            <h3 className="text-sm font-semibold text-precision-neutral-dark uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-precision-neutral-dark" /> Control de Retorno y Estado Físico por Ítem
            </h3>
          </div>

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
                <div key={idx} className="bg-white border border-precision-neutral-border rounded-xl p-5 space-y-4 shadow-xs">
                  
                  {/* Fila Cabecera del Producto */}
                  <button type="button" aria-expanded={expandedItems.has(idx)} onClick={() => toggleItem(idx)} className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-precision-neutral-border pb-3 text-left">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-white text-precision-neutral-dark border border-neutral-400">
                        {item.tipoControl === 'SERIALIZADO' ? 'Serializado' : 'Por Cantidad'}
                      </span>
                      <h4 className="font-semibold text-precision-neutral-dark text-sm uppercase tracking-tight">{item.nombreEquipo}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-precision-secondary font-mono">
                      {item.numeroSerie && (
                        <span className="bg-white border border-precision-neutral-border px-2 py-0.5 rounded text-xs font-bold text-precision-neutral-dark">
                          S/N: {item.numeroSerie}
                        </span>
                      )}
                      <span>Despachadas: <b className="text-precision-neutral-dark">{despachadas} u.</b></span>
                      {yaRetornadas > 0 && <span className="text-precision-neutral font-medium">({yaRetornadas} devueltas previas)</span>}
                      {maxSaldo < despachadas && <span className="text-precision-neutral-dark font-bold">· En posesión cliente: {maxSaldo} u.</span>}
                      <StatusBadge tone={isBalanced ? 'success' : 'warning'}>{isBalanced ? `✓ ${totalBalance}/${maxSaldo} u.` : `${totalBalance}/${maxSaldo} u. pendientes`}</StatusBadge>
                    </div>
                  </button>

                  {/* CASO A: EQUIPO SERIALIZADO (4 Estados Sobrios APA) */}
                  {expandedItems.has(idx) && <>
                  {item.tipoControl === 'SERIALIZADO' && (
                    <div className="space-y-3 border-t border-precision-neutral-border pt-4">
                      <div className="flex items-center justify-between border-b border-precision-neutral-border pb-2">
                        <label className="text-xs font-semibold text-precision-neutral-dark uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-precision-neutral-dark" /> Situación del Equipo en esta Devolución
                        </label>
                      </div>

                      <div role="radiogroup" aria-label={`Estado de ${item.nombreEquipo}`} className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        
                        {/* 1. Llegó Operativo */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'BUENO')}
                          role="radio"
                          aria-checked={item.estadoSeleccionado === 'BUENO'}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'BUENO'
                              ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-800 shadow-xs'
                              : 'bg-white border-precision-neutral-border hover:border-emerald-300 text-precision-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-precision-neutral-dark flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-precision-neutral-dark" /> Llegó Operativo
                            </span>
                            {item.estadoSeleccionado === 'BUENO' && <Check className="h-4 w-4 text-emerald-700" />}
                          </div>
                          <p className="text-xs text-precision-secondary font-medium">
                            Buen estado. Pasa a <b className="text-precision-neutral-dark font-semibold">DISPONIBLE</b> en almacén.
                          </p>
                        </button>

                        {/* 2. Llegó Dañado */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'DANADO')}
                          role="radio"
                          aria-checked={item.estadoSeleccionado === 'DANADO'}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'DANADO'
                              ? 'bg-precision-tertiary-light border-2 border-precision-tertiary text-precision-tertiary-dark shadow-xs'
                              : 'bg-white border-precision-neutral-border hover:border-precision-tertiary/40 text-precision-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-precision-neutral-dark flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-precision-neutral-dark" /> Llegó Dañado
                            </span>
                            {item.estadoSeleccionado === 'DANADO' && <Check className="h-4 w-4 text-precision-tertiary" />}
                          </div>
                          <p className="text-xs text-precision-secondary font-medium">
                            Con avería. Pasa a <b className="text-precision-neutral-dark font-semibold">TALLER / REPARACIÓN</b>.
                          </p>
                        </button>

                        {/* 3. No Regresó */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'PENDIENTE')}
                          role="radio"
                          aria-checked={item.estadoSeleccionado === 'PENDIENTE'}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'PENDIENTE'
                              ? 'bg-precision-secondary-light border-2 border-precision-secondary text-precision-secondary-dark shadow-xs'
                              : 'bg-white border-precision-neutral-border hover:border-precision-secondary/40 text-precision-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-precision-neutral-dark flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-precision-neutral-dark" /> No Regresó
                            </span>
                            {item.estadoSeleccionado === 'PENDIENTE' && <Check className="h-4 w-4 text-precision-secondary" />}
                          </div>
                          <p className="text-xs text-precision-secondary font-medium">
                            Pendiente. <b className="text-precision-neutral-dark font-semibold">Continúa en obra</b> bajo renta.
                          </p>
                        </button>

                        {/* 4. Extraviado */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'PERDIDO')}
                          role="radio"
                          aria-checked={item.estadoSeleccionado === 'PERDIDO'}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'PERDIDO'
                              ? 'bg-red-50 border-2 border-red-600 text-red-800 shadow-xs'
                              : 'bg-white border-precision-neutral-border hover:border-red-300 text-precision-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-precision-neutral-dark flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5 text-precision-neutral-dark" /> Extraviado
                            </span>
                            {item.estadoSeleccionado === 'PERDIDO' && <Check className="h-4 w-4 text-red-700" />}
                          </div>
                          <p className="text-xs text-precision-secondary font-medium">
                            Pérdida física. Pasa a <b className="text-precision-neutral-dark font-semibold">BAJA / REPOSICIÓN</b>.
                          </p>
                        </button>

                      </div>

                      {item.estadoSeleccionado === 'PENDIENTE' && (
                        <div className="p-3 bg-white border border-precision-neutral-border rounded-lg text-xs text-precision-neutral-dark">
                          <b className="font-semibold">Equipo pendiente en obra:</b> No llegó en este transporte. Continúa en estado <b className="font-semibold">ALQUILADO</b> en el contrato.
                        </div>
                      )}

                      {item.estadoSeleccionado === 'DANADO' && (
                        <div className="p-3 bg-white border border-precision-neutral-border rounded-lg text-xs text-precision-neutral-dark">
                          <b className="font-semibold">Equipo enviado a mantenimiento:</b> Se registrará la orden de taller para revisión técnica.
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASO B: EQUIPOS POR CANTIDAD (Diseño Formal APA) */}
                  {item.tipoControl !== 'SERIALIZADO' && (
                    <div className="space-y-4 border-t border-precision-neutral-border pt-4">
                      
                      {/* Cabecera con Botones Rápidos */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-precision-neutral-border pb-2.5">
                        <div className="text-xs font-bold text-precision-secondary">
                          Saldo en obra del cliente: <b className="font-mono font-semibold text-precision-neutral-dark">{maxSaldo} u.</b>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'TODOS_BUENOS')}
                            className="px-2.5 py-1 text-xs font-bold rounded border border-precision-neutral-border bg-white hover:bg-precision-neutral-light text-precision-neutral-dark transition-colors cursor-pointer"
                          >
                            Llegaron Todos Sanos ({maxSaldo} u.)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'CON_DANOS')}
                            className="px-2.5 py-1 text-xs font-bold rounded border border-precision-neutral-border bg-white hover:bg-precision-neutral-light text-precision-neutral-dark transition-colors cursor-pointer"
                          >
                            Reportar Dañados a Taller
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'TODOS_EN_OBRA')}
                            className="px-2.5 py-1 text-xs font-bold rounded border border-precision-neutral-border bg-white hover:bg-precision-neutral-light text-precision-neutral-dark transition-colors cursor-pointer"
                          >
                            Ninguno Regresó (En Obra)
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <QuantityStepper label="Recibidas" value={item.cantidadRetornada} max={maxSaldo} tone="success" onChange={value => handleQuantityChange(idx, 'cantidadRetornada', value)} />
                        <QuantityStepper label="A taller" value={item.cantidadDañada} max={recibidas} tone="tertiary" onChange={value => handleQuantityChange(idx, 'cantidadDañada', value)} />
                        <QuantityStepper label="En obra" value={item.cantidadPendiente} max={maxSaldo} tone="warning" onChange={value => handleQuantityChange(idx, 'cantidadPendiente', value)} />
                        <QuantityStepper label="Perdidas" value={item.cantidadPerdida} max={maxSaldo} tone="danger" onChange={value => handleQuantityChange(idx, 'cantidadPerdida', value)} />
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-precision-neutral-light" role="img" aria-label={`Balance: ${buenEstado} sanas, ${danadas} a taller, ${pendientes} en obra y ${perdidas} perdidas`}>
                        <span className="bg-emerald-600" style={{width: `${buenEstado / maxSaldo * 100}%`}} />
                        <span className="bg-precision-tertiary" style={{width: `${danadas / maxSaldo * 100}%`}} />
                        <span className="bg-amber-500" style={{width: `${pendientes / maxSaldo * 100}%`}} />
                        <span className="bg-red-600" style={{width: `${perdidas / maxSaldo * 100}%`}} />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span>{isBalanced ? `Balance cuadrado: ${totalBalance} de ${maxSaldo} u.` : `Descuadre: ${Math.abs(balanceDiff)} u. por clasificar`}</span>
                        <StatusBadge tone={isBalanced ? 'success' : 'warning'}>{isBalanced ? 'Cuadrado' : 'Pendiente'}</StatusBadge>
                      </div>
                    </div>
                  )}

                  {/* HORÓMETRO (Solo si la máquina fue recibida) */}
                  {item.tieneHorometro && !estaEnObra && (
                    <div className="space-y-3 border-t border-precision-neutral-border pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-precision-neutral-dark uppercase block mb-1">
                            Horómetro Inicial
                          </label>
                          <input
                            type="text"
                            value={`${item.horometroInicial} hrs`}
                            disabled
                            className="w-full precision-input text-xs font-mono font-bold bg-precision-neutral-light text-precision-neutral-dark border-precision-neutral-border"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-precision-neutral-dark uppercase block mb-1">
                            Horómetro Final (Retorno) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min={item.horometroInicial}
                              value={item.horometroFinal}
                              onChange={(e) => handleItemChange(idx, 'horometroFinal', e.target.value)}
                              onFocus={(e) => handleNumberFocus(e, idx, 'horometroFinal')}
                              onClick={(e) => handleNumberClick(e, idx, 'horometroFinal')}
                              onWheel={handleWheelPrevent}
                              className="w-full precision-input text-xs font-mono font-semibold pl-8 border-precision-neutral-border focus:border-precision-secondary text-precision-neutral-dark bg-white"
                              placeholder="0.0"
                              required={estaRecibido}
                            />
                            <Gauge className="w-3.5 h-3.5 text-precision-neutral-dark absolute left-2.5 top-2.5" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-precision-neutral-dark uppercase block mb-1">
                            Horas de Uso Calculadas
                          </label>
                          <div className="w-full precision-input text-xs font-mono font-bold bg-white text-precision-neutral-dark flex items-center justify-between border-precision-neutral-border">
                            <span className="font-semibold">{horasUso === null ? 'Pendiente' : `+${horasUso.toFixed(1)} hrs`}</span>

                          </div>
                        </div>
                      </div>

                      {item.tipoMedicionCombustible !== 'NO_APLICA' && (
                        <div>
                          <label className="text-xs font-semibold text-precision-neutral-dark uppercase block mb-1">
                            Combustible al retornar ({item.tipoMedicionCombustible})
                          </label>
                          <input
                            value={item.combustibleRetorno}
                            onChange={(e) => handleItemChange(idx, 'combustibleRetorno', e.target.value)}
                            className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                            placeholder="Nivel o lectura del indicador"
                            required={estaRecibido}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* INSPECCIÓN TÉCNICA (Solo recibidos) */}
                  {!estaEnObra && (
                    <div className="space-y-3 border-t border-precision-neutral-border pt-4">
                      <h5 className="text-xs font-semibold uppercase text-precision-neutral-dark flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-precision-neutral-dark" /> Inspección Técnica de Recepción
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="text-xs font-medium text-precision-secondary">Funcionamiento
                          <div role="radiogroup" aria-label={`Funcionamiento de ${item.nombreEquipo}`} className="mt-1 flex flex-wrap gap-1">
                            {([['FUNCIONA', 'Funciona'], ['NO_FUNCIONA', 'No funciona'], ['NO_VERIFICADO', 'No verificado']] as const).map(([value, label]) => (
                              <button key={value} type="button" role="radio" aria-checked={item.inspeccionEstado.funcionamiento === value}
                                onClick={() => updateInspection(idx, 'funcionamiento', value)}
                                className={`min-h-10 rounded-lg border px-2 text-xs font-medium ${item.inspeccionEstado.funcionamiento === value ? 'border-precision-primary bg-precision-primary-light text-precision-primary-dark' : 'border-precision-neutral-border bg-white text-precision-secondary'}`}>{label}</button>
                            ))}
                          </div>
                        </div>
                        <label className="text-xs font-bold text-precision-neutral-dark">Estado físico
                          <select
                            value={item.inspeccionEstado.estadoFisico}
                            onChange={(e) => updateInspection(idx, 'estadoFisico', e.target.value)}
                            className="w-full precision-input text-xs mt-1 bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                            required={estaRecibido}
                          >
                            <option value="">Seleccione</option>
                            <option value="BUENO">Buen estado</option>
                            <option value="DESGASTE_NORMAL">Desgaste normal</option>
                            <option value="DANADO">Dañado</option>
                          </select>
                        </label>
                        <label className="text-xs font-bold text-precision-neutral-dark">Accesorios
                          <select
                            value={item.inspeccionEstado.accesoriosCompletos === null ? '' : String(item.inspeccionEstado.accesoriosCompletos)}
                            onChange={(e) => updateInspection(idx, 'accesoriosCompletos', e.target.value === 'true')}
                            className="w-full precision-input text-xs mt-1 bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                            required={estaRecibido}
                          >
                            <option value="">Seleccione</option>
                            <option value="true">Completos</option>
                            <option value="false">Faltantes</option>
                          </select>
                        </label>
                      </div>
                      <label className="block text-xs font-medium text-precision-secondary">Observaciones de la inspección</label>
                      <textarea
                        value={item.inspeccionEstado.observaciones}
                        onChange={(e) => updateInspection(idx, 'observaciones', e.target.value)}
                        className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                        placeholder="Observaciones de la inspección física"
                        aria-label="Observaciones de la inspección"
                      />
                      <label className="block text-xs font-medium text-precision-secondary">Fotos de respaldo (enlaces, uno por línea)</label>
                      <textarea
                        value={item.inspeccionEstado.fotosTexto}
                        onChange={(e) => updateInspection(idx, 'fotosTexto', e.target.value)}
                        className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                        placeholder="Enlaces de fotos, uno por línea"
                        aria-label="Enlaces de fotos del retorno"
                      />
                    </div>
                  )}

                  {/* CONTROL DE AVERÍAS PARA TALLER */}
                  {!estaEnObra && !item.daniosDetectados && Number(item.cantidadDañada) === 0 && item.inspeccionEstado.estadoFisico !== 'DANADO' && item.estadoSeleccionado !== 'DANADO' && (
                    <button type="button" onClick={() => handleAddDanio(idx)} className="text-xs font-semibold text-precision-tertiary hover:underline">Reportar avería</button>
                  )}
                  {!estaEnObra && (item.daniosDetectados || Number(item.cantidadDañada) > 0 || item.inspeccionEstado.estadoFisico === 'DANADO' || item.estadoSeleccionado === 'DANADO') && (
                    <div className="border-t border-precision-neutral-border pt-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-precision-neutral-dark" />
                          <span className="text-xs font-semibold text-precision-neutral-dark uppercase tracking-wider">
                            Determinar fallas y enviar a mantenimiento
                          </span>
                          {(item.daniosDetectados || Number(item.cantidadDañada) > 0 || item.inspeccionEstado.estadoFisico === 'DANADO' || item.estadoSeleccionado === 'DANADO') && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-precision-neutral-dark border border-precision-secondary">
                              Pasa a Taller ({item.tipoControl === 'SERIALIZADO' ? '1 u.' : `${item.cantidadDañada || 1} u.`})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddDanio(idx)}
                          className="text-xs font-bold text-precision-neutral-dark hover:bg-precision-neutral-light flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-precision-neutral-border transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-precision-neutral-dark" /> Agregar Detalle Específico de Daño
                        </button>
                      </div>

                      {/* Campo Directo de Avería */}
                      <div className="p-3.5 bg-white border border-precision-neutral-border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase text-precision-neutral-dark block">
                            Motivo o Avería para Taller (Opcional si llegó sano)
                          </label>
                          {Number(item.cantidadDañada) > 0 && (
                            <span className="text-xs font-bold text-precision-neutral-dark">
                              {item.cantidadDañada} u. asignadas a reparación
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.motivoAveria || ''}
                          onChange={(e) => handleItemChange(idx, 'motivoAveria', e.target.value)}
                          placeholder="Ej. Fuga de aceite, manguera rota, motor no enciende, rosca barrida"
                          className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-xs font-semibold text-precision-neutral-dark">Fallas comunes:</span>
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
                              className="text-xs font-bold bg-white hover:bg-precision-neutral-light text-precision-neutral-dark px-2 py-0.5 rounded border border-precision-neutral-border transition-colors cursor-pointer"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Detalle Avanzado de Daños (Si se requiere) */}
                      {item.danios.map((d: any, dIdx: number) => (
                        <div key={dIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-precision-neutral-border items-end">
                          <div>
                            <label className="text-xs font-semibold text-precision-neutral-dark uppercase block mb-1">Componente *</label>
                            <input
                              type="text"
                              value={d.componente}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'componente', e.target.value)}
                              className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                              placeholder="Ej. Brazo, Manguera, Motor"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-precision-neutral-dark uppercase block mb-1">Tipo de Daño *</label>
                            <input
                              type="text"
                              value={d.tipoDano}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'tipoDano', e.target.value)}
                              className="w-full precision-input text-xs bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                              placeholder="Ej. Fuga, Rotura, Golpe"
                              required
                            />
                          </div>
                          <label className="text-xs font-semibold text-precision-neutral-dark uppercase">Responsabilidad
                            <select
                              value={String(d.cobrable)}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'cobrable', e.target.value === 'true')}
                              className="w-full precision-input text-xs mt-1 bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary font-medium"
                            >
                              <option value="false">Costo interno</option>
                              <option value="true">Cobrar al cliente</option>
                            </select>
                          </label>
                          <div>
                            <label className="text-xs font-semibold text-precision-neutral-dark uppercase block mb-1">Costo Estimado (C$)</label>
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
                              className="w-full precision-input text-xs font-mono font-bold bg-white text-precision-neutral-dark border-precision-neutral-border focus:border-precision-secondary"
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveDanio(idx, dIdx)}
                              className="p-1.5 text-precision-neutral hover:text-red-700 cursor-pointer"
                              title="Eliminar daño"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  </>}
                </div>
              );
            })}
          </div>
        </div>

          </main>
          <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-32">
        <SectionCard title="Resumen del viaje">
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>Recibidas <strong className="block text-2xl tabular-nums">{totalNosTraen}</strong></div>
            <div>A taller <strong className="block text-2xl tabular-nums">{totalMantenimiento}</strong></div>
            <div>En obra <strong className="block text-2xl tabular-nums">{totalEnObra}</strong></div>
            <div>Perdidas <strong className="block text-2xl tabular-nums">{totalPerdidas}</strong></div>
          </div>
          <div className="mt-3 space-y-1 border-t border-precision-neutral-border pt-3">
            {itemForms.map((item, index) => {
              const balanced = (Number(item.cantidadRetornada) || 0) + (Number(item.cantidadPendiente) || 0) + (Number(item.cantidadPerdida) || 0) === Number(item.saldoEnObra || item.cantidadDespachada);
              return <p key={item.equipoId || index} className="flex justify-between gap-2 text-xs"><span className="truncate">{item.nombreEquipo}</span><StatusBadge tone={balanced ? 'success' : 'warning'}>{balanced ? 'Cuadrado' : 'Pendiente'}</StatusBadge></p>;
            })}
          </div>
        </SectionCard>
        <SectionCard title="Liquidación estimada">
          <p className="mt-3 text-xs text-precision-secondary">Tiempo efectivo · {timing.effectiveDays} días</p>
          <p className="text-lg font-semibold tabular-nums">{money(timing.accruedAmount)}</p>
          <p className="mt-3 text-xs text-precision-secondary">Diferencia no devengada</p>
          <p className="text-2xl font-bold tabular-nums text-precision-tertiary">{money(timing.unearnedDifference)}</p>
          <p className="mt-3 text-xs text-precision-neutral">El servidor calculará la liquidación definitiva al registrar el acta. Facturación gestionará cualquier nota de crédito.</p>
        </SectionCard>
          </aside>
        </div>
        <StickyActionBar status={unbalancedCount ? `${unbalancedCount} ítem(s) por cuadrar` : 'Balance cuadrado'} tone={unbalancedCount ? 'warning' : 'success'}
          confirm={{ checked: confirmacion, onChange: setConfirmacion, label: 'Confirmo cantidades y estado' }}
          error={error}
          secondary={{ label: 'Cancelar', onClick: onBack, disabled: isSubmitting }}
          primary={{ label: isSubmitting ? 'Procesando retorno…' : 'Registrar retorno e imprimir acta', type: 'submit', onClick: () => {}, disabled: isSubmitting || unbalancedCount > 0 || !confirmacion }} />
      </form>
    </div>
  );
};

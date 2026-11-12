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
  Truck,
  Building2,
  Minus,
  FileCheck,
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
    <div className="space-y-6 font-sans w-full max-w-5xl mx-auto text-black">
      
      {/* Encabezado Corporativo Sobrio (Estilo Documental / Normas APA) */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-neutral-300 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-black hover:bg-neutral-100 border border-neutral-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-black" /> Volver
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-neutral-700 uppercase tracking-wider">
                CONTRATO {contract.codigo}
              </span>
              <span className="text-neutral-400 font-bold">·</span>
              <span className="text-[11px] font-bold text-black uppercase">
                {contract.cliente?.nombre}
              </span>
            </div>
            <h2 className="text-lg font-black text-black tracking-tight mt-0.5">
              Recepción Física y Retorno de Equipos
            </h2>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-white border border-neutral-300 px-3.5 py-1.5 rounded-lg">
          <RotateCcw className="w-4 h-4 text-black" />
          <span className="text-xs font-bold text-black uppercase tracking-wider">Almacén Central BM</span>
        </div>
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl p-6 shadow-xs space-y-6">
        
        {error && (
          <div className="p-3.5 bg-white border-2 border-red-600 text-red-900 text-xs font-bold rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 📊 RESUMEN CONSOLIDADO DEL VIAJE (FONDO BLANCO Y ENCABEZADOS NEGROS APA) */}
        <section className="bg-white border-2 border-neutral-300 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
            <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-black" /> Resumen de Recepción del Viaje
            </h3>
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
              Control Inmediato de Patio BM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Nos Traen */}
            <div className="bg-white border border-neutral-300 p-4 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-black uppercase tracking-wider">
                  1. Nos Traen (Recibidas)
                </span>
                <Truck className="w-4 h-4 text-black" />
              </div>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-3xl font-black font-mono text-black">{totalNosTraen}</span>
                <span className="text-xs text-neutral-800 font-bold">unidades recibidas</span>
              </div>
              <div className="text-[11px] text-neutral-700 font-medium pt-1">
                <span className="font-bold text-black">{totalSanosBodega}</span> sanas entran a bodega
              </div>
            </div>

            {/* 2. En Obra */}
            <div className="bg-white border border-neutral-300 p-4 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-black uppercase tracking-wider">
                  2. Quedan en Obra
                </span>
                <Building2 className="w-4 h-4 text-black" />
              </div>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-3xl font-black font-mono text-black">{totalEnObra}</span>
                <span className="text-xs text-neutral-800 font-bold">unidades pendientes</span>
              </div>
              <div className="text-[11px] text-neutral-700 font-medium pt-1">
                Continúan en renta activa con el cliente
              </div>
            </div>

            {/* 3. A Mantenimiento */}
            <div className="bg-white border border-neutral-300 p-4 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-black uppercase tracking-wider">
                  3. A Mantenimiento / Taller
                </span>
                <Wrench className="w-4 h-4 text-black" />
              </div>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-3xl font-black font-mono text-black">{totalMantenimiento}</span>
                <span className="text-xs text-neutral-800 font-bold">unidades con avería</span>
              </div>
              <div className="text-[11px] text-neutral-700 font-medium pt-1">
                Pasan a orden técnica de taller
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Vigencia y Fecha */}
        <section className="bg-white border border-neutral-300 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-black" /> Vigencia contractual y recepción
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border border-neutral-400 bg-white text-black">
              {returnClassificationLabel(timing)}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="border border-neutral-200 p-3 rounded-lg bg-white">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Inicio pactado</span>
              <span className="font-bold text-black">{formatDateTime(contract.fechaInicio)}</span>
            </div>
            <div className="border border-neutral-200 p-3 rounded-lg bg-white">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Retorno previsto</span>
              <span className="font-bold text-black">{formatDateTime(contract.fechaFinPactada || contract.fechaFin)}</span>
            </div>
            <div className="border border-neutral-200 p-3 rounded-lg bg-white">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Recepción física</span>
              <span className="font-bold text-black">{formatDateTime(receiptPreview)}</span>
            </div>
            <div className="border border-neutral-200 p-3 rounded-lg bg-white">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Modalidad</span>
              <span className="font-bold text-black">{isTotalReturn ? 'RETORNO TOTAL' : 'RETORNO PARCIAL'}</span>
            </div>
          </div>

          {timing.classification === 'ANTICIPADO' && (
            <div className="pt-2">
              <label className="text-xs font-bold text-black block mb-1">
                Motivo del retorno anticipado
              </label>
              <textarea
                value={motivoRetorno}
                onChange={e => setMotivoRetorno(e.target.value)}
                className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black"
                placeholder="Razón indicada por el cliente para el cierre anticipado"
                required
              />
            </div>
          )}
        </section>

        {/* Responsables de Entrega y Recepción */}
        <div className="bg-white border border-neutral-300 p-5 rounded-xl space-y-4">
          <div className="border-b border-neutral-200 pb-2">
            <h3 className="text-xs font-black text-black uppercase tracking-wider">
              Responsables de Entrega y Recepción
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-black block mb-1">Entregado por</label>
              <input
                value={entregadoPor}
                onChange={e => setEntregadoPor(e.target.value)}
                className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black"
                placeholder="Nombre del conductor o representante del cliente"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-black block mb-1">Cédula / Identificación de quien entrega</label>
              <input
                value={cedulaEntregante}
                onChange={e => setCedulaEntregante(e.target.value)}
                className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black"
                placeholder="Número de cédula o documento"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-black block mb-1">
              Personal Responsable de la Recepción en Almacén BM
            </label>
            <input
              type="text"
              value={recibidoPor}
              onChange={(e) => setRecibidoPor(e.target.value)}
              placeholder="Ej. Pedro Morales (Jefe de Almacén BM)"
              className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black"
              required
            />
          </div>
        </div>

        {/* Lista de Equipos a Retornar */}
        <div className="space-y-4">
          <div className="border-b-2 border-neutral-300 pb-2">
            <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-black" /> Control de Retorno y Estado Físico por Ítem
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
                <div key={idx} className="bg-white border border-neutral-300 rounded-xl p-5 space-y-4 shadow-xs">
                  
                  {/* Fila Cabecera del Producto */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white text-black border border-neutral-400">
                        {item.tipoControl === 'SERIALIZADO' ? 'Serializado' : 'Por Cantidad'}
                      </span>
                      <h4 className="font-black text-black text-sm uppercase tracking-tight">{item.nombreEquipo}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-800 font-mono">
                      {item.numeroSerie && (
                        <span className="bg-white border border-neutral-300 px-2 py-0.5 rounded text-[11px] font-bold text-black">
                          S/N: {item.numeroSerie}
                        </span>
                      )}
                      <span>Despachadas: <b className="text-black">{despachadas} u.</b></span>
                      {yaRetornadas > 0 && <span className="text-neutral-600 font-medium">({yaRetornadas} devueltas previas)</span>}
                      {maxSaldo < despachadas && <span className="text-black font-bold">· En posesión cliente: {maxSaldo} u.</span>}
                    </div>
                  </div>

                  {/* CASO A: EQUIPO SERIALIZADO (4 Estados Sobrios APA) */}
                  {item.tipoControl === 'SERIALIZADO' && (
                    <div className="bg-white border border-neutral-300 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                        <label className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Situación del Equipo en esta Devolución
                        </label>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        
                        {/* 1. Llegó Operativo */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'BUENO')}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'BUENO'
                              ? 'bg-white border-2 border-black ring-1 ring-black shadow-xs'
                              : 'bg-white border-neutral-300 hover:border-black text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Llegó Operativo
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-700 font-medium">
                            Buen estado. Pasa a <b className="text-black font-black">DISPONIBLE</b> en almacén.
                          </p>
                        </button>

                        {/* 2. Llegó Dañado */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'DANADO')}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'DANADO'
                              ? 'bg-white border-2 border-black ring-1 ring-black shadow-xs'
                              : 'bg-white border-neutral-300 hover:border-black text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-black flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-black" /> Llegó Dañado
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-700 font-medium">
                            Con avería. Pasa a <b className="text-black font-black">TALLER / REPARACIÓN</b>.
                          </p>
                        </button>

                        {/* 3. No Regresó */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'PENDIENTE')}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'PENDIENTE'
                              ? 'bg-white border-2 border-black ring-1 ring-black shadow-xs'
                              : 'bg-white border-neutral-300 hover:border-black text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-black flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-black" /> No Regresó
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-700 font-medium">
                            Pendiente. <b className="text-black font-black">Continúa en obra</b> bajo renta.
                          </p>
                        </button>

                        {/* 4. Extraviado */}
                        <button
                          type="button"
                          onClick={() => handleSetSerializedState(idx, 'PERDIDO')}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            item.estadoSeleccionado === 'PERDIDO'
                              ? 'bg-white border-2 border-black ring-1 ring-black shadow-xs'
                              : 'bg-white border-neutral-300 hover:border-black text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-black flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5 text-black" /> Extraviado
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-700 font-medium">
                            Pérdida física. Pasa a <b className="text-black font-black">BAJA / REPOSICIÓN</b>.
                          </p>
                        </button>

                      </div>

                      {item.estadoSeleccionado === 'PENDIENTE' && (
                        <div className="p-3 bg-white border border-neutral-300 rounded-lg text-xs text-black">
                          <b className="font-black">Equipo pendiente en obra:</b> No llegó en este transporte. Continúa en estado <b className="font-black">ALQUILADO</b> en el contrato.
                        </div>
                      )}

                      {item.estadoSeleccionado === 'DANADO' && (
                        <div className="p-3 bg-white border border-neutral-300 rounded-lg text-xs text-black">
                          <b className="font-black">Equipo enviado a mantenimiento:</b> Se registrará la orden de taller para revisión técnica.
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASO B: EQUIPOS POR CANTIDAD (Diseño Formal APA) */}
                  {item.tipoControl !== 'SERIALIZADO' && (
                    <div className="bg-white border border-neutral-300 p-4 rounded-xl space-y-4">
                      
                      {/* Cabecera con Botones Rápidos */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2.5">
                        <div className="text-xs font-bold text-neutral-800">
                          Saldo en obra del cliente: <b className="font-mono font-black text-black">{maxSaldo} u.</b>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'TODOS_BUENOS')}
                            className="px-2.5 py-1 text-[11px] font-bold rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-black transition-colors cursor-pointer"
                          >
                            Llegaron Todos Sanos ({maxSaldo} u.)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'CON_DANOS')}
                            className="px-2.5 py-1 text-[11px] font-bold rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-black transition-colors cursor-pointer"
                          >
                            Reportar Dañados a Taller
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuantityPreset(idx, 'TODOS_EN_OBRA')}
                            className="px-2.5 py-1 text-[11px] font-bold rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-black transition-colors cursor-pointer"
                          >
                            Ninguno Regresó (En Obra)
                          </button>
                        </div>
                      </div>

                      {/* Tarjetas de Cantidad en Rejilla Formal */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        
                        {/* 1. Recibidas */}
                        <div className="bg-white p-3.5 rounded-lg border border-neutral-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-black uppercase">
                              1. ¿Cuánto vino? (Recibidas) *
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-black border border-neutral-200">
                              Almacén
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadRetornada', -1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Restar 1"
                            >
                              <Minus className="w-3 h-3 text-black" />
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
                              className="w-full precision-input text-center text-sm font-mono font-black text-black bg-white border-neutral-300 focus:border-black"
                              placeholder="0"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadRetornada', 1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Sumar 1"
                            >
                              <Plus className="w-3 h-3 text-black" />
                            </button>
                          </div>
                          <span className="text-[10px] text-neutral-700 font-semibold block text-center">
                            Flete actual: <b className="text-black">{recibidas} u.</b>
                          </span>
                        </div>

                        {/* 2. Dañadas */}
                        <div className="bg-white p-3.5 rounded-lg border border-neutral-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-black uppercase">
                              2. Dañadas (A Taller)
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-black border border-neutral-200">
                              Taller
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadDañada', -1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Restar 1"
                            >
                              <Minus className="w-3 h-3 text-black" />
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
                              className="w-full precision-input text-center text-sm font-mono font-black text-black bg-white border-neutral-300 focus:border-black"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadDañada', 1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Sumar 1"
                            >
                              <Plus className="w-3 h-3 text-black" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-neutral-800">
                            <span>Sanas: <b className="text-black font-black">{buenEstado} u.</b></span>
                            <span>Taller: <b className="text-black font-black">{danadas} u.</b></span>
                          </div>
                        </div>

                        {/* 3. En Obra */}
                        <div className="bg-white p-3.5 rounded-lg border border-neutral-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-black uppercase">
                              3. ¿Cuánto falta? (En Obra)
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-black border border-neutral-200">
                              Pendiente
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPendiente', -1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Restar 1"
                            >
                              <Minus className="w-3 h-3 text-black" />
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
                              className="w-full precision-input text-center text-sm font-mono font-black text-black bg-white border-neutral-300 focus:border-black"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPendiente', 1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Sumar 1"
                            >
                              <Plus className="w-3 h-3 text-black" />
                            </button>
                          </div>
                          <span className="text-[10px] text-neutral-700 font-semibold block text-center">
                            Continúa en obra
                          </span>
                        </div>

                        {/* 4. Perdidas */}
                        <div className="bg-white p-3.5 rounded-lg border border-neutral-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-black uppercase">
                              4. Perdidas / Extraviadas
                            </label>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-black border border-neutral-200">
                              Baja
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPerdida', -1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Restar 1"
                            >
                              <Minus className="w-3 h-3 text-black" />
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
                              className="w-full precision-input text-center text-sm font-mono font-black text-black bg-white border-neutral-300 focus:border-black"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 'cantidadPerdida', 1)}
                              className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-black border border-neutral-300 flex items-center justify-center cursor-pointer shrink-0 font-bold"
                              title="Sumar 1"
                            >
                              <Plus className="w-3 h-3 text-black" />
                            </button>
                          </div>
                          <span className="text-[10px] text-neutral-700 font-semibold block text-center">
                            Para reposición
                          </span>
                        </div>

                      </div>

                      {/* Barra de Cuadre Formal */}
                      <div className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                        isBalanced
                          ? 'bg-white border-neutral-300 text-neutral-900'
                          : 'bg-white border-2 border-amber-600 text-black'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isBalanced ? 'bg-black' : 'bg-amber-600'}`} />
                          <span className="font-semibold">
                            {isBalanced ? (
                              <>
                                Balance cuadrado: <span className="font-black text-black">{recibidas} recibidas</span> ({buenEstado} sanas + {danadas} taller) + <span className="font-black text-black">{pendientes} en obra</span> + <span className="font-black text-black">{perdidas} perdidas</span> = <span className="font-black text-black">{maxSaldo} despachadas</span>.
                              </>
                            ) : (
                              <>
                                <b className="font-black">Descuadre:</b> Registradas {totalBalance} de {maxSaldo} unidades en obra.{' '}
                                {balanceDiff > 0
                                  ? `Faltan ${balanceDiff} u. por clasificar.`
                                  : `Sobran ${Math.abs(balanceDiff)} u.`}
                              </>
                            )}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded border shrink-0 ${
                          isBalanced
                            ? 'border-black bg-white text-black'
                            : 'border-amber-600 bg-white text-amber-900'
                        }`}>
                          {isBalanced ? 'CUADRADO' : `${Math.abs(balanceDiff)} DIFERENCIA`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* HORÓMETRO (Solo si la máquina fue recibida) */}
                  {item.tieneHorometro && !estaEnObra && (
                    <div className="space-y-3 bg-white border border-neutral-300 p-4 rounded-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-black uppercase block mb-1">
                            Horómetro Inicial
                          </label>
                          <input
                            type="text"
                            value={`${item.horometroInicial} hrs`}
                            disabled
                            className="w-full precision-input text-xs font-mono font-bold bg-neutral-100 text-black border-neutral-300"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-black uppercase block mb-1">
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
                              className="w-full precision-input text-xs font-mono font-black pl-8 border-neutral-300 focus:border-black text-black bg-white"
                              placeholder="0.0"
                              required={estaRecibido}
                            />
                            <Gauge className="w-3.5 h-3.5 text-black absolute left-2.5 top-2.5" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-black uppercase block mb-1">
                            Horas de Uso Calculadas
                          </label>
                          <div className="w-full precision-input text-xs font-mono font-bold bg-white text-black flex items-center justify-between border-neutral-300">
                            <span className="font-black">{horasUso === null ? 'Pendiente' : `+${horasUso.toFixed(1)} hrs`}</span>
                            <span className="text-[9px] text-neutral-600 font-bold uppercase">Registrado</span>
                          </div>
                        </div>
                      </div>

                      {item.tipoMedicionCombustible !== 'NO_APLICA' && (
                        <div>
                          <label className="text-[10px] font-black text-black uppercase block mb-1">
                            Combustible al retornar ({item.tipoMedicionCombustible})
                          </label>
                          <input
                            value={item.combustibleRetorno}
                            onChange={(e) => handleItemChange(idx, 'combustibleRetorno', e.target.value)}
                            className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black font-medium"
                            placeholder="Nivel o lectura del indicador"
                            required={estaRecibido}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* INSPECCIÓN TÉCNICA (Solo recibidos) */}
                  {!estaEnObra && (
                    <div className="border border-neutral-300 bg-white p-4 rounded-xl space-y-3">
                      <h5 className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Inspección Técnica de Recepción
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="text-xs font-bold text-black">Funcionamiento
                          <select
                            value={item.inspeccionEstado.funcionamiento}
                            onChange={(e) => updateInspection(idx, 'funcionamiento', e.target.value)}
                            className="w-full precision-input text-xs mt-1 bg-white text-black border-neutral-300 focus:border-black font-medium"
                            required={estaRecibido}
                          >
                            <option value="">Seleccione</option>
                            <option value="FUNCIONA">Funciona</option>
                            <option value="NO_FUNCIONA">No funciona</option>
                            <option value="NO_VERIFICADO">No se pudo verificar</option>
                          </select>
                        </label>
                        <label className="text-xs font-bold text-black">Estado físico
                          <select
                            value={item.inspeccionEstado.estadoFisico}
                            onChange={(e) => updateInspection(idx, 'estadoFisico', e.target.value)}
                            className="w-full precision-input text-xs mt-1 bg-white text-black border-neutral-300 focus:border-black font-medium"
                            required={estaRecibido}
                          >
                            <option value="">Seleccione</option>
                            <option value="BUENO">Buen estado</option>
                            <option value="DESGASTE_NORMAL">Desgaste normal</option>
                            <option value="DANADO">Dañado</option>
                          </select>
                        </label>
                        <label className="text-xs font-bold text-black">Accesorios
                          <select
                            value={item.inspeccionEstado.accesoriosCompletos === null ? '' : String(item.inspeccionEstado.accesoriosCompletos)}
                            onChange={(e) => updateInspection(idx, 'accesoriosCompletos', e.target.value === 'true')}
                            className="w-full precision-input text-xs mt-1 bg-white text-black border-neutral-300 focus:border-black font-medium"
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
                        className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black font-medium"
                        placeholder="Observaciones de la inspección física"
                        aria-label="Observaciones de la inspección"
                      />
                      <textarea
                        value={item.inspeccionEstado.fotosTexto}
                        onChange={(e) => updateInspection(idx, 'fotosTexto', e.target.value)}
                        className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black font-medium"
                        placeholder="Enlaces de fotos, uno por línea"
                        aria-label="Enlaces de fotos del retorno"
                      />
                    </div>
                  )}

                  {/* CONTROL DE AVERÍAS PARA TALLER */}
                  {!estaEnObra && (
                    <div className="border border-neutral-300 bg-white p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-black" />
                          <span className="text-xs font-black text-black uppercase tracking-wider">
                            Determinar fallas y enviar a mantenimiento
                          </span>
                          {(item.daniosDetectados || Number(item.cantidadDañada) > 0 || item.inspeccionEstado.estadoFisico === 'DANADO' || item.estadoSeleccionado === 'DANADO') && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-black border border-black">
                              Pasa a Taller ({item.tipoControl === 'SERIALIZADO' ? '1 u.' : `${item.cantidadDañada || 1} u.`})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddDanio(idx)}
                          className="text-xs font-bold text-black hover:bg-neutral-100 flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-neutral-300 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-black" /> Agregar Detalle Específico de Daño
                        </button>
                      </div>

                      {/* Campo Directo de Avería */}
                      <div className="p-3.5 bg-white border border-neutral-300 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase text-black block">
                            Motivo o Avería para Taller (Opcional si llegó sano)
                          </label>
                          {Number(item.cantidadDañada) > 0 && (
                            <span className="text-[10px] font-bold text-black">
                              {item.cantidadDañada} u. asignadas a reparación
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.motivoAveria || ''}
                          onChange={(e) => handleItemChange(idx, 'motivoAveria', e.target.value)}
                          placeholder="Ej. Fuga de aceite, manguera rota, motor no enciende, rosca barrida"
                          className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black font-medium"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-black text-black">Fallas comunes:</span>
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
                              className="text-[10px] font-bold bg-white hover:bg-neutral-100 text-black px-2 py-0.5 rounded border border-neutral-300 transition-colors cursor-pointer"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Detalle Avanzado de Daños (Si se requiere) */}
                      {item.danios.map((d: any, dIdx: number) => (
                        <div key={dIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-neutral-300 items-end">
                          <div>
                            <label className="text-[9px] font-black text-black uppercase block mb-1">Componente *</label>
                            <input
                              type="text"
                              value={d.componente}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'componente', e.target.value)}
                              className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black font-medium"
                              placeholder="Ej. Brazo, Manguera, Motor"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-black uppercase block mb-1">Tipo de Daño *</label>
                            <input
                              type="text"
                              value={d.tipoDano}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'tipoDano', e.target.value)}
                              className="w-full precision-input text-xs bg-white text-black border-neutral-300 focus:border-black font-medium"
                              placeholder="Ej. Fuga, Rotura, Golpe"
                              required
                            />
                          </div>
                          <label className="text-[9px] font-black text-black uppercase">Responsabilidad
                            <select
                              value={String(d.cobrable)}
                              onChange={(e) => handleDanioChange(idx, dIdx, 'cobrable', e.target.value === 'true')}
                              className="w-full precision-input text-xs mt-1 bg-white text-black border-neutral-300 focus:border-black font-medium"
                            >
                              <option value="false">Costo interno</option>
                              <option value="true">Cobrar al cliente</option>
                            </select>
                          </label>
                          <div>
                            <label className="text-[9px] font-black text-black uppercase block mb-1">Costo Estimado (C$)</label>
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
                              className="w-full precision-input text-xs font-mono font-bold bg-white text-black border-neutral-300 focus:border-black"
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveDanio(idx, dIdx)}
                              className="p-1.5 text-neutral-600 hover:text-red-700 cursor-pointer"
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

        {/* Sección de Estimación y Liquidación Formal */}
        <section className="bg-white border-2 border-neutral-300 p-5 rounded-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
            <WalletCards className="w-4 h-4 text-black" /> Estimación preliminar de liquidación
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-lg border border-neutral-300">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Período pactado</span>
              <span className="font-black text-black">{timing.contractedDays} días · {money(timing.contractedAmount)}</span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-neutral-300">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Tiempo efectivo</span>
              <span className="font-black text-black">{timing.effectiveDays} días · {money(timing.accruedAmount)}</span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-neutral-300">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Tarifa pactada</span>
              <span className="font-black text-black">{money(timing.dailyRate)} / día</span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-neutral-300">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block mb-0.5">Diferencia no devengada</span>
              <span className="font-black text-black">{money(timing.unearnedDifference)}</span>
            </div>
          </div>
          <div className="p-3 bg-white border border-neutral-300 rounded-lg text-[11px] text-neutral-800 space-y-1">
            <p className="font-medium">El cálculo oficial definitivo lo realizará el servidor al registrar el acta de recepción.</p>
            <p className="font-medium">Si existe saldo no devengado a favor del cliente, se tramitará la nota de crédito respectiva en Facturación.</p>
          </div>
          <label className="flex items-start gap-2 text-xs font-bold text-black cursor-pointer pt-1">
            <input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)} className="mt-0.5 text-black focus:ring-black" />
            Confirmo que verifiqué las cantidades físicas recibidas, el estado técnico de los equipos y el cálculo preliminar.
          </label>
        </section>

        {/* Botones de Acción */}
        <div className="border-t-2 border-neutral-300 pt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-black hover:bg-neutral-100 border border-neutral-300 bg-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-black hover:bg-neutral-800 text-white text-xs font-black py-2.5 px-6 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {isSubmitting ? (
              <span>Procesando Retorno...</span>
            ) : (
              <>
                <Check className="w-4 h-4 text-white" /> Registrar Retorno e Imprimir Acta de Recepción
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

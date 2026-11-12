import React, { useState, useEffect } from 'react';
import {
  Home,
  RefreshCw,
  ArrowLeft,
  Wrench,
  WifiOff,
  Copy,
  Check,
  Phone,
  Layers,
  FileText,
  Users,
  Grid,
} from 'lucide-react';

export type SystemErrorCode = '404' | '500' | '503' | 'offline';

export interface SystemStatusPageProps {
  /** Código o tipo de error/estado: 404 (No encontrado), 500 (Caída/Falla de app), 503 (Servicio/Mantenimiento), offline (Sin red) */
  code?: SystemErrorCode;
  title?: string;
  subtitle?: string;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
  onRetry?: () => void;
  onGoHome?: () => void;
  /** Permite al usuario conmutar entre modos para demostración o inspección */
  allowModeSwitch?: boolean;
}

interface ConfigItem {
  badge: string;
  badgeColor: string;
  dotColor: string;
  defaultTitle: string;
  defaultSubtitle: string;
  primaryActionLabel: string;
  primaryActionIcon: React.ElementType;
  hint: string;
}

const CONFIG_MAP: Record<SystemErrorCode, ConfigItem> = {
  '404': {
    badge: 'Ruta Fuera del Mapa de Obra',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    dotColor: 'bg-amber-500',
    defaultTitle: '¡Zona Fuera del Mapa!',
    defaultSubtitle:
      'La página, recurso o cotización que intentas consultar no existe, fue reubicada o el enlace ingresado contiene un error tipográfico.',
    primaryActionLabel: 'Volver al Panel Principal',
    primaryActionIcon: Home,
    hint: 'Verifica la dirección URL o navega a los módulos principales de la empresa.',
  },
  '500': {
    badge: 'Interrupción en la Maquinaria',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    dotColor: 'bg-rose-500',
    defaultTitle: 'Interrupción Inesperada en el Sistema',
    defaultSubtitle:
      'Se presentó un fallo técnico en el procesamiento de esta vista. No te preocupes: los datos de tu empresa y el inventario están 100% seguros y respaldados.',
    primaryActionLabel: 'Reintentar Operación',
    primaryActionIcon: RefreshCw,
    hint: 'Si el problema persiste, puedes copiar el reporte técnico inferior y compartirlo al equipo de soporte de Abdia.',
  },
  '503': {
    badge: 'Mantenimiento Preventivo de Servidor',
    badgeColor: 'bg-blue-50 text-[#1A73E8] border-blue-200',
    dotColor: 'bg-[#1A73E8]',
    defaultTitle: 'Servidor en Mantenimiento de Pista',
    defaultSubtitle:
      'Estamos optimizando la infraestructura del ERP o el servidor se encuentra reiniciando sus servicios de forma programada. Volveremos en breve.',
    primaryActionLabel: 'Comprobar Disponibilidad',
    primaryActionIcon: RefreshCw,
    hint: 'La conexión se restablece automáticamente una vez completada la sincronización.',
  },
  offline: {
    badge: 'Dispositivo Sin Conexión',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    dotColor: 'bg-slate-500',
    defaultTitle: 'Se Perdió el Enlace con la Red',
    defaultSubtitle:
      'Tu equipo de trabajo o dispositivo móvil no puede comunicarse con el servidor central de BM Construcciones. Verifica tu conexión Wi-Fi o datos móviles.',
    primaryActionLabel: 'Reconectar Ahora',
    primaryActionIcon: WifiOff,
    hint: 'Una vez detectada la señal, el sistema retomará tu sesión automáticamente.',
  },
};

export const SystemStatusPage: React.FC<SystemStatusPageProps> = ({
  code: initialCode = '404',
  title,
  subtitle,
  error,
  errorInfo,
  onRetry,
  onGoHome,
  allowModeSwitch = false,
}) => {
  const [currentCode, setCurrentCode] = useState<SystemErrorCode>(initialCode);
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [serverStatusMessage, setServerStatusMessage] = useState<string | null>(null);

  // Escucha cambios de conectividad de red si está en modo offline
  useEffect(() => {
    const handleOnline = () => {
      if (currentCode === 'offline') {
        window.location.reload();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentCode]);

  const config = CONFIG_MAP[currentCode] || CONFIG_MAP['404'];
  const displayTitle = title || config.defaultTitle;
  const displaySubtitle = subtitle || config.defaultSubtitle;
  const PrimaryIcon = config.primaryActionIcon;

  const handlePrimaryAction = async () => {
    if (currentCode === '503') {
      setIsCheckingServer(true);
      setServerStatusMessage('Consultando el estado del servidor central...');
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) {
          setServerStatusMessage('✅ ¡Servidor disponible! Recargando sistema...');
          setTimeout(() => {
            window.location.href = '/';
          }, 1200);
          return;
        }
      } catch {
        // Servidor aún caído
      } finally {
        setTimeout(() => {
          setIsCheckingServer(false);
          setServerStatusMessage('⚠️ El servidor continúa en proceso. Intentando de nuevo en unos momentos.');
        }, 800);
      }
      return;
    }

    if (onRetry) {
      onRetry();
    } else if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const technicalReport = `=== REPORTE DE ERROR BM CONSTRUCCIONES ERP ===
Código: ${currentCode}
Fecha/Hora: ${new Date().toISOString()}
Ruta Actual: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
User-Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
Error: ${error?.message || 'Error no especificado'}
Stack:
${error?.stack || 'No disponible'}
ComponentStack:
${errorInfo?.componentStack || 'No disponible'}
=================================================`;

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(technicalReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback si clipboard falla
    }
  };

  return (
    <div className="min-h-screen bg-[#EFF3F8] text-[#1B1D22] flex flex-col justify-between selection:bg-[#CFE0FC] selection:text-[#1B1D22] relative overflow-hidden font-sans">
      {/* Fondo con Blueprint Grid Industrial */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#1A73E8_1.2px,transparent_1.2px)] [background-size:28px_28px]"
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 -right-32 w-96 h-96 bg-[#1A73E8]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#C55500]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Barra de Demostración y Pruebas (Opcional) */}
      {allowModeSwitch && (
        <div className="relative z-30 bg-[#1B1D22] text-white px-4 py-2 flex flex-wrap items-center justify-between text-xs border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-[#1A73E8] px-2 py-0.5 rounded text-[11px] font-bold">VISTA PREVIA</span>
            <span className="text-slate-300">Conmutador interactivo de estados:</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
            {(['404', '500', '503', 'offline'] as SystemErrorCode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCurrentCode(mode)}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  currentCode === mode ? 'bg-[#1A73E8] text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Encabezado Corporativo Minimalista */}
      <header className="relative z-20 px-6 sm:px-12 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <a href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A73E8] rounded-xl p-1">
          <div className="w-10 h-10 rounded-xl bg-[#1A73E8] flex items-center justify-center shadow-md shadow-[#1A73E8]/20 transition-transform group-hover:scale-105">
            <Grid className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black text-sm tracking-wide text-[#1B1D22] block leading-tight">BM CONSTRUCCIONES</span>
            <span className="text-[10px] text-[#747780] font-semibold tracking-wider block uppercase leading-none">
              ERP Rental System S.A.
            </span>
          </div>
        </a>

        {/* Indicador de Estado y Soporte */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E5E8EE] text-xs font-semibold text-[#5A5D66] shadow-xs">
            <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
            <span>Sistema Protegido</span>
          </div>
          <a
            href="https://wa.me/50588888888?text=Hola,%20solicito%20soporte%20en%20el%20ERP%20BM%20Construcciones"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E8EE] hover:border-[#1A73E8]/30 hover:text-[#1A73E8] text-xs font-bold text-[#37474F] shadow-xs transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mesa de Soporte</span>
          </a>
        </div>
      </header>

      {/* Contenido Central */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full text-center">
        {/* Ilustración Vectorial Dinámica Temática Maquinaria */}
        <div className="relative mb-6 select-none">
          {/* Número Gigante de Fondo Suave */}
          <div className="text-[100px] sm:text-[140px] font-black tracking-tighter text-[#1A73E8]/10 leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
            {currentCode.toUpperCase()}
          </div>

          {/* SVG Vectorial Artesanal de Alta Precisión */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto flex items-center justify-center">
            {currentCode === '404' && (
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Suelo de Obra */}
                <path d="M20 160H180" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />
                {/* Cono de Seguridad 1 */}
                <path d="M40 160L55 110H65L80 160H40Z" fill="#C55500" />
                <path d="M49 130H71L68 120H52L49 130Z" fill="white" />
                <path d="M44 148H76L73 138H47L44 148Z" fill="white" />
                <rect x="36" y="160" width="48" height="6" rx="3" fill="#823500" />
                {/* Maquinaria Excavadora Simbólica */}
                <rect x="100" y="125" width="55" height="30" rx="6" fill="#1A73E8" />
                <rect x="106" y="112" width="30" height="15" rx="3" fill="#E8F0FE" stroke="#1A73E8" strokeWidth="2" />
                {/* Oruga / Ruedas */}
                <rect x="94" y="152" width="68" height="12" rx="6" fill="#1B1D22" />
                <circle cx="106" cy="158" r="4" fill="#64748B" />
                <circle cx="128" cy="158" r="4" fill="#64748B" />
                <circle cx="150" cy="158" r="4" fill="#64748B" />
                {/* Brazo buscando camino con signo de interrogación */}
                <path d="M145 130L168 105L180 115" stroke="#1557B0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Lupa / Radar de búsqueda */}
                <circle cx="120" cy="65" r="24" fill="#E8F0FE" stroke="#1A73E8" strokeWidth="4" />
                <path d="M137 82L155 100" stroke="#1A73E8" strokeWidth="5" strokeLinecap="round" />
                <path d="M116 57C116 54.8 117.8 53 120 53C122.2 53 124 54.8 124 57C124 60 120 62 120 65" stroke="#1A73E8" strokeWidth="3" strokeLinecap="round" />
                <circle cx="120" cy="72" r="2" fill="#1A73E8" />
              </svg>
            )}

            {currentCode === '500' && (
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Círculo de Alerta */}
                <circle cx="100" cy="100" r="70" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="3" />
                {/* Engranaje Industrial de Maquinaria */}
                <path
                  d="M100 55L104 65L115 63L116 74L127 75L124 86L134 90L128 99L135 107L126 112L129 123L118 125L117 136L106 134L102 145L93 140L86 149L79 141L70 147L67 136L56 137L57 126L47 123L51 113L43 106L50 98L44 89L55 86L54 75L65 74L67 63L78 65L82 55L91 60L100 55Z"
                  fill="#E2E8F0"
                  stroke="#94A3B8"
                  strokeWidth="2"
                />
                <circle cx="95" cy="102" r="22" fill="#FEF2F2" stroke="#94A3B8" strokeWidth="3" />
                {/* Llave Mecánica Cruzada */}
                <path
                  d="M65 140L125 80M125 80C128 77 132 75 137 77C142 79 144 84 142 88C140 93 135 95 132 94L125 80Z"
                  stroke="#C55500"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                {/* Escudo de Alerta en Centro */}
                <path d="M100 40L140 55V90C140 120 100 135 100 135C100 135 60 120 60 90V55L100 40Z" fill="#E11D48" />
                <path d="M100 65V88" stroke="white" strokeWidth="4" strokeLinecap="round" />
                <circle cx="100" cy="102" r="3" fill="white" />
              </svg>
            )}

            {currentCode === '503' && (
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Grúa de Construcción / Scaffolding */}
                <path d="M40 170H160" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
                {/* Torre de la Grúa */}
                <path d="M60 170V60L160 60" stroke="#1A73E8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M60 85L85 60M60 110L110 60M60 135L135 60" stroke="#93C5FD" strokeWidth="2" />
                {/* Cable y Carga */}
                <path d="M130 60V105" stroke="#37474F" strokeWidth="2.5" strokeDasharray="3 3" />
                <rect x="115" y="105" width="30" height="25" rx="4" fill="#C55500" />
                {/* Servidor / Tuerca */}
                <rect x="120" y="112" width="20" height="3" fill="white" />
                <rect x="120" y="118" width="20" height="3" fill="white" />
                <circle cx="137" cy="123" r="1.5" fill="#22C55E" />
                {/* Casco de Seguridad */}
                <path d="M35 160C35 145 50 140 60 140C70 140 85 145 85 160H35Z" fill="#FBBF24" />
                <rect x="30" y="160" width="60" height="5" rx="2" fill="#D97706" />
              </svg>
            )}

            {currentCode === 'offline' && (
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="70" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="3" />
                {/* Ondas Wi-Fi Desconectadas */}
                <path d="M60 75C85 55 115 55 140 75" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
                <path d="M75 95C90 82 110 82 125 95" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
                <path d="M90 115C95 110 105 110 110 115" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
                <circle cx="100" cy="135" r="5" fill="#94A3B8" />
                {/* Línea Diagonal Roja de Desconexión */}
                <line x1="50" y1="50" x2="150" y2="150" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>

        {/* Insignia de Estado */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black tracking-wide uppercase mb-3 shadow-2xs">
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <span className={config.badgeColor}>{config.badge}</span>
        </div>

        {/* Título y Descripción Principal */}
        <h1 className="text-2xl sm:text-4xl font-black text-[#1B1D22] tracking-tight mb-3 max-w-2xl leading-snug">
          {displayTitle}
        </h1>
        <p className="text-sm sm:text-base text-[#5A5D66] font-medium max-w-xl mx-auto leading-relaxed mb-8">
          {displaySubtitle}
        </p>

        {/* Mensaje de retroalimentación de servidor si aplica */}
        {serverStatusMessage && (
          <div className="mb-6 px-4 py-2.5 rounded-xl bg-white border border-[#E5E8EE] text-xs font-bold text-[#1A73E8] shadow-xs animate-fadeIn">
            {serverStatusMessage}
          </div>
        )}

        {/* Barra de Acciones Principales */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mx-auto mb-8">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isCheckingServer}
            className="w-full sm:w-auto btn-precision-primary py-3 px-6 text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#1A73E8]/20"
          >
            <PrimaryIcon className={`w-4 h-4 ${isCheckingServer ? 'animate-spin' : ''}`} />
            <span>{isCheckingServer ? 'Verificando...' : config.primaryActionLabel}</span>
          </button>

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto btn-precision-outline py-3 px-5 text-sm flex items-center justify-center gap-2 cursor-pointer bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver Atrás</span>
          </button>
        </div>

        {/* Atajos Rápidos a Módulos Clave (en caso de 404 o pérdida de ruta) */}
        <div className="pt-6 border-t border-[#E5E8EE] w-full max-w-xl">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#747780] mb-3">
            O accede directamente a las áreas principales:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E8EE] hover:border-[#1A73E8] hover:text-[#1A73E8] text-xs font-bold text-[#37474F] shadow-2xs transition-colors"
            >
              <Grid className="w-3.5 h-3.5 text-[#1A73E8]" />
              Panel de Módulos
            </a>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/?module=inventory';
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E8EE] hover:border-[#1A73E8] hover:text-[#1A73E8] text-xs font-bold text-[#37474F] shadow-2xs transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-[#1A73E8]" />
              Maquinaria
            </a>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/?module=quotations';
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C55500] hover:border-[#C55500] hover:text-[#C55500] text-xs font-bold text-[#37474F] shadow-2xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[#C55500]" />
              Cotizaciones
            </a>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/?module=clients';
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E8EE] hover:border-[#1A73E8] hover:text-[#1A73E8] text-xs font-bold text-[#37474F] shadow-2xs transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-[#1A73E8]" />
              Clientes
            </a>
          </div>
        </div>

        {/* Sección Desplegable de Diagnóstico Técnico para Errores 500 */}
        {currentCode === '500' && (
          <div className="mt-8 w-full max-w-2xl text-left">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between w-full p-3.5 bg-white border border-[#E5E8EE] rounded-2xl text-xs font-bold text-[#5A5D66] hover:text-[#1B1D22] hover:border-[#1A73E8]/30 transition-all cursor-pointer shadow-xs"
            >
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#C55500]" />
                {showTechnicalDetails ? 'Ocultar diagnóstico técnico para soporte' : 'Ver diagnóstico técnico del fallo'}
              </span>
              <span className="text-[11px] font-mono text-[#747780]">
                {showTechnicalDetails ? '▲ Cerrar' : '▼ Expandir'}
              </span>
            </button>

            {showTechnicalDetails && (
              <div className="mt-3 p-4 bg-[#1B1D22] text-[#EFF3F8] rounded-2xl text-xs font-mono border border-slate-700 shadow-md animate-fadeIn">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
                  <span className="text-slate-400 text-[11px] font-semibold">Trazabilidad Técnica del Error</span>
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                    <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar Diagnóstico'}</span>
                  </button>
                </div>
                <div className="overflow-x-auto max-h-56 space-y-1.5 text-[11px] leading-relaxed text-slate-300">
                  <p className="text-rose-400 font-bold">
                    Mensaje: {error?.message || 'Error no interceptado en el ciclo de vida React'}
                  </p>
                  {error?.stack && <pre className="whitespace-pre-wrap text-slate-400 font-mono text-[10px]">{error.stack}</pre>}
                  {errorInfo?.componentStack && (
                    <pre className="whitespace-pre-wrap text-slate-500 font-mono text-[10px] border-t border-slate-800 pt-2 mt-2">
                      Pila de componentes: {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pie de Página Corporativo */}
      <footer className="relative z-10 border-t border-[#E5E8EE] bg-white/70 backdrop-blur-xs px-6 sm:px-12 py-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#747780]">
          <p className="font-medium">
            BM Construcciones S.A. &copy; {new Date().getFullYear()} • Sistema de Gestión y Renta de Maquinaria
          </p>
          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 text-[#22C55E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              Base de Datos Respaldada
            </span>
            <span>•</span>
            <a
              href="mailto:soporte@bmconstruccionesnic.digital"
              className="text-[#1A73E8] hover:underline font-bold"
            >
              soporte@bmconstruccionesnic.digital
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

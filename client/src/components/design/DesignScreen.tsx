import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Gauge,
  Handshake,
  MessageSquare,
  Radio,
  Rocket,
  Save,
  Satellite,
  ShieldAlert,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useDesignStore } from '../../store/useDesignStore';
import type { ModuleItem, ModuleCategory, ActiveVote } from '@shared/types';

const CATEGORY_LABEL: Record<ModuleCategory, string> = {
  EST: 'Propulsión [EST]',
  SCI: 'Ciencia [SCI]',
  COM: 'Comms/Energía [COM]',
};

const CATEGORY_COLOR: Record<ModuleCategory, string> = {
  EST: 'text-amber-400',
  SCI: 'text-cyan-400',
  COM: 'text-emerald-400',
};

const ROLE_SUMMARY: Record<string, { controls: string; objective: string }> = {
  PROPULSION: { controls: 'Estructura y propulsión', objective: 'Mantener la masa y el riesgo dentro de los límites del lanzador.' },
  SCIENCE: { controls: 'Instrumentos científicos', objective: 'Alcanzar los puntos científicos objetivo de la misión.' },
  COMMS: { controls: 'Energía y comunicaciones', objective: 'Generar suficiente energía y ancho de banda de descarga.' },
  DIRECTOR: { controls: 'Presupuesto y decisiones', objective: 'Equilibrar costes, masa y objetivos científicos.' },
};

function formatNum(v: number, d = 0) {
  return v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ---- Top Bar ----
function TopBar() {
  const mission = useDesignStore(s => s.mission);
  const telemetry = useDesignStore(s => s.telemetry);
  const launch = useDesignStore(s => s.launch);
  const audit = useDesignStore(s => s.audit);

  const hardBlock = !audit?.canLaunch;

  const handleLaunch = () => {
    if (hardBlock) {
      if (!window.confirm('Hay bloqueos duros (masa/presupuesto). ¿Lanzar de todos modos?')) return;
    } else if ((audit?.warnings.length ?? 0) > 0) {
      if (!window.confirm('Hay alertas de diseño. ¿Continuar con el lanzamiento?')) return;
    }
    launch();
  };

  return (
    <header className="h-14 shrink-0 border-b border-white/10 bg-[#0F1623] px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Rocket className="h-5 w-5 text-cyan-400 shrink-0" aria-hidden="true" />
        <span className="font-semibold text-white tracking-wide">OrbitaLab</span>
        <span className="text-white/40">·</span>
        <span className="text-sm text-slate-200 truncate">{mission?.title ?? 'Misión'}</span>
        <span className="text-xs px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shrink-0">
          {mission?.orbitType ?? 'LEO'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-300">
        {(['PROPULSION', 'SCIENCE', 'COMMS', 'DIRECTOR'] as const).map(r => (
          <span key={r} className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
            {r === 'PROPULSION' ? 'Propulsión [EST]' : r === 'SCIENCE' ? 'Ciencia [SCI]' : r === 'COMMS' ? 'Comms [COM]' : 'Director'}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-300 font-mono tabular-nums">
          {telemetry?.projectedSciencePoints ?? 0} / {mission?.targetSciencePoints ?? 0} pts
        </div>
        <button
          onClick={handleLaunch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold transition-colors"
        >
          <Rocket className="h-4 w-4" aria-hidden="true" />
          Simular Lanzamiento
        </button>
      </div>
    </header>
  );
}

// ---- Left Column ----
function LeftColumn({ onOpen }: { onOpen: (v: 'EST' | 'SCI' | 'COM' | 'debate') => void }) {
  const selectedModules = useDesignStore(s => s.selectedModules);
  const activeVote = useDesignStore(s => s.activeVote);
  const myRole = useDesignStore(s => s.myRole);

  const countByCat = (cat: ModuleCategory) => selectedModules.filter(m => m.category === cat).length;
  const sciSlotsUsed = selectedModules.filter(m => m.category === 'SCI').reduce((s, m) => s + (m.slotsRequired ?? 1), 0);
  const sciSlotsTotal = 3;

  const debateCount = activeVote ? 1 : 0;

  const btnBase = 'w-full flex items-center justify-between px-3 py-2.5 rounded border text-sm font-medium transition-colors';

  return (
    <aside className="bg-[#0F1623] border-r border-white/10 flex flex-col overflow-hidden p-3 gap-3">
      <div className="flex flex-col gap-2.5">
        <button onClick={() => onOpen('EST')} className={`${btnBase} border-white/10 bg-white/5 text-slate-200 hover:bg-white/10`}>
          <span className={CATEGORY_COLOR.EST}>Propulsión [EST]</span>
          <span className="text-xs font-mono tabular-nums text-slate-400">{countByCat('EST')} piezas</span>
        </button>
        <button onClick={() => onOpen('SCI')} className={`${btnBase} border-white/10 bg-white/5 text-slate-200 hover:bg-white/10`}>
          <span className={CATEGORY_COLOR.SCI}>Ciencia [SCI]</span>
          <span className="text-xs font-mono tabular-nums text-slate-400">{sciSlotsUsed}/{sciSlotsTotal} ranuras</span>
        </button>
        <button onClick={() => onOpen('COM')} className={`${btnBase} border-white/10 bg-white/5 text-slate-200 hover:bg-white/10`}>
          <span className={CATEGORY_COLOR.COM}>Comms/Energía [COM]</span>
          <span className="text-xs font-mono tabular-nums text-slate-400">{countByCat('COM')} piezas</span>
        </button>
        <div className="h-px bg-white/10 my-1" />
        <button onClick={() => onOpen('debate')} className={`${btnBase} border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10`}>
          <span className="inline-flex items-center gap-1.5">
            <Handshake className="h-4 w-4" aria-hidden="true" />
            Mesa de debate
          </span>
          {debateCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold animate-pulse">
              {debateCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-auto rounded border border-white/10 bg-[#131A29] p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">ROL ACTIVO</p>
        {myRole && ROLE_SUMMARY[myRole] ? (
          <>
            <p className="text-sm font-medium text-white">{myRole}</p>
            <p className="text-xs text-slate-400 mt-1">{ROLE_SUMMARY[myRole].controls}</p>
            <p className="text-xs text-slate-500 mt-0.5">{ROLE_SUMMARY[myRole].objective}</p>
          </>
        ) : (
          <p className="text-xs text-slate-500">Selecciona un rol en el lobby para ver tu objetivo.</p>
        )}
      </div>
    </aside>
  );
}

// ---- Center Column ----
function CenterColumn() {
  const blueprintView = useDesignStore(s => s.blueprintView);
  const setBlueprintView = useDesignStore(s => s.setBlueprintView);
  const selectedModules = useDesignStore(s => s.selectedModules);
  const mission = useDesignStore(s => s.mission);

  const views = ['VAB · Lanzamiento', 'Carga Útil · Satélite', 'ConOps · Órbita'];
  const prev = () => setBlueprintView((blueprintView + 2) % 3);
  const next = () => setBlueprintView((blueprintView + 1) % 3);

  const hasEST = selectedModules.some(m => m.category === 'EST');
  const hasSCI = selectedModules.some(m => m.category === 'SCI');
  const hasCOM = selectedModules.some(m => m.category === 'COM');

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTransform(t => ({ ...t, x: dragRef.current!.origX + dx, y: dragRef.current!.origY + dy }));
  };
  const onPointerUp = () => { dragRef.current = null; };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setTransform(t => ({ ...t, scale: Math.max(0.5, Math.min(3, t.scale - e.deltaY * 0.0015)) }));
  };
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  return (
    <section className="bg-[#090D16] flex flex-col overflow-hidden">
      <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing">
        <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 transition-colors" aria-label="Vista anterior">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 transition-colors" aria-label="Vista siguiente">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-xs font-mono text-slate-400 bg-black/40 px-2 py-1 rounded">
          {views[blueprintView]}
        </div>
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button onClick={resetView} className="text-[10px] px-2 py-1 rounded bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-colors" aria-label="Restablecer vista">
            Reset
          </button>
          <button onClick={() => setFullscreen(true)} className="text-[10px] px-2 py-1 rounded bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-colors" aria-label="Pantalla completa">
            ⛶ Full
          </button>
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        >
          <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: 'center', transition: dragRef.current ? 'none' : 'transform 0.15s ease-out', willChange: 'transform' }}>
            <BlueprintSVG view={blueprintView} hasEST={hasEST} hasSCI={hasSCI} hasCOM={hasCOM} />
          </div>
        </div>

        {fullscreen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setFullscreen(false)}>
            <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <button onClick={() => setFullscreen(false)} className="absolute top-2 right-2 z-10 text-xs px-3 py-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors">
                ✕ Cerrar
              </button>
              <div className="w-full h-full flex items-center justify-center">
                <BlueprintSVG view={blueprintView} hasEST={hasEST} hasSCI={hasSCI} hasCOM={hasCOM} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] text-slate-500 shrink-0 uppercase tracking-wider">Equipados</span>
        {selectedModules.length === 0 && <span className="text-xs text-slate-600">Ninguno</span>}
        {selectedModules.map(m => (
          <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/5 text-xs text-slate-200 shrink-0">
            {m.name}
            <button onClick={() => useDesignStore.getState().proposeModule(m.id, 'REMOVE')} className="text-slate-500 hover:text-red-400" aria-label={`Quitar ${m.name}`}>
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2 flex items-center gap-2 text-xs text-slate-400">
        <Satellite className="h-3.5 w-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
        <span className="truncate">
          Referencia NASA · {mission?.realNasaReference.missionName}: {mission?.realNasaReference.engineeringLesson}
        </span>
      </div>
    </section>
  );
}

// ---- Blueprint SVG (professional technical drawing) ----
function BlueprintSVG({ view, hasEST, hasSCI, hasCOM }: { view: number; hasEST: boolean; hasSCI: boolean; hasCOM: boolean }) {
  const gridColor = 'rgba(56,189,248,0.10)';
  const frameColor = 'rgba(56,189,248,0.35)';
  const accent = '#38bdf8';
  const amber = '#f59e0b';
  const green = '#10b981';
  const cyan = '#22d3ee';

  if (view === 0) {
    return (
      <svg viewBox="0 0 220 320" className="h-[280px] w-auto drop-shadow-[0_0_12px_rgba(56,189,248,0.15)]" aria-label="Segmento de Lanzamiento">
        <defs>
          <pattern id="gridVAB" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke={gridColor} strokeWidth="0.5" />
          </pattern>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="220" height="320" fill="url(#gridVAB)" />
        {/* frame brackets */}
        <path d="M 8 8 L 8 24 M 8 8 L 24 8" stroke={frameColor} strokeWidth="1.5" fill="none" />
        <path d="M 212 8 L 212 24 M 212 8 L 196 8" stroke={frameColor} strokeWidth="1.5" fill="none" />
        <path d="M 8 312 L 8 296 M 8 312 L 24 312" stroke={frameColor} strokeWidth="1.5" fill="none" />
        <path d="M 212 312 L 212 296 M 212 312 L 196 312" stroke={frameColor} strokeWidth="1.5" fill="none" />

        {/* dimension line */}
        <line x1="40" y1="30" x2="40" y2="220" stroke="#475569" strokeWidth="0.5" strokeDasharray="2 2" />
        <text x="34" y="125" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace" transform="rotate(-90 34 125)">2.3 m</text>

        {/* rocket body */}
        <rect x="92" y="70" width="36" height="170" fill="url(#bodyGrad)" stroke={accent} strokeWidth="1.8" rx="4" />
        {/* nose cone */}
        <polygon points="92,70 110,35 128,70" fill={accent} opacity="0.85" />
        <polygon points="92,70 110,35 128,70" fill="none" stroke={accent} strokeWidth="1.5" />
        {/* payload fairing */}
        <rect x="96" y="55" width="28" height="18" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" rx="2" />
        <line x1="110" y1="55" x2="110" y2="73" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2 1" />

        {/* boosters */}
        {hasEST && (
          <>
            <rect x="62" y="135" width="22" height="100" fill="#1e293b" stroke={amber} strokeWidth="1.2" rx="3" />
            <rect x="136" y="135" width="22" height="100" fill="#1e293b" stroke={amber} strokeWidth="1.2" rx="3" />
            <text x="73" y="185" textAnchor="middle" fill={amber} fontSize="7" fontFamily="monospace">SRB</text>
            <text x="147" y="185" textAnchor="middle" fill={amber} fontSize="7" fontFamily="monospace">SRB</text>
          </>
        )}
        {/* engine */}
        <rect x="98" y="240" width="24" height="12" fill="#334155" stroke={accent} strokeWidth="1" rx="2" />
        {/* exhaust */}
        <path d="M 102 252 L 100 270 L 108 260 L 112 275 L 118 260 L 120 270 L 118 252" fill="none" stroke={amber} strokeWidth="1" opacity="0.6" />

        <text x="110" y="305" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace" letterSpacing="1">VAB · LANZADOR</text>
        <text x="110" y="16" textAnchor="middle" fill={accent} fontSize="8" fontFamily="monospace" opacity="0.7">REV 04 · SSO 650km</text>
      </svg>
    );
  }
  if (view === 1) {
    return (
      <svg viewBox="0 0 280 210" className="h-[280px] w-auto drop-shadow-[0_0_12px_rgba(56,189,248,0.15)]" aria-label="Carga Útil">
        <defs>
          <pattern id="gridPayload" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke={gridColor} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="280" height="210" fill="url(#gridPayload)" />
        <path d="M 8 8 L 8 24 M 8 8 L 24 8" stroke={frameColor} strokeWidth="1.5" fill="none" />
        <path d="M 272 8 L 272 24 M 272 8 L 256 8" stroke={frameColor} strokeWidth="1.5" fill="none" />
        <path d="M 8 202 L 8 186 M 8 202 L 24 202" stroke={frameColor} strokeWidth="1.5" fill="none" />
        <path d="M 272 202 L 272 186 M 272 202 L 256 202" stroke={frameColor} strokeWidth="1.5" fill="none" />

        {/* solar panels */}
        {hasCOM && (
          <>
            <rect x="12" y="88" width="88" height="34" fill="#0f172a" stroke={green} strokeWidth="1.2" rx="2" />
            <rect x="180" y="88" width="88" height="34" fill="#0f172a" stroke={green} strokeWidth="1.2" rx="2" />
            {/* panel grid lines */}
            {[0,1,2,3].map(i => (
              <line key={`pl-${i}`} x1={12 + i*22} y1="88" x2={12 + i*22} y2="122" stroke={green} strokeWidth="0.4" opacity="0.5" />
            ))}
            {[0,1,2,3].map(i => (
              <line key={`pr-${i}`} x1={180 + i*22} y1="88" x2={180 + i*22} y2="122" stroke={green} strokeWidth="0.4" opacity="0.5" />
            ))}
            <text x="56" y="84" textAnchor="middle" fill={green} fontSize="7" fontFamily="monospace">SOLAR L</text>
            <text x="224" y="84" textAnchor="middle" fill={green} fontSize="7" fontFamily="monospace">SOLAR R</text>
          </>
        )}
        {/* bus */}
        <rect x="110" y="72" width="60" height="66" fill="#1e293b" stroke={accent} strokeWidth="1.8" rx="6" />
        <rect x="116" y="78" width="48" height="54" fill="#0f172a" stroke="#475569" strokeWidth="0.6" rx="4" />
        {/* sensors */}
        {hasSCI && (
          <>
            <circle cx="125" cy="58" r="9" fill="#0f172a" stroke={cyan} strokeWidth="1.2" />
            <circle cx="125" cy="58" r="4" fill={cyan} opacity="0.6" />
            <circle cx="155" cy="52" r="7" fill="#0f172a" stroke={cyan} strokeWidth="1.2" />
            <circle cx="155" cy="52" r="3" fill={cyan} opacity="0.6" />
            <text x="140" y="44" textAnchor="middle" fill={cyan} fontSize="7" fontFamily="monospace">SCI SENSORS</text>
          </>
        )}
        {/* antenna */}
        {hasCOM && (
          <>
            <line x1="140" y1="72" x2="140" y2="42" stroke={green} strokeWidth="1.5" />
            <circle cx="140" cy="38" r="4" fill="none" stroke={green} strokeWidth="1" />
            <circle cx="140" cy="38" r="1.5" fill={green} />
          </>
        )}
        {/* thruster */}
        <rect x="132" y="138" width="16" height="8" fill="#334155" stroke={accent} strokeWidth="1" rx="2" />

        <text x="140" y="198" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace" letterSpacing="1">CARGA ÚTIL · SATÉLITE</text>
        <text x="140" y="16" textAnchor="middle" fill={accent} fontSize="8" fontFamily="monospace" opacity="0.7">REV 04 · 3 SLOTS SCI</text>
      </svg>
    );
  }
  // ConOps
  return (
    <svg viewBox="0 0 320 210" className="h-[280px] w-auto drop-shadow-[0_0_12px_rgba(56,189,248,0.15)]" aria-label="Concepto de Operaciones">
      <defs>
        <pattern id="gridConOps" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke={gridColor} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="320" height="210" fill="url(#gridConOps)" />
      <path d="M 8 8 L 8 24 M 8 8 L 24 8" stroke={frameColor} strokeWidth="1.5" fill="none" />
      <path d="M 312 8 L 312 24 M 312 8 L 296 8" stroke={frameColor} strokeWidth="1.5" fill="none" />
      <path d="M 8 202 L 8 186 M 8 202 L 24 202" stroke={frameColor} strokeWidth="1.5" fill="none" />
      <path d="M 312 202 L 312 186 M 312 202 L 296 202" stroke={frameColor} strokeWidth="1.5" fill="none" />

      {/* orbit path */}
      <ellipse cx="160" cy="150" rx="120" ry="40" fill="none" stroke={amber} strokeWidth="1.2" strokeDasharray="5 3" opacity="0.7" />

      {/* earth */}
      <circle cx="160" cy="150" r="38" fill="#0f172a" stroke={accent} strokeWidth="1.5" />
      <ellipse cx="160" cy="150" rx="38" ry="11" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.4" />
      {/* continent hints */}
      <path d="M 140 135 Q 150 130 165 138 Q 175 145 160 150" fill="none" stroke="#38bdf8" strokeWidth="0.6" opacity="0.3" />

      {/* satellite on orbit */}
      <rect x="268" y="105" width="14" height="14" fill="#1e293b" stroke={accent} strokeWidth="1.5" rx="2" transform="rotate(15 275 112)" />
      {/* coverage cone */}
      <path d="M 275 119 L 230 150 L 320 150 Z" fill={cyan} opacity="0.08" />

      {/* ground station */}
      <rect x="148" y="196" width="24" height="5" fill={green} opacity="0.8" rx="1" />
      <line x1="160" y1="196" x2="160" y2="188" stroke={green} strokeWidth="1" />
      <text x="160" y="208" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">ESTACIÓN TERRENA</text>

      {/* labels */}
      <text x="160" y="16" textAnchor="middle" fill={accent} fontSize="8" fontFamily="monospace" opacity="0.7">CONOPS · ÓRBITA LEO 650km</text>
      <text x="40" y="100" fill={amber} fontSize="7" fontFamily="monospace">ÓRBITA</text>
      <text x="275" y="98" textAnchor="middle" fill={cyan} fontSize="7" fontFamily="monospace">SAT</text>
    </svg>
  );
}

// ---- Right Column ----
function RightColumn() {
  const telemetry = useDesignStore(s => s.telemetry);
  const audit = useDesignStore(s => s.audit);
  const notify = useDesignStore(s => s.notify);
  const mission = useDesignStore(s => s.mission);

  const t = telemetry;
  const massPct = t ? Math.min(100, t.massPercentage) : 0;
  const energyPct = t && t.powerGeneratedKw > 0 ? Math.min(100, (t.powerConsumedKw / t.powerGeneratedKw) * 100) : 0;
  const budgetTotal = t ? t.budgetSpent + t.budgetRemaining : 1;
  const budgetPct = t ? Math.min(100, (t.budgetSpent / budgetTotal) * 100) : 0;
  const dataPct = t && t.totalDownlinkCapacity > 0 ? Math.min(100, (t.totalDataGenerated / t.totalDownlinkCapacity) * 100) : 0;
  const sciencePct = t ? Math.min(100, (t.projectedSciencePoints / (mission?.targetSciencePoints ?? 1)) * 100) : 0;
  const riskPct = t ? t.structuralRisk : 0;

  const bar = (label: string, value: string, pct: number, color: string) => (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono tabular-nums text-slate-200">{value}</span>
      </div>
      <div className="h-2.5 rounded bg-white/5 overflow-hidden">
        <div className={`h-full rounded transition-all ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );

  return (
    <aside className="bg-[#0F1623] border-l border-white/10 flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/10 px-3 py-2">
        <h2 className="text-sm font-semibold text-white">Telemetría en vivo</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {bar('Objetivo Científico', `${t?.projectedSciencePoints ?? 0} / ${mission?.targetSciencePoints ?? 0} pts`, sciencePct, 'bg-cyan-500')}
        {bar('Masa Total', `${formatNum(t?.totalMassKg ?? 0)} / ${formatNum(mission?.maxLauncherMassKg ?? 0)} kg`, massPct, massPct > 90 ? 'bg-red-500' : 'bg-amber-500')}
        {bar('Energía', `${formatNum(t?.powerConsumedKw ?? 0, 2)} / ${formatNum(t?.powerGeneratedKw ?? 0, 2)} kW`, energyPct, energyPct > 100 ? 'bg-red-500' : 'bg-emerald-500')}
        {bar('Presupuesto', `${formatNum(t?.budgetSpent ?? 0)} / ${formatNum(budgetTotal)} M$`, budgetPct, budgetPct > 100 ? 'bg-red-500' : 'bg-amber-500')}
        {bar('Enlace de Datos', `${formatNum(t?.totalDataGenerated ?? 0)} / ${formatNum(t?.totalDownlinkCapacity ?? 0)} Mbps`, dataPct, dataPct > 100 ? 'bg-red-500' : 'bg-cyan-500')}
        {bar('Riesgo Estructural', `${formatNum(riskPct)} %`, riskPct, riskPct > 50 ? 'bg-red-500' : riskPct > 20 ? 'bg-amber-500' : 'bg-emerald-500')}

        <div className="mt-2">
          <h3 className="text-xs font-semibold text-slate-300 mb-1.5">Alertas de auditoría</h3>
          {audit && (audit.warnings.length > 0 || audit.blocks.length > 0) ? (
            <ul className="flex flex-col gap-1.5">
              {audit.blocks.map((b, i) => (
                <li key={`b-${i}`} className="text-xs rounded border border-red-500/40 bg-red-500/10 text-red-300 px-2 py-1.5">
                  <ShieldAlert className="inline h-3 w-3 mr-1" aria-hidden="true" />{b.message}
                </li>
              ))}
              {audit.warnings.map((w, i) => (
                <li key={`w-${i}`} className="text-xs rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 px-2 py-1.5">
                  <AlertTriangle className="inline h-3 w-3 mr-1" aria-hidden="true" />{w.message}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Sin alertas activas.
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 p-3 flex gap-2">
        <button onClick={() => notify('Diseño guardado (modo local).', 'success')} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors">
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Guardar diseño
        </button>
        <button onClick={() => useDesignStore.getState()._recalcLocal()} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          Restablecer mesa
        </button>
      </div>
    </aside>
  );
}

// ---- Modal ----
function CatalogModal({ view, onClose }: { view: 'EST' | 'SCI' | 'COM' | 'debate'; onClose: () => void }) {
  const modules = useDesignStore(s => s.modules);
  const selectedModules = useDesignStore(s => s.selectedModules);
  const proposeModule = useDesignStore(s => s.proposeModule);
  const vote = useDesignStore(s => s.vote);
  const activeVote = useDesignStore(s => s.activeVote);
  const audit = useDesignStore(s => s.audit);
  const difficulty = useDesignStore(s => s.difficulty);
  const mission = useDesignStore(s => s.mission);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.code === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const isDebate = view === 'debate';
  const title = isDebate ? 'Mesa de Debate del Equipo' : CATEGORY_LABEL[view as ModuleCategory];

  const filtered = modules.filter(m => m.category === view);

  const isSelected = (id: string) => selectedModules.some(m => m.id === id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] bg-[#0F1623] border border-white/15 rounded-xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isDebate
                ? `Propuestas pendientes de votación · ${activeVote ? 1 : 0} activa(s)`
                : `Presupuesto: ${formatNum(audit?.telemetry.budgetRemaining ?? 0)} M$ disponibles · Ranuras científicas: ${selectedModules.filter(m => m.category === 'SCI').reduce((s, m) => s + (m.slotsRequired ?? 1), 0)}/3`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isDebate ? (
            activeVote ? (
              <DebatePanel vote={activeVote} onVote={vote} />
            ) : (
              <div className="text-center text-slate-500 text-sm mt-8">
                <Handshake className="h-8 w-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
                Sin propuestas pendientes de votación.
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(m => {
                const equipped = isSelected(m.id);
                return (
                  <div key={m.id} className="rounded border border-white/10 bg-[#131A29] p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${CATEGORY_COLOR[m.category]}`}>{m.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{m.id}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                          {m.massKg} kg · {m.costMillions} M$ · {m.powerKw} kW · {m.dataGenMbps + m.dataDownlinkMbps} Mbps
                          {m.sciencePoints > 0 && <span className="text-cyan-400 ml-1">+{m.sciencePoints} pts</span>}
                        </div>
                      </div>
                      {equipped && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          Equipado
                        </span>
                      )}
                    </div>
                    {difficulty === 'APPRENTICE' && (
                      <p className="text-[10px] text-slate-400 leading-relaxed">{m.apprenticeTip}</p>
                    )}
                    <button
                      onClick={() => proposeModule(m.id, equipped ? 'REMOVE' : 'ADD')}
                      className={`self-start px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        equipped
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                      }`}
                    >
                      {equipped ? 'Quitar' : '+ Proponer'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebatePanel({ vote, onVote }: { vote: ActiveVote; onVote: (id: string, approve: boolean) => void }) {
  const mod = vote.module;
  return (
    <div className="rounded border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-amber-300">{vote.proposedBy} propone {vote.action}</span>
        <span className="text-xs text-slate-400">{mod.name} ({mod.id})</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{mod.apprenticeTip}</p>
      <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums mb-4">
        <div className="rounded bg-white/5 px-2 py-1.5"><span className="text-slate-500">Masa</span><div className="text-slate-200">{mod.massKg} kg</div></div>
        <div className="rounded bg-white/5 px-2 py-1.5"><span className="text-slate-500">Coste</span><div className="text-slate-200">{mod.costMillions} M$</div></div>
        <div className="rounded bg-white/5 px-2 py-1.5"><span className="text-slate-500">Ciencia</span><div className="text-cyan-400">+{mod.sciencePoints} pts</div></div>
        <div className="rounded bg-white/5 px-2 py-1.5"><span className="text-slate-500">Energía</span><div className="text-slate-200">{mod.powerKw} kW</div></div>
        <div className="rounded bg-white/5 px-2 py-1.5"><span className="text-slate-500">Datos</span><div className="text-slate-200">{mod.dataGenMbps + mod.dataDownlinkMbps} Mbps</div></div>
        <div className="rounded bg-white/5 px-2 py-1.5"><span className="text-slate-500">Riesgo</span><div className="text-slate-200">{mod.riskModifier}</div></div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onVote(vote.voteId, true)} className="flex-1 px-3 py-2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-medium hover:bg-emerald-500/30 transition-colors">
          Aprobar
        </button>
        <button onClick={() => onVote(vote.voteId, false)} className="flex-1 px-3 py-2 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-sm font-medium hover:bg-red-500/30 transition-colors">
          Rechazar
        </button>
      </div>
      <div className="text-[10px] text-slate-500 mt-2">
        Aprobaciones: {vote.approvals.length} · Rechazos: {vote.rejections.length}
      </div>
    </div>
  );
}

// ---- Toasts ----
function ToastStack() {
  const toasts = useDesignStore(s => s.toasts);
  const dismiss = useDesignStore(s => s.dismissToast);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[320px]">
      {toasts.map(t => (
        <div key={t.id} className={`rounded border px-3 py-2 text-xs shadow-lg ${
          t.tone === 'success' ? 'border-emerald-500/40 bg-[#0F1623] text-emerald-300' :
          t.tone === 'error' ? 'border-red-500/40 bg-[#0F1623] text-red-300' :
          t.tone === 'warning' ? 'border-amber-500/40 bg-[#0F1623] text-amber-300' :
          'border-cyan-500/40 bg-[#0F1623] text-cyan-300'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-white"><X className="h-3 w-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Main ----
export function DesignScreen() {
  const connect = useDesignStore(s => s.connect);
  const phase = useDesignStore(s => s.phase);
  const [modalView, setModalView] = useState<'EST' | 'SCI' | 'COM' | 'debate' | null>(null);

  useEffect(() => { connect(); }, [connect]);

  if (phase !== 'DESIGN') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B101B] text-slate-300">
        <div className="text-center">
          <Rocket className="h-8 w-8 mx-auto mb-2 text-cyan-400" aria-hidden="true" />
          <p>Fase: {phase}</p>
          <p className="text-xs text-slate-500 mt-1">La Mesa de Diseño se activa en fase DESIGN.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0B101B] text-slate-200">
      <TopBar />
      <div className="flex-1 grid grid-cols-[340px_1fr_320px] overflow-hidden">
        <LeftColumn onOpen={setModalView} />
        <CenterColumn />
        <RightColumn />
      </div>
      <ToastStack />
      {modalView && <CatalogModal view={modalView} onClose={() => setModalView(null)} />}
    </div>
  );
}

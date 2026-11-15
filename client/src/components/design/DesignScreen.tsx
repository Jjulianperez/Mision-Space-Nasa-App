import { useEffect, useMemo, useState } from 'react';
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
  const modules = useDesignStore(s => s.modules);
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

      {/* active role summary */}
      <div className="mt-auto rounded border border-white/10 bg-[#131A29] p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Rol activo</p>
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

  return (
    <section className="bg-[#090D16] flex flex-col overflow-hidden">
      <div className="flex-1 relative">
        <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 transition-colors" aria-label="Vista anterior">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 transition-colors" aria-label="Vista siguiente">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-xs font-mono text-slate-400 bg-black/40 px-2 py-1 rounded">
          {views[blueprintView]}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <BlueprintSVG view={blueprintView} hasEST={hasEST} hasSCI={hasSCI} hasCOM={hasCOM} />
        </div>
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

function BlueprintSVG({ view, hasEST, hasSCI, hasCOM }: { view: number; hasEST: boolean; hasSCI: boolean; hasCOM: boolean }) {
  if (view === 0) {
    return (
      <svg viewBox="0 0 200 300" className="h-full max-h-[280px] w-auto" aria-label="Segmento de Lanzamiento">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="200" height="300" fill="url(#grid)" />
        <rect x="85" y="60" width="30" height="160" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="4" />
        <polygon points="85,60 100,30 115,60" fill="#38bdf8" opacity="0.8" />
        {hasEST && (
          <>
            <rect x="60" y="120" width="18" height="90" fill="#334155" stroke="#f59e0b" strokeWidth="1" rx="3" />
            <rect x="122" y="120" width="18" height="90" fill="#334155" stroke="#f59e0b" strokeWidth="1" rx="3" />
          </>
        )}
        <rect x="88" y="45" width="24" height="20" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" rx="2" />
        <text x="100" y="280" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">VAB · Lanzador</text>
      </svg>
    );
  }
  if (view === 1) {
    return (
      <svg viewBox="0 0 260 200" className="h-full max-h-[280px] w-auto" aria-label="Carga Útil">
        <defs>
          <pattern id="grid2" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="260" height="200" fill="url(#grid2)" />
        <rect x="100" y="70" width="60" height="60" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="6" />
        {hasCOM && (
          <>
            <rect x="20" y="85" width="75" height="30" fill="#0f172a" stroke="#10b981" strokeWidth="1" rx="2" />
            <rect x="165" y="85" width="75" height="30" fill="#0f172a" stroke="#10b981" strokeWidth="1" rx="2" />
          </>
        )}
        {hasSCI && (
          <>
            <circle cx="130" cy="60" r="8" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
            <circle cx="155" cy="55" r="6" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
          </>
        )}
        {hasCOM && <line x1="130" y1="70" x2="130" y2="40" stroke="#10b981" strokeWidth="1.5" />}
        <text x="130" y="190" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">Carga Útil · Satélite</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 300 200" className="h-full max-h-[280px] w-auto" aria-label="Concepto de Operaciones">
      <defs>
        <pattern id="grid3" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="300" height="200" fill="url(#grid3)" />
      <circle cx="150" cy="160" r="40" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
      <ellipse cx="150" cy="160" rx="40" ry="12" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.5" />
      <path d="M 40 80 Q 150 20 260 80" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="142" y="45" width="16" height="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="2" />
      <rect x="138" y="190" width="24" height="6" fill="#10b981" opacity="0.8" />
      <text x="150" y="198" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Estación terrena</text>
      <text x="150" y="25" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">ConOps · Órbita</text>
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
        {/* header */}
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

        {/* body */}
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

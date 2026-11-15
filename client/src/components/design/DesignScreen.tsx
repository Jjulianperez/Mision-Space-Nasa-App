import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
import { ROLE_META, ROLE_ORDER } from '../../lib/roles';
import { ModuleCatalogModal } from './ModuleCatalogModal';
import type { ModuleItem, ModuleCategory, ActiveVote } from '@shared/types';
import { ConfirmDialog, Modal } from '../shared/Modal';
import { buildDesignGauges } from './designGauges';
import { EmptyState, MeterBar } from '../templates/ConsolePrimitives';

const DesignModel3D = lazy(() =>
  import('./DesignModel3D').then(({ DesignModel3D: Component }) => ({ default: Component })),
);

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

// ---- Top Bar ----
function TopBar() {
  const mission = useDesignStore(s => s.mission);
  const telemetry = useDesignStore(s => s.telemetry);
  const launch = useDesignStore(s => s.launch);
  const audit = useDesignStore(s => s.audit);
  const roomState = useDesignStore(s => s.roomState);
  const myRole = useDesignStore(s => s.myRole);
  const localMode = useDesignStore(s => s.localMode);
  const selectRole = useDesignStore(s => s.selectRole);
  const notify = useDesignStore(s => s.notify);

  const hardBlock = audit !== null && !audit.canLaunch;
  const isSolo = localMode || (roomState?.players.length ?? 1) <= 1;

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLaunch = () => {
    if (!audit) {
      notify('La auditoría de diseño todavía no está disponible. Espera la sincronización antes de lanzar.', 'warning');
      return;
    }
    if (hardBlock) {
      notify(
        `Lanzamiento bloqueado: ${audit.blocks.map((block) => block.message).join(' ')}`,
        'error',
      );
      return;
    }
    if (audit.warnings.length > 0) {
      setConfirmOpen(true);
    } else {
      launch();
    }
  };

  const confirmLaunch = () => {
    setConfirmOpen(false);
    launch();
  };

  const handleRoleChange = (role: typeof ROLE_ORDER[number]) => {
    if (!isSolo) {
      notify('En cooperativo cada operador mantiene su segmento asignado.', 'info');
      return;
    }
    if (role === myRole) return;
    selectRole(role);
    notify(`Consola cambiada a ${ROLE_META[role].label}.`, 'info');
  };

  return (
    <>
    <header className="sticky top-0 z-30 min-h-14 shrink-0 border-b border-white/10 bg-[#0F1623] px-3 py-2 flex flex-wrap items-center justify-between gap-2 sm:px-4 lg:static">
      <div className="flex items-center gap-3 min-w-0">
        <Rocket className="h-5 w-5 text-cyan-400 shrink-0" aria-hidden="true" />
        <span className="font-semibold text-white tracking-wide">OrbitaLab</span>
        <span className="text-white/40">·</span>
        <span className="text-sm text-slate-200 truncate">{mission?.title ?? 'Misión'}</span>
        <span className="text-xs px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shrink-0">
          {mission?.orbitType ?? 'LEO'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-300" role="group" aria-label="Cambiar segmento">
        {ROLE_ORDER.map(role => {
          const active = myRole === role;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={active}
              onClick={() => handleRoleChange(role)}
              title={isSolo ? `Cambiar a ${ROLE_META[role].label}` : ROLE_META[role].label}
              className={`px-2 py-0.5 rounded border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                active
                  ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/10 bg-white/5 hover:border-cyan-400/40 hover:text-white'
              } ${!isSolo ? 'cursor-default' : ''}`}
            >
              {ROLE_META[role].shortLabel}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-300 font-mono tabular-nums">
          {telemetry?.projectedSciencePoints ?? 0} / {mission?.targetSciencePoints ?? 0} pts
        </div>
        <button
          type="button"
          onClick={handleLaunch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          <Rocket className="h-4 w-4" aria-hidden="true" />
          Simular Lanzamiento
        </button>
      </div>
    </header>
    {confirmOpen && (
      <ConfirmDialog
        title="Alertas de diseño activas"
        description="El diseño conserva advertencias de margen. Puedes lanzar, pero el resultado puede verse afectado."
        confirmLabel="Lanzar con alertas"
        tone="warning"
        icon={AlertTriangle}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmLaunch}
      >
        <ul className="flex flex-col gap-2">
          {audit?.warnings.map((warning) => (
            <li
              key={warning.code}
              className="rounded border border-warning/30 bg-warning/5 px-gutter-sm py-gutter-xs font-body text-body-md text-on-surface-variant"
            >
              {warning.message}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    )}
    </>
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

  const btnBase = 'w-full flex items-center justify-between px-3 py-2.5 rounded border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400';

  return (
    <aside className="order-2 bg-[#0F1623] border-r border-white/10 flex flex-col overflow-visible p-3 gap-3 lg:order-1 lg:overflow-hidden">
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
  const [blueprintView, setBlueprintView] = useState(0);
  const selectedModules = useDesignStore(s => s.selectedModules);
  const mission = useDesignStore(s => s.mission);

  const views = ['VAB · Lanzamiento', 'Carga Útil · Satélite', 'ConOps · Órbita'];
  const prev = () => setBlueprintView((blueprintView + 2) % 3);
  const next = () => setBlueprintView((blueprintView + 1) % 3);

  const hasEST = selectedModules.some(m => m.category === 'EST');
  const hasSCI = selectedModules.some(m => m.category === 'SCI');
  const hasCOM = selectedModules.some(m => m.category === 'COM');

  const [resetKey, setResetKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);
  const resetView = () => setResetKey(key => key + 1);

  return (
    <section className="order-1 min-h-[520px] bg-[#090D16] flex flex-col overflow-hidden lg:order-2 lg:min-h-0">
      <div className="shrink-0 border-b border-white/10 bg-[#0F1623]/70 px-3 py-2.5">
        <div className="flex items-center gap-3">
          {briefOpen && (mission?.imageUrl ? (
            <img
              src={mission.imageUrl}
              alt={mission.title}
              className="h-14 w-24 shrink-0 rounded border border-white/10 object-cover bg-[#131A29]"
            />
          ) : (
            <div className="h-14 w-24 shrink-0 rounded border border-white/10 bg-gradient-to-b from-[#1C2538] to-[#131A29] flex items-center justify-center">
              <Rocket className="h-6 w-6 text-cyan-400/70" aria-hidden="true" />
            </div>
          ))}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">Misión</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">· {mission?.orbitType ?? 'LEO'}</span>
            </div>
            <h3 className="font-headline text-headline-md text-white truncate">{mission?.title ?? 'Misión sin designar'}</h3>
            {briefOpen && mission?.story && (
              <p className="font-body text-body-md text-slate-300 mt-0.5 line-clamp-2">{mission.story}</p>
            )}
            {briefOpen && mission?.objectives && mission.objectives.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {mission.objectives.map((objective, index) => (
                  <span key={`${objective}-${index}`} className="inline-flex items-center px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 font-mono text-mono-xs text-emerald-300">
                    {objective}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setBriefOpen(value => !value)}
            className="shrink-0 self-start rounded border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            aria-expanded={briefOpen}
            aria-label={briefOpen ? 'Ocultar briefing de misión' : 'Mostrar briefing de misión'}
            title={briefOpen ? 'Ocultar briefing' : 'Mostrar briefing'}
          >
            <ChevronUp className={`h-4 w-4 transition-transform duration-200 ${briefOpen ? '' : 'rotate-180'}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="Vista anterior">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded bg-black/40 text-slate-300 hover:text-white hover:bg-black/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="Vista siguiente">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-xs font-mono text-slate-400 bg-black/40 px-2 py-1 rounded">
          {views[blueprintView]}
        </div>
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button type="button" onClick={resetView} className="text-[10px] px-2 py-1 rounded bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="Restablecer vista">
            Reset
          </button>
          <button type="button" onClick={() => setFullscreen(true)} className="text-[10px] px-2 py-1 rounded bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="Pantalla completa">
            ⛶ Full
          </button>
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <BlueprintView
            view={blueprintView}
            hasEST={hasEST}
            hasSCI={hasSCI}
            hasCOM={hasCOM}
            resetKey={resetKey}
          />
        </div>

        {fullscreen && (
          <Modal
            title="Vista del diseño de misión"
            description={views[blueprintView]}
            onClose={() => setFullscreen(false)}
            size="xl"
            fill
            bodyClassName="flex min-h-0 flex-1 items-center justify-center p-gutter-md"
          >
            <BlueprintView
              view={blueprintView}
              hasEST={hasEST}
              hasSCI={hasSCI}
              hasCOM={hasCOM}
              resetKey={resetKey}
            />
          </Modal>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] text-slate-500 shrink-0 uppercase tracking-wider">Equipados</span>
        {selectedModules.length === 0 && <span className="text-xs text-slate-600">Ninguno</span>}
        {selectedModules.map(m => (
          <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/5 text-xs text-slate-200 shrink-0">
            {m.name}
            <button type="button" onClick={() => useDesignStore.getState().proposeModule(m.id, 'REMOVE')} className="text-slate-500 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400" aria-label={`Quitar ${m.name}`}>
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

// ---- Blueprint views ----
function BlueprintView({
  view,
  hasEST,
  hasSCI,
  hasCOM,
  resetKey,
}: {
  view: number;
  hasEST: boolean;
  hasSCI: boolean;
  hasCOM: boolean;
  resetKey: number;
}) {
  return (
    <Suspense fallback={<div className="h-[280px] w-[280px]" aria-hidden="true" />}>
      <DesignModel3D
        view={view}
        hasEST={hasEST}
        hasSCI={hasSCI}
        hasCOM={hasCOM}
        resetKey={resetKey}
      />
    </Suspense>
  );
}

// ---- Right Column ----
function RightColumn() {
  const telemetry = useDesignStore(s => s.telemetry);
  const audit = useDesignStore(s => s.audit);
  const mission = useDesignStore(s => s.mission);
  const difficulty = useDesignStore(s => s.difficulty);
  const gauges = telemetry && mission ? buildDesignGauges(telemetry, mission) : [];

  return (
    <aside className="order-3 bg-[#0F1623] border-l border-white/10 flex flex-col overflow-visible lg:overflow-hidden">
      <div className="shrink-0 border-b border-white/10 px-3 py-2">
        <h2 className="text-sm font-semibold text-white">Telemetría en vivo</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {gauges.length > 0 ? (
          gauges.map(gauge => (
            <MeterBar
              key={gauge.id}
              label={gauge.label}
              value={gauge.value}
              percent={gauge.percent}
              tone={gauge.tone}
              marks={gauge.marks}
              hint={difficulty === 'APPRENTICE' ? gauge.hint : undefined}
              mono={difficulty === 'ENGINEER'}
            />
          ))
        ) : (
          <EmptyState>Esperando la telemetría del diseño para calcular los márgenes.</EmptyState>
        )}

        <div className="mt-2">
          <h3 className="text-xs font-semibold text-slate-300 mb-1.5">Alertas de auditoría</h3>
          {!audit ? (
            <p className="text-xs text-slate-400">La auditoría todavía no está disponible.</p>
          ) : audit.warnings.length > 0 || audit.blocks.length > 0 ? (
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

    </aside>
  );
}

// ---- Main ----
export function DesignScreen() {
  const phase = useDesignStore(s => s.phase);
  const [modalView, setModalView] = useState<'EST' | 'SCI' | 'COM' | 'debate' | null>(null);

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
    <div className="min-h-[100dvh] flex flex-col bg-[#0B101B] text-slate-200 lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden">
      <TopBar />
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-visible lg:min-h-0 lg:grid-cols-[minmax(240px,28fr)_minmax(360px,44fr)_minmax(240px,28fr)] lg:gap-0 lg:overflow-hidden">
        <LeftColumn onOpen={setModalView} />
        <CenterColumn />
        <RightColumn />
      </div>
      {modalView && <ModuleCatalogModal view={modalView} onClose={() => setModalView(null)} />}
    </div>
  );
}

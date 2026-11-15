import { useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  GraduationCap,
  HardHat,
  Rocket,
  Satellite,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import type { DifficultyMode, GameMode, MissionConfig, RoleType } from '@shared/types';
import { cn } from '../../lib/cn';
import { ROLE_META, ROLE_ORDER } from '../../lib/roles';
import { ActionButton, Pill, SectionTitle } from './ConsolePrimitives';
import { MissionIllustration } from './MissionIllustration';

const DIFFICULTIES: Array<{
  id: DifficultyMode;
  label: string;
  description: string;
  details: string[];
  icon: typeof GraduationCap;
  accent: 'primary' | 'accent';
}> = [
  {
    id: 'APPRENTICE',
    label: 'Aprendiz',
    description: 'Asistencia orbital y márgenes amplios.',
    details: ['Alertas preventivas', 'Tutorial de vuelo', 'Margen amplio de error'],
    icon: GraduationCap,
    accent: 'primary',
  },
  {
    id: 'ENGINEER',
    label: 'Ingeniero',
    description: 'Telemetría manual y presupuesto ajustado.',
    details: ['Controles técnicos', 'Menos margen operativo', 'Mayor riesgo de anomalías'],
    icon: HardHat,
    accent: 'accent',
  },
];

const ORBIT_LABEL: Record<MissionConfig['orbitType'], string> = {
  LEO: 'Órbita baja terrestre',
  SSO: 'Órbita heliosíncrona',
  LUNAR: 'Órbita lunar',
  DEEP_SPACE: 'Espacio profundo',
};

const ROLE_TEASER: Record<RoleType, string> = {
  DIRECTOR: 'Equilibra masa, coste y objetivos científicos',
  PROPULSION: 'Protege estructura, combustible e integridad',
  SCIENCE: 'Calibra instrumentos y maximiza ciencia',
  COMMS: 'Asegura energía, datos y ventanas de enlace',
};

export interface MissionSetupPatch {
  playerName?: string;
  difficulty?: DifficultyMode;
  missionId?: string;
  role?: RoleType;
  gameMode?: GameMode;
}

interface MissionSetupTemplateProps {
  playerName: string;
  difficulty: DifficultyMode;
  role: RoleType;
  missions: MissionConfig[];
  gameMode?: GameMode;
  onChange: (patch: MissionSetupPatch) => void;
  onSubmit: () => void;
  onJoin: (roomId: string) => void;
  error?: string | null;
  busy?: boolean;
}

const STEPS = [
  { id: 'mode', label: 'Modo', shortLabel: 'Operación', description: 'Solo o en equipo' },
  { id: 'difficulty', label: 'Dificultad', shortLabel: 'Tipo', description: 'Aprendiz o ingeniero' },
  { id: 'role', label: 'Segmento', shortLabel: 'Rol', description: 'Tu área de mando' },
  { id: 'commander', label: 'Comandante', shortLabel: 'Nombre', description: 'Tu identificación' },
  { id: 'mission', label: 'Misión', shortLabel: 'Escenario', description: 'Elige el objetivo' },
  { id: 'confirm', label: 'Confirmación', shortLabel: 'Confirmar', description: 'Revisa tu plan' },
] as Array<{ id: string; label: string; shortLabel: string; description: string }>;

function MissionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-outline-variant bg-surface-container/70 px-gutter-sm py-gutter-xs">
      <dt className="font-body text-[10px] uppercase tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-mono-sm tabular-nums text-on-surface">{value}</dd>
    </div>
  );
}

export function MissionSetupTemplate({
  playerName,
  difficulty,
  role,
  missions,
  gameMode = 'SOLO',
  onChange,
  onSubmit,
  onJoin,
  error,
  busy = false,
}: MissionSetupTemplateProps) {
  const [step, setStep] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const mission = missions.find((item) => item.id === selectedMissionId);
  const story = mission?.story ?? mission?.realNasaReference.summary;
  const progress = (step / (STEPS.length - 1)) * 100;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== STEPS.length - 1 || !playerName.trim() || !mission) return;
    if (gameMode === 'TEAM' && joinCode.trim()) {
      onJoin(joinCode.trim());
      return;
    }
    onSubmit();
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 0));
  const goNext = () => setStep((current) => Math.min(current + 1, STEPS.length - 1));

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepShell
            key="mode"
            title="Elige cómo quieres operar"
            subtitle="Puedes resolver la misión por tu cuenta o cooperar con otros operadores."
          >
            <div className="grid gap-gutter-md sm:grid-cols-2" role="group" aria-label="Modo de juego">
              {[
                {
                  id: 'SOLO' as const,
                  title: '1 jugador',
                  subtitle: 'Asesores virtuales',
                  description: 'Cubre los cuatro segmentos con apoyo automático y decide a tu ritmo.',
                  icon: UserRound,
                  chip: 'Modo solitario',
                },
                {
                  id: 'TEAM' as const,
                  title: '1–4 jugadores',
                  subtitle: 'Cooperativo en tiempo real',
                  description: 'Cada operador protege un segmento. El host comparte el código de sala.',
                  icon: Users,
                  chip: 'Modo equipo',
                },
              ].map((item) => {
                const selected = gameMode === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ gameMode: item.id })}
                    className={cn(
                      'group relative flex min-h-44 flex-col gap-gutter-sm rounded-md border p-gutter-md text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      selected
                        ? 'border-primary bg-primary/10 shadow-glow'
                        : 'border-outline-variant bg-surface-container/60 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-container-high',
                    )}
                  >
                    <span className="absolute right-gutter-sm top-gutter-sm rounded-full border border-primary/30 bg-primary/10 p-1.5 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded border',
                        selected
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-outline-variant bg-surface-container-low text-on-surface-variant group-hover:text-primary',
                      )}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="font-label text-label-lg text-on-surface">{item.title}</span>
                    <span className="font-mono text-mono-xs uppercase tracking-wider text-primary">
                      {item.subtitle}
                    </span>
                    <span className="font-body text-body-md leading-snug text-on-surface-variant">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <StepFooter onNext={goNext} canGoBack={false} />
          </StepShell>
        );

      case 1:
        return (
          <StepShell
            key="difficulty"
            title="Define la experiencia"
            subtitle="Aprendiz guía cada decisión. Ingeniero exige lectura completa de telemetría."
          >
            <div className="grid gap-gutter-md sm:grid-cols-2" role="group" aria-label="Tipo de jugador">
              {DIFFICULTIES.map((item) => {
                const selected = difficulty === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ difficulty: item.id })}
                    className={cn(
                      'group flex flex-col gap-gutter-sm rounded-md border p-gutter-md text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      selected
                        ? 'border-accent/70 bg-accent/10 shadow-[0_0_28px_-14px_rgba(245,158,11,0.7)]'
                        : 'border-outline-variant bg-surface-container/60 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-container-high',
                    )}
                  >
                    <Icon className={cn('h-8 w-8', selected ? 'text-accent' : 'text-on-surface-variant group-hover:text-accent')} aria-hidden="true" />
                    <span className="font-title text-title-md text-on-surface">{item.label}</span>
                    <span className="font-body text-body-md leading-snug text-on-surface-variant">
                      {item.description}
                    </span>
                    <ul className="space-y-1 border-t border-outline-variant pt-gutter-sm">
                      {item.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-1.5 font-body text-[11px] text-on-surface-variant">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <StepFooter onBack={goBack} onNext={goNext} />
          </StepShell>
        );

      case 2:
        return (
          <StepShell
            key="role"
            title="Elige tu segmento"
            subtitle="Cada rol ve una parte distinta del problema. Ningún segmento puede salvar la misión solo."
          >
            <div className="grid gap-gutter-sm sm:grid-cols-2" role="group" aria-label="Selección de rol">
              {ROLE_ORDER.map((roleId) => {
                const meta = ROLE_META[roleId];
                const Icon = meta.icon;
                const selected = role === roleId;
                return (
                  <button
                    key={roleId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ role: roleId })}
                    className={cn(
                      'flex min-h-24 items-start gap-gutter-sm rounded border p-gutter-sm text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      selected
                        ? 'border-primary/60 bg-primary/10 shadow-[0_0_20px_-16px_rgba(56,189,248,0.95)]'
                        : 'border-outline-variant bg-surface-container/60 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-container-high',
                    )}
                  >
                    <div className={cn('rounded border p-2', selected ? 'border-primary/40 bg-primary/15 text-primary' : 'border-outline bg-surface-container-low text-on-surface-variant')}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="min-w-0">
                      <span className="block font-label text-label-lg text-on-surface">{meta.label}</span>
                      <span className="mt-1 block font-body text-[11px] leading-snug text-on-surface-variant">
                        {ROLE_TEASER[roleId]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <StepFooter onBack={goBack} onNext={goNext} />
          </StepShell>
        );

      case 3:
        return (
          <StepShell
            key="commander"
            title="¿Cómo te llamamos?"
            subtitle="Usaremos este nombre para identificarte en el diseño y en la sala de equipo."
          >
            <label htmlFor="commander-name" className="font-label text-label-lg text-on-surface">
              Nombre del comandante
            </label>
            <input
              id="commander-name"
              name="name"
              type="text"
              required
              maxLength={24}
              autoFocus
              value={playerName}
              onChange={(event) => onChange({ playerName: event.target.value })}
              placeholder="Ej. Comandante Vega"
              className="w-full rounded border border-outline bg-surface-container px-gutter-md py-gutter-sm font-body text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="rounded border border-primary/20 bg-primary/5 p-gutter-sm">
              <p className="font-label text-label-sm text-primary">Ya elegiste</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <SummaryPill>{gameMode === 'SOLO' ? '1 jugador' : '1–4 jugadores'}</SummaryPill>
                <SummaryPill>{difficulty === 'APPRENTICE' ? 'Aprendiz' : 'Ingeniero'}</SummaryPill>
                <SummaryPill>{ROLE_META[role].label}</SummaryPill>
              </div>
            </div>

            <StepFooter
              onBack={goBack}
              onNext={goNext}
              nextDisabled={!playerName.trim()}
              nextLabel="Elegir misión"
            />
          </StepShell>
        );

      case 4:
        return (
          <StepShell
            key="mission"
            title="Elige el objetivo de tu tripulación"
            subtitle="Compara los escenarios y revisa la historia y los objetivos antes de confirmar."
          >
            <div className="flex flex-col gap-gutter-sm" role="group" aria-label="Escenarios de misión">
              {missions.map((item) => {
                const selected = selectedMissionId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedMissionId(item.id);
                      onChange({ missionId: item.id });
                    }}
                    className={cn(
                      'flex items-start gap-gutter-sm rounded-md border p-gutter-sm text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-gutter-md',
                      selected
                        ? 'border-primary bg-primary/10 shadow-glow'
                        : 'border-outline-variant bg-surface-container/60 hover:border-primary/50 hover:bg-surface-container-high',
                    )}
                  >
                    <MissionThumbnail mission={item} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-label text-label-lg text-on-surface">{item.title}</span>
                        {selected && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                      </span>
                      <span className="mt-0.5 block font-mono text-mono-xs uppercase text-primary">
                        {ORBIT_LABEL[item.orbitType]}
                      </span>
                      <span className="mt-2 block font-body text-[12px] leading-relaxed text-on-surface-variant">
                        {item.story ?? item.realNasaReference.summary}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">
                          {item.targetSciencePoints} pts ciencia
                        </span>
                        <span className="rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">
                          {Math.round(item.requiredDownlinkRatio * 100)}% datos
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
              {missions.length === 0 && (
                <p className="rounded border border-outline-variant bg-surface-container p-gutter-md font-body text-body-md text-on-surface-variant">
                  No hay misiones disponibles en este momento.
                </p>
              )}
            </div>
            <StepFooter
              onBack={goBack}
              onNext={goNext}
              nextDisabled={!selectedMissionId}
              nextLabel="Revisar y confirmar"
            />
          </StepShell>
        );

      default:
        return (
          <StepShell
            key="confirm"
            title="Confirma tu plan de misión"
            subtitle="Comprueba tus elecciones. Al confirmar, entrarás al diseño de la nave."
          >
            <dl className="grid gap-gutter-sm sm:grid-cols-2">
              <MissionStat label="Comandante" value={playerName.trim() || 'Sin nombre'} />
              <MissionStat label="Modo" value={gameMode === 'SOLO' ? 'En solitario' : 'Equipo · 1–4 personas'} />
              <MissionStat
                label="Tipo de jugador"
                value={DIFFICULTIES.find((item) => item.id === difficulty)?.label ?? difficulty}
              />
              <MissionStat label="Segmento asignado" value={ROLE_META[role].label} />
            </dl>

            {mission && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-gutter-md">
                <div className="flex flex-wrap items-start justify-between gap-gutter-sm">
                  <div>
                    <p className="font-mono text-mono-xs uppercase tracking-wider text-primary">
                      Escenario seleccionado
                    </p>
                    <h3 className="mt-1 font-headline text-title-md text-on-surface">{mission.title}</h3>
                    <p className="mt-1 font-mono text-mono-xs text-on-surface-variant">
                      {ORBIT_LABEL[mission.orbitType]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={goBack}
                    className="font-label text-label-sm text-primary hover:underline"
                  >
                    Cambiar misión
                  </button>
                </div>
                {mission.objectives && mission.objectives.length > 0 && (
                  <ul className="mt-gutter-sm flex flex-col gap-1.5">
                    {mission.objectives.map((objective) => (
                      <li key={objective} className="flex items-start gap-2 font-body text-[12px] text-on-surface-variant">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                        {objective}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {gameMode === 'TEAM' && (
              <div className="flex flex-col gap-gutter-sm rounded border border-outline-variant bg-surface-container/70 p-gutter-sm">
                <label htmlFor="room-code" className="font-label text-label-sm text-on-surface">
                  ¿Te invitaron a una sala? Ingresa su código (opcional)
                </label>
                <input
                  id="room-code"
                  name="roomCode"
                  type="text"
                  value={joinCode}
                  maxLength={12}
                  autoComplete="off"
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="A1B2C3"
                  className="w-full rounded border border-outline bg-surface-container px-gutter-md py-gutter-xs font-mono text-mono-sm uppercase tracking-wider text-primary placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="font-body text-[11px] text-on-surface-variant">
                  {joinCode.trim()
                    ? 'Al unirte, la configuración de misión y dificultad será la de la persona anfitriona.'
                    : 'Al crear una sala, podrás invitar a tu tripulación antes de abrir el diseño.'}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded border border-error/40 bg-error/10 px-gutter-sm py-gutter-xs font-body text-body-md text-error">
                {error}
              </p>
            )}

            <p className="font-body text-[11px] leading-relaxed text-on-surface-variant">
              {gameMode === 'SOLO'
                ? 'Tu sesión individual abrirá el diseño de la nave al confirmar.'
                : 'La sala de equipo se abrirá primero para que la tripulación se reúna y asigne sus segmentos.'}
            </p>

            <div className="flex flex-col gap-gutter-sm sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 font-label text-label-lg text-on-surface-variant transition-colors hover:text-on-surface">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver
              </button>
              <ActionButton
                type="submit"
                icon={Rocket}
                disabled={
                  busy ||
                  !playerName.trim() ||
                  !mission ||
                  (gameMode === 'TEAM' && Boolean(joinCode.trim()) && joinCode.trim().length < 4)
                }
                className="w-full sm:w-auto"
              >
                {busy
                  ? 'Preparando misión…'
                  : gameMode === 'TEAM' && joinCode.trim()
                    ? 'Confirmar y unirme'
                    : gameMode === 'TEAM'
                      ? 'Confirmar y crear sala'
                      : 'Confirmar y abrir diseño'}
              </ActionButton>
            </div>
          </StepShell>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center overflow-y-auto p-gutter-md sm:p-gutter-lg">
      <section
        aria-labelledby="setup-title"
        className={cn(
          'grid w-full overflow-hidden rounded-md border border-outline-variant bg-surface-container-low shadow-console',
          step >= 4 ? 'max-w-6xl lg:grid-cols-[1.16fr_0.84fr]' : 'max-w-3xl',
        )}
      >
        <form
          className="console-grid flex min-h-[640px] flex-col gap-gutter-md p-gutter-md sm:p-gutter-lg"
          onSubmit={handleSubmit}
          noValidate
        >
          <header className="flex flex-wrap items-start justify-between gap-gutter-md">
            <div className="flex max-w-lg flex-col gap-gutter-xs">
              <span className="font-mono text-mono-sm text-primary">REGISTRO DE MISIÓN</span>
              <h1 id="setup-title" className="font-headline text-headline-lg text-on-surface text-balance">
                Prepara tu misión espacial
              </h1>
              <p className="font-body text-body-md text-on-surface-variant">
                Completa los cuatro pasos, elige un escenario y confirma tu plan antes de abrir el diseño.
              </p>
            </div>
            <Pill tone="primary" className="shrink-0">Paso {step + 1}/{STEPS.length}</Pill>
          </header>

          <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant" role="progressbar" aria-label="Progreso del registro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <div className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-secondary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <ol className="grid grid-cols-3 gap-1 sm:grid-cols-6" aria-label="Pasos del registro">
            {STEPS.map((item, index) => {
              const state = index < step ? 'complete' : index === step ? 'current' : 'pending';
              return (
                <li key={item.id}>
                  <div
                    aria-current={state === 'current' ? 'step' : undefined}
                    className={cn(
                      'flex w-full flex-col items-center gap-1 rounded border px-1 py-2 text-center transition-colors duration-200 sm:flex-row sm:px-2',
                      state === 'current' && 'border-primary/50 bg-primary/10 text-primary',
                      state === 'complete' && 'border-success/30 bg-success/5 text-success',
                      state === 'pending' && 'border-transparent text-on-surface-variant',
                    )}
                  >
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]', state === 'current' ? 'border-primary bg-primary text-on-primary' : state === 'complete' ? 'border-success bg-success text-on-success' : 'border-outline-variant')}>
                      {state === 'complete' ? '✓' : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-label text-[11px] leading-tight sm:text-label-sm">{item.label}</span>
                      <span className="hidden font-body text-[10px] text-on-surface-variant xl:block">{item.description}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-1 flex-col">{renderStep()}</div>
        </form>

        <aside
          className={cn(
            'flex-col gap-gutter-md border-t border-outline-variant bg-surface-container-low p-gutter-md sm:p-gutter-lg lg:border-l lg:border-t-0',
            step >= 4 ? 'flex' : 'hidden',
          )}
          aria-label="Briefing del escenario seleccionado"
        >
          <SectionTitle icon={Satellite} right={<Pill tone="muted">{missions.length} rutas</Pill>}>
            Briefing de misión
          </SectionTitle>
          {mission && (
            <article className="flex flex-col gap-gutter-sm">
              <MissionIllustration mission={mission} className="w-full" />
              {mission.imageCredit && (
                <p className="font-body text-[10px] text-on-surface-variant">
                  Imagen: {mission.imageCredit}
                </p>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="success" icon={ShieldCheck}>{ORBIT_LABEL[mission.orbitType]}</Pill>
                  <Pill tone="muted">Escenario didáctico</Pill>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                    ref. {mission.realNasaReference.missionName}
                  </span>
                </div>
                <h2 className="mt-2 font-headline text-headline-md text-on-surface">{mission.title}</h2>
                {story && <p className="mt-1 font-body text-body-md leading-snug text-on-surface-variant">{story}</p>}
              </div>
              <dl className="grid grid-cols-2 gap-gutter-xs">
                <MissionStat label="Presupuesto" value={`${mission.budgetMillions.toLocaleString('es-ES')} M$`} />
                <MissionStat label="Masa máx." value={`${mission.maxLauncherMassKg.toLocaleString('es-ES')} kg`} />
                <MissionStat label="Ciencia" value={`${mission.targetSciencePoints} pts`} />
                <MissionStat label="Bajada" value={`${Math.round(mission.requiredDownlinkRatio * 100)}%`} />
              </dl>
              {mission.objectives && mission.objectives.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {mission.objectives.map((objective) => (
                    <span key={objective} className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] text-success">
                      {objective}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto rounded border border-accent/25 bg-accent/5 p-gutter-sm">
                <p className="font-label text-label-sm text-accent">Lección de ingeniería</p>
                <p className="mt-1 font-body text-body-md leading-snug text-on-surface-variant">
                  {mission.realNasaReference.engineeringLesson}
                </p>
                <a href={mission.realNasaReference.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-label text-label-sm text-primary hover:underline">
                  Ver ficha oficial <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </article>
          )}
          {!mission && (
            <p className="rounded border border-dashed border-outline px-gutter-md py-gutter-lg text-center font-body text-body-md text-on-surface-variant">
              Elige una misión para ver aquí su historia, objetivos y requisitos.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-setup-enter flex flex-1 flex-col gap-gutter-md" aria-labelledby={`step-${title}`}>
      <div>
        <h2 id={`step-${title}`} className="font-headline text-headline-md text-on-surface">
          {title}
        </h2>
        <p className="mt-1 font-body text-body-md text-on-surface-variant">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function MissionThumbnail({ mission }: { mission: MissionConfig }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-outline-variant bg-surface-container sm:h-24 sm:w-32">
      {mission.imageUrl && !imageFailed ? (
        <img
          src={mission.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Satellite className="h-7 w-7 text-primary/70" aria-hidden="true" />
      )}
    </span>
  );
}

function StepFooter({
  onBack,
  onNext,
  canGoBack = true,
  nextDisabled = false,
  nextLabel = 'Continuar',
}: {
  onBack?: () => void;
  onNext: () => void;
  canGoBack?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-auto flex items-center justify-between gap-gutter-md border-t border-outline-variant pt-gutter-md">
      {canGoBack && onBack ? (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-label text-label-lg text-on-surface-variant transition-colors hover:text-on-surface">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="group inline-flex items-center gap-2 rounded border border-primary/50 bg-primary/15 px-gutter-md py-gutter-sm font-label text-label-lg text-primary transition-all hover:bg-primary hover:text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary/15 disabled:hover:text-primary"
      >
        {nextLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function SummaryPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-surface-container px-2 py-1 font-body text-[10px] text-on-surface">
      <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
      {children}
    </span>
  );
}

import type { DifficultyMode, MissionConfig, MissionReport } from '@shared/types';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  GraduationCap,
  HardHat,
  PlusCircle,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { OUTCOME_META, getMissionRank } from '../../lib/gameLabels';
import { cn } from '../../lib/cn';
import {
  ActionButton,
  ConsoleHeader,
  Panel,
  Pill,
  SectionTitle,
} from './ConsolePrimitives';

export interface OutcomeStat {
  label: string;
  value: string;
  note: string;
  tone?: 'primary' | 'success' | 'warning' | 'error';
}

interface MissionOutcomeTemplateProps {
  difficulty: DifficultyMode;
  mission: MissionConfig | null;
  report: MissionReport;
  stats: OutcomeStat[];
  onReplay: () => void;
  onNewMission: () => void;
  onHome: () => void;
}

const NOTE_TONE: Record<NonNullable<OutcomeStat['tone']>, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export function MissionOutcomeTemplate({
  difficulty,
  mission,
  report,
  stats,
  onReplay,
  onNewMission,
  onHome,
}: MissionOutcomeTemplateProps) {
  const outcome = OUTCOME_META[report.outcome];
  const isSuccess = report.outcome === 'SUCCESS';
  const rank = getMissionRank(report.score);
  const toneIcon =
    outcome.tone === 'success'
      ? 'border-success/40 bg-success/20 text-success'
      : outcome.tone === 'warning'
        ? 'border-warning/40 bg-warning/20 text-warning'
        : 'border-error/40 bg-error/20 text-error';

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <ConsoleHeader
        section="Resultados de la Misión"
        badge={
          difficulty === 'APPRENTICE'
            ? { label: 'Modo Aprendiz · Asistido', icon: GraduationCap, tone: 'primary' }
            : { label: 'Modo Ingeniero · Manual', icon: HardHat, tone: 'accent' }
        }
        status={
          isSuccess
            ? { label: 'Misión Completada', icon: BadgeCheck, tone: 'success' }
            : report.outcome === 'PARTIAL'
              ? { label: 'Misión Parcial', icon: AlertTriangle, tone: 'warning' }
              : { label: 'Misión Fallida', icon: AlertTriangle, tone: 'error' }
        }
        onHome={onHome}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-gutter-lg p-gutter-lg">
        <section className="flex flex-col items-center justify-between gap-gutter-lg rounded-md border border-primary/40 bg-surface-container-low p-gutter-xl shadow-console md:flex-row">
          <div className="flex flex-col items-center gap-gutter-lg md:flex-row">
            <div
              className={cn(
                'flex h-20 w-20 shrink-0 items-center justify-center rounded-md border',
                toneIcon,
              )}
            >
              {isSuccess ? (
                <Trophy className="h-10 w-10" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-10 w-10" aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-col gap-gutter-xs text-center md:text-left">
              <span className="font-mono text-mono-sm text-primary">
                {mission?.title?.toUpperCase() ?? 'MISIÓN'} · INFORME FINAL
              </span>
              <h1 className="font-headline text-display-lg-mobile text-on-surface text-balance md:text-display-lg">
                {outcome.title}
              </h1>
              <p className="max-w-xl font-body text-body-lg text-on-surface-variant">
                {outcome.summary}
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-md border border-outline bg-surface-container px-gutter-lg py-gutter-md text-center">
            <span className="block font-label text-label-sm text-on-surface-variant">
              Puntuación final
            </span>
            <span className="font-mono text-display-lg tabular-nums text-primary">
              {report.score}
            </span>
            <span
              className={cn(
                'block font-label text-label-sm',
                report.outcome === 'SUCCESS'
                  ? 'text-success'
                  : report.outcome === 'PARTIAL'
                    ? 'text-warning'
                    : 'text-error',
              )}
            >
              Rango {rank}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-gutter-md lg:grid-cols-4" aria-label="Estadísticas finales">
          {stats.map((stat) => (
            <Panel key={stat.label} className="flex flex-col gap-gutter-xs">
              <span className="font-body text-body-md text-on-surface-variant">
                {stat.label}
              </span>
              <span className="font-mono text-headline-md tabular-nums text-on-surface">
                {stat.value}
              </span>
              <span
                className={cn(
                  'font-label text-label-sm',
                  NOTE_TONE[stat.tone ?? 'primary'],
                )}
              >
                {stat.note}
              </span>
            </Panel>
          ))}
        </section>

        <Panel className="flex flex-col gap-gutter-md">
          <SectionTitle icon={CheckCircle2}>Objetivos y operaciones</SectionTitle>
          <div className="grid grid-cols-1 gap-gutter-md md:grid-cols-3">
            <div className="flex items-center justify-between gap-gutter-sm rounded border border-outline-variant bg-surface-container p-gutter-md">
              <div className="flex items-center gap-gutter-sm">
                <CheckCircle2
                  className={cn(
                    'h-4 w-4',
                    report.sciencePointsEarned >= (mission?.targetSciencePoints ?? 0)
                      ? 'text-success'
                      : 'text-warning',
                  )}
                  aria-hidden="true"
                />
                <span className="font-title text-title-md text-on-surface">
                  Objetivo científico
                </span>
              </div>
              <span className="font-mono text-mono-sm text-primary">
                {report.sciencePointsEarned} pts
              </span>
            </div>
            <div className="flex items-center justify-between gap-gutter-sm rounded border border-outline-variant bg-surface-container p-gutter-md">
              <div className="flex items-center gap-gutter-sm">
                <CheckCircle2
                  className={cn(
                    'h-4 w-4',
                    report.dataRecoveryRatio >= (mission?.requiredDownlinkRatio ?? 0)
                      ? 'text-success'
                      : 'text-warning',
                  )}
                  aria-hidden="true"
                />
                <span className="font-title text-title-md text-on-surface">
                  Enlace de datos
                </span>
              </div>
              <span className="font-mono text-mono-sm text-primary">
                {Math.round(report.dataRecoveryRatio * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-gutter-sm rounded border border-outline-variant bg-surface-container p-gutter-md">
              <div className="flex items-center gap-gutter-sm">
                <CheckCircle2
                  className={cn(
                    'h-4 w-4',
                    report.crisisResolved ? 'text-success' : 'text-error',
                  )}
                  aria-hidden="true"
                />
                <span className="font-title text-title-md text-on-surface">
                  Crisis en vuelo
                </span>
              </div>
              <span className="font-mono text-mono-sm text-primary">
                {report.crisisResolved ? 'Resuelta' : 'Abierta'}
              </span>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-gutter-lg lg:grid-cols-2">
          <Panel className="flex flex-col gap-gutter-md">
            <SectionTitle icon={AlertTriangle}>Auditoría de causa raíz</SectionTitle>
            <ul className="flex flex-col gap-gutter-sm">
              {report.rootCauses.map((cause) => (
                <li
                  key={cause.code}
                  className="rounded border border-outline-variant bg-surface-container p-gutter-sm"
                >
                  <p className="font-label text-label-lg text-on-surface">{cause.title}</p>
                  <p className="mt-1 font-body text-body-md text-on-surface-variant">
                    {cause.explanation}
                  </p>
                </li>
              ))}
            </ul>
            {report.recommendations.length > 0 && (
              <div className="rounded border border-warning/30 bg-warning/5 p-gutter-sm">
                <p className="mb-1 font-label text-label-sm text-warning">Recomendaciones</p>
                <ul className="list-inside list-disc space-y-1 font-body text-body-md text-on-surface-variant">
                  {report.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel className="flex flex-col gap-gutter-md">
            <SectionTitle icon={BadgeCheck}>Comparativa con NASA</SectionTitle>
            <div className="flex flex-col gap-gutter-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-title text-title-md text-on-surface">
                  {report.missionReference.missionName}
                </span>
                <a
                  href={report.missionReference.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-label text-label-sm text-primary hover:underline"
                >
                  Ficha oficial
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              <p className="font-body text-body-md text-on-surface-variant">
                {report.missionReference.summary}
              </p>
              <div className="rounded border border-primary/30 bg-primary/5 p-gutter-sm">
                <p className="font-label text-label-sm text-primary">Lección de ingeniería</p>
                <p className="mt-1 font-body text-body-md text-on-surface-variant">
                  {report.missionReference.engineeringLesson}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="muted">Duración simulada {Math.round(report.flightDurationSeconds)} s</Pill>
                <Pill tone="muted">Sala {report.roomId}</Pill>
                <Pill tone={isSuccess ? 'success' : 'warning'}>{rank}</Pill>
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-gutter-md">
          <ActionButton variant="secondary" icon={RotateCcw} onClick={onReplay}>
            Repetir misión
          </ActionButton>
          <ActionButton icon={PlusCircle} onClick={onNewMission}>
            Nueva misión
          </ActionButton>
        </div>
      </main>
    </div>
  );
}

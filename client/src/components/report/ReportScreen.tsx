import { useMemo } from 'react';
import type { MissionConfig, MissionReport } from '@shared/types';
import { useDesignStore } from '../../store/useDesignStore';
import { MissionOutcomeTemplate, type OutcomeStat } from '../templates/OutcomeTemplate';

function buildStats(report: MissionReport, mission: MissionConfig | null): OutcomeStat[] {
  const target = mission?.targetSciencePoints ?? 0;
  const downlinkTarget = mission?.requiredDownlinkRatio;
  const sciencePercent =
    target > 0 ? Math.round((report.sciencePointsEarned / target) * 100) : 0;
  const meetsDownlinkTarget =
    downlinkTarget !== undefined && report.dataRecoveryRatio >= downlinkTarget;

  return [
    {
      label: 'Ciencia obtenida',
      value: `${report.sciencePointsEarned} pts`,
      note:
        target > 0
          ? `${sciencePercent}% del objetivo (${target} pts)`
          : 'Sin objetivo científico definido',
      tone: sciencePercent >= 100 ? 'success' : sciencePercent >= 60 ? 'primary' : 'warning',
    },
    {
      label: 'Datos recuperados',
      value: `${Math.round(report.dataRecoveryRatio * 100)}%`,
      note: downlinkTarget === undefined
        ? 'Umbral de misión no disponible'
        : meetsDownlinkTarget
          ? `Cumple el mínimo requerido (${Math.round(downlinkTarget * 100)}%)`
          : `Por debajo del mínimo requerido (${Math.round(downlinkTarget * 100)}%)`,
      tone: downlinkTarget === undefined ? 'primary' : meetsDownlinkTarget ? 'success' : 'warning',
    },
    {
      label: 'Crisis en vuelo',
      value: report.crisisResolved ? 'Resuelta' : 'Abierta',
      note: report.crisisResolved
        ? 'El equipo estabilizó la nave'
        : 'La anomalía condicionó el resultado',
      tone: report.crisisResolved ? 'success' : 'error',
    },
    {
      label: 'Duración simulada',
      value: `${Math.round(report.flightDurationSeconds)} s`,
      note: mission?.title ?? 'Misión OrbitaLab',
      tone: 'primary',
    },
  ];
}

export function ReportScreen() {
  const report = useDesignStore((s) => s.report);
  const mission = useDesignStore((s) => s.mission);
  const difficulty = useDesignStore((s) => s.difficulty);
  const repeatMission = useDesignStore((s) => s.repeatMission);
  const leaveRoom = useDesignStore((s) => s.leaveRoom);
  const openHome = useDesignStore((s) => s.openHome);

  const stats = useMemo(
    () => (report ? buildStats(report, mission) : []),
    [report, mission],
  );

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-gutter-lg text-on-surface">
        <div className="flex max-w-md flex-col items-center gap-gutter-sm text-center">
          <p className="font-headline text-headline-md">Informe no disponible</p>
          <p className="font-body text-body-md text-on-surface-variant">
            La simulación no generó un informe. Vuelve al inicio y repite la misión.
          </p>
          <button
            type="button"
            onClick={openHome}
            className="rounded border border-outline bg-surface-container px-gutter-lg py-gutter-sm font-label text-label-lg text-on-surface hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <MissionOutcomeTemplate
      difficulty={difficulty}
      mission={mission}
      report={report}
      stats={stats}
      onReplay={repeatMission}
      onNewMission={leaveRoom}
      onHome={openHome}
    />
  );
}

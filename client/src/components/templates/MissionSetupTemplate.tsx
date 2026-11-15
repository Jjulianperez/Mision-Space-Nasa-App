import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  GraduationCap,
  HardHat,
  Rocket,
  Users,
} from 'lucide-react';
import type { DifficultyMode, MissionConfig, RoleType } from '@shared/types';
import { cn } from '../../lib/cn';
import { ROLE_META, ROLE_ORDER } from '../../lib/roles';
import { ActionButton } from './ConsolePrimitives';

const DIFFICULTIES: Array<{
  id: DifficultyMode;
  label: string;
  description: string;
  icon: typeof GraduationCap;
}> = [
  {
    id: 'APPRENTICE',
    label: 'Aprendiz',
    description: 'Asistencia orbital y márgenes amplios.',
    icon: GraduationCap,
  },
  {
    id: 'ENGINEER',
    label: 'Ingeniero',
    description: 'Telemetría manual y presupuesto ajustado.',
    icon: HardHat,
  },
];

const ORBIT_LABEL: Record<MissionConfig['orbitType'], string> = {
  LEO: 'Órbita baja terrestre',
  SSO: 'Órbita heliosíncrona',
  LUNAR: 'Órbita lunar',
  DEEP_SPACE: 'Espacio profundo',
};

export interface MissionSetupPatch {
  playerName?: string;
  difficulty?: DifficultyMode;
  missionId?: string;
  role?: RoleType;
}

interface MissionSetupTemplateProps {
  playerName: string;
  difficulty: DifficultyMode;
  missionId: string;
  role: RoleType;
  missions: MissionConfig[];
  onChange: (patch: MissionSetupPatch) => void;
  onSubmit: () => void;
  onJoin: (roomId: string) => void;
  error?: string | null;
  busy?: boolean;
}

export function MissionSetupTemplate({
  playerName,
  difficulty,
  missionId,
  role,
  missions,
  onChange,
  onSubmit,
  onJoin,
  error,
  busy = false,
}: MissionSetupTemplateProps) {
  const [joinCode, setJoinCode] = useState('');
  const mission = missions.find((item) => item.id === missionId) ?? missions[0];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <main className="flex flex-1 items-center justify-center p-gutter-lg">
      <section
        aria-labelledby="setup-title"
        className="flex w-full max-w-xl flex-col gap-gutter-lg rounded-md border border-outline-variant bg-surface-container-low p-gutter-xl shadow-console"
      >
        <div className="flex flex-col gap-gutter-xs">
          <span className="font-mono text-mono-sm text-primary">REGISTRO DE MISIÓN</span>
          <h1
            id="setup-title"
            className="font-headline text-headline-lg text-on-surface text-balance"
          >
            Configurar nueva misión
          </h1>
          <p className="font-body text-body-md text-on-surface-variant">
            Elige dificultad, escenario y segmento. Después podrás montar la nave en la mesa
            de diseño concurrente.
          </p>
        </div>

        <form className="flex flex-col gap-gutter-lg" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-gutter-sm">
            <span className="font-headline text-headline-md text-on-surface">
              Seleccione la dificultad
            </span>
            <div
              className="grid grid-cols-1 gap-gutter-md sm:grid-cols-2"
              role="radiogroup"
              aria-label="Selección de dificultad"
            >
              {DIFFICULTIES.map((item) => {
                const selected = difficulty === item.id;
                const Icon = selected ? CheckCircle2 : Circle;
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-difficulty={item.id.toLowerCase()}
                    aria-pressed={selected}
                    onClick={() => onChange({ difficulty: item.id })}
                    className={cn(
                      'relative flex flex-col items-center gap-gutter-sm rounded-md p-gutter-md text-center transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      selected
                        ? 'border-2 border-primary bg-surface-container-high'
                        : 'border border-outline bg-surface-container hover:border-primary hover:bg-surface-container-high',
                    )}
                  >
                    <Icon
                      className={cn(
                        'absolute right-gutter-sm top-gutter-sm h-4 w-4',
                        selected ? 'text-primary' : 'text-on-surface-variant opacity-40',
                      )}
                      aria-hidden="true"
                    />
                    <div
                      className={cn(
                        'flex aspect-square w-[72%] items-center justify-center rounded-md border',
                        selected
                          ? 'border-primary/40 bg-surface-container text-primary'
                          : 'border-outline bg-surface-container-low text-accent',
                      )}
                      aria-hidden="true"
                    >
                      <ItemIcon className="h-10 w-10" />
                    </div>
                    <span className="font-title text-title-md text-on-surface">
                      {item.label}
                    </span>
                    <span className="font-body text-body-md text-on-surface-variant">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-gutter-sm">
            <label
              htmlFor="mission-select"
              className="font-label text-label-lg text-on-surface"
            >
              Escenario de misión
            </label>
            <select
              id="mission-select"
              name="mission"
              value={missionId}
              onChange={(event) => onChange({ missionId: event.target.value })}
              className="w-full rounded border border-outline bg-surface-container px-gutter-md py-gutter-sm font-body text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {missions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.orbitType}
                </option>
              ))}
            </select>
            {mission && (
              <div className="flex flex-wrap gap-x-gutter-md gap-y-gutter-xs rounded border border-outline-variant bg-surface-container/60 px-gutter-sm py-gutter-xs font-mono text-mono-sm text-on-surface-variant">
                <span>{ORBIT_LABEL[mission.orbitType]}</span>
                <span>{mission.budgetMillions.toLocaleString('es-ES')} M$</span>
                <span>{mission.maxLauncherMassKg.toLocaleString('es-ES')} kg máx.</span>
                <span>{mission.targetSciencePoints} pts ciencia</span>
                <span>{Math.round(mission.requiredDownlinkRatio * 100)}% bajada</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-gutter-sm">
            <span className="font-label text-label-lg text-on-surface">Tu segmento</span>
            <div className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2" role="radiogroup" aria-label="Selección de rol">
              {ROLE_ORDER.map((roleId) => {
                const meta = ROLE_META[roleId];
                const selected = role === roleId;
                const Icon = meta.icon;
                return (
                  <button
                    key={roleId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ role: roleId })}
                    className={cn(
                      'flex items-start gap-gutter-sm rounded border p-gutter-sm text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline bg-surface-container text-on-surface hover:border-primary/60 hover:bg-surface-container-high',
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-label text-label-lg">{meta.label}</span>
                      <span className="font-body text-[11px] leading-tight text-on-surface-variant">
                        {meta.responsibility}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-gutter-sm">
            <label
              htmlFor="commander-name"
              className="font-label text-label-lg text-on-surface"
            >
              Nombre
            </label>
            <input
              id="commander-name"
              name="name"
              type="text"
              required
              maxLength={24}
              value={playerName}
              onChange={(event) => onChange({ playerName: event.target.value })}
              placeholder="Ej. Comandante Vega"
              className="w-full rounded border border-outline bg-surface-container px-gutter-md py-gutter-sm font-body text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded border border-error/40 bg-error/10 px-gutter-sm py-gutter-xs font-body text-body-md text-error" role="alert">
              {error}
            </p>
          )}

          <ActionButton type="submit" icon={Rocket} fullWidth disabled={busy}>
            {busy ? 'Preparando sala…' : 'Comenzar'}
          </ActionButton>

          <div className="flex items-center gap-gutter-sm" aria-hidden="true">
            <span className="h-px flex-1 bg-outline-variant" />
            <span className="font-body text-[11px] uppercase tracking-wider text-on-surface-variant">
              Sesión cooperativa
            </span>
            <span className="h-px flex-1 bg-outline-variant" />
          </div>

          <div className="flex flex-col gap-gutter-sm">
            <label
              htmlFor="room-code"
              className="flex items-center gap-2 font-label text-label-lg text-on-surface"
            >
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              Unirse a una sala existente
            </label>
            <div className="flex flex-col gap-gutter-sm sm:flex-row">
              <input
                id="room-code"
                name="roomCode"
                type="text"
                value={joinCode}
                maxLength={12}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Código de sala (ej. A1B2C3)"
                className="min-w-0 flex-1 rounded border border-outline bg-surface-container px-gutter-md py-gutter-sm font-mono text-mono-sm uppercase text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <ActionButton
                variant="secondary"
                onClick={() => onJoin(joinCode.trim())}
                disabled={joinCode.trim().length < 4}
              >
                Entrar
              </ActionButton>
            </div>
            <p className="font-body text-[11px] text-on-surface-variant">
              El host debe permanecer en la sala de espera hasta que todos elijan su segmento.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  GraduationCap,
  HardHat,
  Info,
  LogOut,
  Play,
  RadioTower,
  Satellite,
  ShieldAlert,
  Signal,
  SignalZero,
  UserRound,
  Users,
} from 'lucide-react';
import type { MissionConfig, RoleType } from '@shared/types';
import { MissionIllustration } from '../templates/MissionIllustration';
import { cn } from '../../lib/cn';
import { ROLE_META, ROLE_ORDER } from '../../lib/roles';
import { useDesignStore } from '../../store/useDesignStore';
import {
  ActionButton,
  ConsoleHeader,
  EmptyState,
  Panel,
  Pill,
  SectionTitle,
} from '../templates/ConsolePrimitives';
import { MissionSetupTemplate } from '../templates/MissionSetupTemplate';

const ORBIT_LABEL: Record<MissionConfig['orbitType'], string> = {
  LEO: 'Órbita baja terrestre',
  SSO: 'Órbita heliosíncrona',
  LUNAR: 'Órbita lunar',
  DEEP_SPACE: 'Espacio profundo',
};

function MissionBrief({ mission }: { mission: MissionConfig }) {
  const facts = [
    { label: 'Presupuesto', value: `${mission.budgetMillions.toLocaleString('es-ES')} M$` },
    { label: 'Masa máxima', value: `${mission.maxLauncherMassKg.toLocaleString('es-ES')} kg` },
    { label: 'Ciencia objetivo', value: `${mission.targetSciencePoints} pts` },
    {
      label: 'Bajada mínima',
      value: `${Math.round(mission.requiredDownlinkRatio * 100)}%`,
    },
  ];

  const story = mission.story ?? mission.realNasaReference.summary;
  const objectives = mission.objectives ?? [];

  return (
    <Panel className="flex flex-col gap-gutter-md">
      <MissionIllustration mission={mission} />
      <div className="flex flex-col gap-gutter-xs">
        <div className="flex flex-wrap items-center justify-between gap-gutter-sm">
          <SectionTitle icon={Satellite}>Brief de la misión</SectionTitle>
          <Pill tone="success">{ORBIT_LABEL[mission.orbitType]}</Pill>
        </div>
        <h3 className="font-headline text-headline-md text-on-surface">{mission.title}</h3>
        <p className="font-body text-body-md text-on-surface-variant">{story}</p>
      </div>
      {objectives.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {objectives.map((objective) => (
            <span
              key={objective}
              className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] text-success"
            >
              {objective}
            </span>
          ))}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-gutter-sm">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded border border-outline-variant bg-surface-container p-gutter-sm"
          >
            <dt className="font-body text-[11px] uppercase tracking-wider text-on-surface-variant">
              {fact.label}
            </dt>
            <dd className="font-mono text-mono-md tabular-nums text-on-surface">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded border border-primary/30 bg-primary/5 p-gutter-sm">
        <p className="font-label text-label-sm text-primary">Referencia NASA</p>
        <p className="mt-1 font-title text-title-md text-on-surface">
          {mission.realNasaReference.missionName}
        </p>
        <p className="mt-1 font-body text-body-md text-on-surface-variant">
          {mission.realNasaReference.engineeringLesson}
        </p>
        <a
          href={mission.realNasaReference.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-label text-label-sm text-primary hover:underline"
        >
          Ver ficha oficial
        </a>
      </div>
    </Panel>
  );
}

function CrewPanel({
  roles,
  players,
  myRole,
  canSwitchRoles,
  onSelectRole,
}: {
  roles: Array<{ role: RoleType; name: string | null }>;
  players: number;
  myRole: RoleType | null;
  canSwitchRoles: boolean;
  onSelectRole: (role: RoleType) => void;
}) {
  return (
    <Panel className="flex flex-col gap-gutter-md">
      <SectionTitle
        icon={Users}
        right={
          <Pill tone="muted">
            {players} {players === 1 ? 'operador' : 'operadores'}
          </Pill>
        }
      >
        Tripulación y segmentos
      </SectionTitle>

      <div className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2">
        {roles.map(({ role, name }) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          const isMe = myRole === role;
          const occupied = Boolean(name);
          return (
            <button
              key={role}
              type="button"
              aria-pressed={isMe}
              disabled={!canSwitchRoles || isMe}
              onClick={() => onSelectRole(role)}
              className={cn(
                'flex flex-col gap-gutter-xs rounded border p-gutter-sm text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                isMe
                  ? 'border-primary bg-primary/10'
                  : occupied
                    ? 'border-outline-variant bg-surface-container'
                    : 'border-dashed border-outline bg-surface-container/60 hover:border-primary/60',
                !canSwitchRoles && !isMe && 'cursor-default',
              )}
            >
              <span className="flex items-center gap-gutter-sm">
                <Icon
                  className={cn('h-4 w-4', isMe ? 'text-primary' : 'text-on-surface-variant')}
                  aria-hidden="true"
                />
                <span className="font-label text-label-lg text-on-surface">
                  {meta.shortLabel}
                </span>
                {isMe && <Pill tone="primary">Tú</Pill>}
              </span>
              <span className="font-body text-[11px] leading-tight text-on-surface-variant">
                {name ?? 'Segmento libre'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="flex items-start gap-2 font-body text-[11px] leading-relaxed text-on-surface-variant">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        {canSwitchRoles
          ? 'Sesión en solitario: puedes cambiar de segmento para cubrir todas las tareas de la misión.'
          : 'Cada operador elige un segmento. El host inicia el diseño cuando todos estén listos.'}
      </p>
    </Panel>
  );
}

export function LobbyScreen() {
  const hasRoom = useDesignStore((s) => s.hasRoom);
  const roomState = useDesignStore((s) => s.roomState);
  const missions = useDesignStore((s) => s.missions);
  const mission = useDesignStore((s) => s.mission);
  const localMode = useDesignStore((s) => s.localMode);
  const connected = useDesignStore((s) => s.connected);
  const myRole = useDesignStore((s) => s.myRole);
  const playerName = useDesignStore((s) => s.playerName);
  const difficulty = useDesignStore((s) => s.difficulty);
  const missionId = useDesignStore((s) => s.missionId);
  const desiredRole = useDesignStore((s) => s.desiredRole);
  const gameMode = useDesignStore((s) => s.gameMode);
  const startMission = useDesignStore((s) => s.startMission);
  const joinRoom = useDesignStore((s) => s.joinRoom);
  const leaveRoom = useDesignStore((s) => s.leaveRoom);
  const beginDesign = useDesignStore((s) => s.beginDesign);
  const selectRole = useDesignStore((s) => s.selectRole);
  const notify = useDesignStore((s) => s.notify);
  const openHome = useDesignStore((s) => s.openHome);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    playerName,
    difficulty,
    missionId,
    role: desiredRole,
    gameMode,
  });

  useEffect(() => {
    if (hasRoom) setBusy(false);
  }, [hasRoom]);

  const socketId = useDesignStore((s) => s.socket?.id);
  const isHost =
    !roomState ||
    localMode ||
    roomState.hostId === 'local' ||
    (socketId ? roomState.hostId === socketId : true);
  const everyoneReady =
    !!roomState && roomState.players.every((player) => player.role !== null && player.ready);
  const canSwitchRoles = !!roomState && roomState.players.length <= 1;
  const roles = useMemo(
    () =>
      ROLE_ORDER.map((role) => ({
        role,
        name:
          roomState?.players.find((player) => player.role === role)?.name ?? null,
      })),
    [roomState],
  );

  const handleSubmit = () => {
    const name = form.playerName.trim();
    if (!name) {
      setError('Escribe el nombre del comandante para registrar la misión.');
      return;
    }
    setError(null);
    setBusy(true);
    startMission({
      playerName: name,
      difficulty: form.difficulty,
      missionId: form.missionId,
      role: form.role,
      gameMode: form.gameMode,
    });
    window.setTimeout(() => setBusy(false), 6000);
  };

  const handleJoin = (roomId: string) => {
    if (roomId.length < 4) {
      setError('El código de sala debe tener al menos 4 caracteres.');
      return;
    }
    const name = form.playerName.trim();
    if (!name) {
      setError('Escribe tu nombre antes de unirte a una sala.');
      return;
    }
    setError(null);
    setBusy(true);
    joinRoom(roomId, name);
    window.setTimeout(() => setBusy(false), 4000);
  };

  const copyRoomCode = async () => {
    if (!roomState) return;
    try {
      await navigator.clipboard.writeText(roomState.roomId);
      notify('Código de sala copiado al portapapeles.', 'success');
    } catch {
      notify(`Código de sala: ${roomState.roomId}`, 'info');
    }
  };

  if (!hasRoom || !roomState) {
    return (
      <div className="flex min-h-screen flex-col bg-surface text-on-surface">
        <ConsoleHeader
          section="Registro de misión"
          badge={{ label: 'Nuevo despliegue', icon: Play, tone: 'primary' }}
          status={
            localMode
              ? { label: 'Modo local', icon: SignalZero, tone: 'warning' }
              : connected
                ? { label: 'Centro de control en línea', icon: Signal, tone: 'success' }
                : { label: 'Conectando…', icon: RadioTower, tone: 'warning' }
          }
          right={
            <ActionButton variant="ghost" icon={ArrowLeft} onClick={openHome}>
              Inicio
            </ActionButton>
          }
          onHome={openHome}
        />
        <MissionSetupTemplate
          playerName={form.playerName}
          difficulty={form.difficulty}
          missionId={form.missionId}
          role={form.role}
          gameMode={form.gameMode}
          missions={missions}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSubmit={handleSubmit}
          onJoin={handleJoin}
          error={error}
          busy={busy}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <ConsoleHeader
        section="Sala de espera"
        badge={
          roomState.difficulty === 'APPRENTICE'
            ? { label: 'Modo Aprendiz · Asistido', icon: GraduationCap, tone: 'primary' }
            : { label: 'Modo Ingeniero · Manual', icon: HardHat, tone: 'accent' }
        }
        status={
          localMode
            ? { label: 'Sesión local', icon: SignalZero, tone: 'warning' }
            : { label: 'Enlace estable', icon: Signal, tone: 'success' }
        }
        right={
          <ActionButton variant="ghost" icon={LogOut} onClick={() => leaveRoom()}>
            Salir
          </ActionButton>
        }
        onHome={openHome}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-gutter-lg p-gutter-lg">
        <section className="flex flex-col gap-gutter-sm rounded-md border border-outline-variant bg-surface-container-low p-gutter-lg">
          <span className="font-mono text-mono-sm text-primary">MISIÓN REGISTRADA</span>
          <h1 className="font-headline text-headline-lg text-on-surface text-balance">
            Tripulación en sala de espera
          </h1>
          <p className="max-w-3xl font-body text-body-md text-on-surface-variant">
            Comparte el código de sala con tu equipo. Cuando todos los segmentos estén
            asignados, el host abre la mesa de diseño concurrente. El lanzamiento se permite
            incluso con alertas de auditoría, pero los bloqueos duros deben resolverse.
          </p>
          {!localMode && roomState.players.length > 1 && (
            <p className="flex items-center gap-2 font-body text-[11px] text-on-surface-variant">
              <Clock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Esperando a que el resto de operadores seleccione su segmento…
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-gutter-lg lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-gutter-lg">
            <MissionBrief mission={mission ?? roomState.mission} />
            <CrewPanel
              roles={roles}
              players={roomState.players.length}
              myRole={myRole}
              canSwitchRoles={canSwitchRoles}
              onSelectRole={(role) => selectRole(role)}
            />
          </div>

          <div className="flex flex-col gap-gutter-lg">
            <Panel className="flex flex-col gap-gutter-md">
              <SectionTitle icon={RadioTower}>Código de sala</SectionTitle>
              <div className="flex items-center gap-gutter-sm">
                <code className="flex-1 rounded border border-primary/40 bg-primary/10 px-gutter-md py-gutter-sm text-center font-mono text-headline-md tracking-[0.25em] text-primary">
                  {roomState.roomId}
                </code>
                <ActionButton
                  variant="secondary"
                  icon={ClipboardCopy}
                  onClick={copyRoomCode}
                  aria-label="Copiar código de sala"
                >
                  Copiar
                </ActionButton>
              </div>
              <p className="font-body text-[11px] leading-relaxed text-on-surface-variant">
                {localMode
                  ? 'Modo local: la partida se juega en este navegador con los catálogos de /data.'
                  : 'Comparte este código para que otros operadores se unan desde su registro.'}
              </p>
            </Panel>

            <Panel className="flex flex-col gap-gutter-md">
              <SectionTitle icon={UserRound}>Operadores conectados</SectionTitle>
              <ul className="flex flex-col gap-gutter-sm">
                {roomState.players.map((player) => {
                  const meta = player.role ? ROLE_META[player.role] : null;
                  const Icon = meta?.icon ?? UserRound;
                  const host = player.id === roomState.hostId;
                  return (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-gutter-sm rounded border border-outline-variant bg-surface-container p-gutter-sm"
                    >
                      <span className="flex min-w-0 items-center gap-gutter-sm">
                        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate font-label text-label-lg text-on-surface">
                            {player.name}
                            {host && <span className="ml-2 text-[10px] text-accent">HOST</span>}
                          </span>
                          <span className="block font-body text-[11px] text-on-surface-variant">
                            {meta?.label ?? 'Segmento sin asignar'}
                          </span>
                        </span>
                      </span>
                      {player.role ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ul>
              {!everyoneReady && (
                <EmptyState>Faltan segmentos por asignar antes de abrir el diseño.</EmptyState>
              )}
            </Panel>

            <Panel className="flex flex-col gap-gutter-sm">
              {isHost ? (
                <ActionButton
                  icon={Play}
                  fullWidth
                  disabled={!everyoneReady}
                  onClick={beginDesign}
                >
                  Abrir mesa de diseño
                </ActionButton>
              ) : (
                <EmptyState>
                  Solo el host puede abrir la mesa. Mantén esta pestaña abierta.
                </EmptyState>
              )}
              <p className="text-center font-body text-[11px] text-on-surface-variant">
                {isHost
                  ? 'Al abrir la mesa empieza la selección de módulos y la votación.'
                  : 'El host iniciará el diseño cuando el equipo esté completo.'}
              </p>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

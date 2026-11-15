import { useEffect, useState } from 'react';
import {
  Antenna,
  BatteryCharging,
  Compass,
  Download,
  Flame,
  FlaskConical,
  Fuel,
  Radar,
  RadioTower,
  Satellite,
  ShieldAlert,
  Thermometer,
  ToggleLeft,
  ToggleRight,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import type { AsymmetricFlightPayload, ModuleItem, RoleType } from '@shared/types';
import { cn } from '../../lib/cn';
import { ACT_LABEL } from '../../lib/gameLabels';
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
import {
  FlightConsoleTemplate,
  type FlightStat,
  type MinigameId,
  type MinigameOption,
} from '../templates/FlightConsoleTemplate';

const GAMES: MinigameOption[] = [
  {
    id: 'esquivar',
    title: 'Estructura y propulsión',
    subtitle: 'Combustible, temperatura e integridad',
    icon: Flame,
  },
  {
    id: 'paneles',
    title: 'Energía y enlace',
    subtitle: 'Ventana de bajada y amenazas orbitales',
    icon: BatteryCharging,
  },
  {
    id: 'antena',
    title: 'Ciencia y calibración',
    subtitle: 'Sensores, muestras y datos',
    icon: Antenna,
  },
];

const ROLE_TO_GAME: Record<RoleType, MinigameId> = {
  PROPULSION: 'esquivar',
  COMMS: 'paneles',
  SCIENCE: 'antena',
  DIRECTOR: 'antena',
};

const GAME_TO_ROLE: Record<MinigameId, RoleType> = {
  esquivar: 'PROPULSION',
  paneles: 'COMMS',
  antena: 'SCIENCE',
};

const SEVERITY_TONE: Record<'LOW' | 'MEDIUM' | 'HIGH', 'success' | 'warning' | 'error'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
};

function PuzzleForm({
  prompt,
  onSubmit,
  disabled,
}: {
  prompt: string;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}) {
  const [answer, setAnswer] = useState('');

  return (
    <form
      className="flex w-full flex-col gap-gutter-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!answer.trim()) return;
        onSubmit(answer.trim());
        setAnswer('');
      }}
    >
      <p className="font-mono text-mono-sm text-accent">{prompt}</p>
      <div className="flex w-full flex-col gap-gutter-sm sm:flex-row">
        <input
          type="text"
          value={answer}
          onChange={(event) => setAnswer(event.target.value.toUpperCase())}
          placeholder="CÓDIGO DE RESPUESTA"
          aria-label="Respuesta del acertijo de crisis"
          className="min-w-0 flex-1 rounded border border-outline bg-surface-container px-gutter-sm py-gutter-xs text-center font-mono text-mono-md uppercase text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <ActionButton type="submit" variant="accent" disabled={disabled || !answer.trim()}>
          Ejecutar
        </ActionButton>
      </div>
    </form>
  );
}

function RoleConsole({
  flight,
  modules,
  onSolvePuzzle,
  onToggleSensor,
  onSacrifice,
}: {
  flight: AsymmetricFlightPayload;
  modules: ModuleItem[];
  onSolvePuzzle: (id: string, answer: string) => void;
  onToggleSensor: (moduleId: string, enabled: boolean) => void;
  onSacrifice: (moduleId: string) => void;
}) {
  if (flight.role === 'PROPULSION') {
    return (
      <div className="flex w-full flex-col items-center gap-gutter-md">
        <div className="flex items-center gap-2 font-label text-label-lg text-accent">
          <Flame className="h-4 w-4" aria-hidden="true" />
          Consola de propulsión
        </div>
        {flight.repairPuzzle ? (
          <PuzzleForm
            prompt={flight.repairPuzzle.prompt}
            onSubmit={(answer) => onSolvePuzzle(flight.repairPuzzle!.id, answer)}
          />
        ) : (
          <p className="font-body text-body-md text-on-surface-variant">
            {flight.act === 'CRISIS'
              ? 'No hay avería asignada a tu segmento en este acto. Vigila la telemetría.'
              : 'Empuje estable. Monitorea combustible, temperatura e integridad.'}
          </p>
        )}
        <div className="grid w-full grid-cols-2 gap-gutter-sm">
          {[
            { icon: Fuel, label: 'Combustible', value: `${flight.internal.fuelPercent.toFixed(0)}%` },
            {
              icon: Thermometer,
              label: 'Temperatura',
              value: `${flight.internal.temperatureC.toFixed(0)} °C`,
            },
            {
              icon: ShieldAlert,
              label: 'Integridad',
              value: `${flight.internal.integrityPercent.toFixed(0)}%`,
            },
            {
              icon: Zap,
              label: 'Balance',
              value: `${flight.internal.energyBalanceKw.toFixed(1)} kW`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-gutter-sm rounded border border-outline-variant bg-surface-container px-gutter-sm py-gutter-xs text-left"
            >
              <item.icon className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="font-body text-[10px] uppercase tracking-wider text-on-surface-variant">
                  {item.label}
                </span>
                <span className="font-mono text-mono-sm tabular-nums text-on-surface">
                  {item.value}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (flight.role === 'SCIENCE') {
    return (
      <div className="flex w-full flex-col gap-gutter-md">
        <div className="flex items-center gap-gutter-sm font-label text-label-lg text-primary">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          Consola científica
        </div>
        {flight.calibrationPuzzle && (
          <PuzzleForm
            prompt={flight.calibrationPuzzle.prompt}
            onSubmit={(answer) => onSolvePuzzle(flight.calibrationPuzzle!.id, answer)}
          />
        )}
        {flight.sensors.length === 0 ? (
          <EmptyState>No hay instrumentos científicos instalados en esta nave.</EmptyState>
        ) : (
          <ul className="flex w-full flex-col gap-gutter-sm">
            {flight.sensors.map((sensor) => (
              <li
                key={sensor.moduleId}
                className="flex items-center justify-between gap-gutter-sm rounded border border-outline-variant bg-surface-container px-gutter-sm py-gutter-xs text-left"
              >
                <span className="flex min-w-0 items-center gap-gutter-sm">
                  {sensor.active ? (
                    <ToggleRight className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-label text-label-sm text-on-surface">
                      {sensor.name}
                    </span>
                    <span className="block font-mono text-mono-xs text-on-surface-variant">
                      {sensor.dataGenMbps} Mbps
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onToggleSensor(sensor.moduleId, !sensor.active)}
                  className={cn(
                    'rounded border px-gutter-sm py-0.5 font-label text-label-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                    sensor.active
                      ? 'border-success/40 bg-success/15 text-success hover:bg-success/25'
                      : 'border-outline bg-surface-container-high text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {sensor.active ? 'Activo' : 'En espera'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (flight.role === 'COMMS') {
    return (
      <div className="flex w-full flex-col items-center gap-gutter-md">
        <div className="flex items-center gap-2 font-label text-label-lg text-success">
          <RadioTower className="h-4 w-4" aria-hidden="true" />
          Consola de comunicaciones
        </div>
        <div
          className={cn(
            'flex w-full flex-col items-center gap-gutter-xs rounded border px-gutter-md py-gutter-md',
            flight.downlinkWindowOpen
              ? 'border-success/40 bg-success/10'
              : 'border-warning/40 bg-warning/10',
          )}
        >
          <Download
            className={cn(
              'h-6 w-6',
              flight.downlinkWindowOpen ? 'text-success' : 'text-warning',
            )}
            aria-hidden="true"
          />
          <span className="font-headline text-headline-md text-on-surface">
            {flight.downlinkWindowOpen ? 'Ventana de bajada abierta' : 'Ventana cerrada'}
          </span>
          <span className="font-body text-body-md text-on-surface-variant">
            {flight.downlinkWindowOpen
              ? 'Aprovecha el contacto para descargar datos científicos.'
              : 'La estación terrestre volverá a estar visible en el próximo contacto.'}
          </span>
        </div>
        <div className="w-full rounded border border-outline-variant bg-surface-container p-gutter-sm text-left">
          <p className="mb-1 flex items-center gap-1.5 font-label text-label-sm text-on-surface-variant">
            <Radar className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Amenazas orbitales
          </p>
          {flight.threats.length === 0 ? (
            <p className="font-body text-body-md text-success">Sin amenazas activas.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {flight.threats.map((threat) => (
                <li key={threat.eventId} className="font-body text-body-md text-error">
                  {threat.title} · severidad {threat.severity}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const experiments = modules.filter(
    (module) =>
      module.category === 'SCI' && flight.activeExperimentIds.includes(module.id),
  );

  return (
    <div className="flex w-full flex-col gap-gutter-md">
      <div className="flex items-center gap-gutter-sm font-label text-label-lg text-primary">
        <Compass className="h-4 w-4" aria-hidden="true" />
        Decisiones del Director
      </div>
      <div className="w-full rounded border border-outline-variant bg-surface-container p-gutter-sm text-left">
        <p className="font-body text-body-md text-on-surface-variant">
          Puntos científicos proyectados
        </p>
        <p className="font-mono text-headline-md tabular-nums text-primary">
          {flight.science.projectedPoints} / {flight.science.targetPoints} pts
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, flight.science.progressPercent))}%` }}
          />
        </div>
      </div>
      {flight.crisisDecisionAvailable ? (
        <div className="flex w-full flex-col gap-gutter-sm rounded border border-error/40 bg-error/10 p-gutter-sm text-left">
          <p className="flex items-center gap-1.5 font-label text-label-sm text-error">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Decisión ejecutiva disponible
          </p>
          <p className="font-body text-[11px] leading-relaxed text-on-surface-variant">
            Puedes sacrificar un experimento para estabilizar la nave. Perderás sus puntos
            científicos, pero la crisis quedará resuelta.
          </p>
          {experiments.length === 0 ? (
            <p className="font-body text-body-md text-on-surface-variant">
              No quedan experimentos activos que sacrificar.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {experiments.map((experiment) => (
                <li key={experiment.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-label text-label-sm text-on-surface">
                    {experiment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSacrifice(experiment.id)}
                    className="shrink-0 rounded border border-error/50 bg-error/15 px-gutter-sm py-0.5 font-label text-label-sm text-error transition-colors hover:bg-error/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    Sacrificar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="font-body text-body-md text-on-surface-variant">
          Sin decisiones ejecutivas pendientes. Supervisa el objetivo científico del equipo.
        </p>
      )}
    </div>
  );
}

function buildStats(flight: AsymmetricFlightPayload, modules: ModuleItem[]): FlightStat[] {
  if (flight.role === 'PROPULSION') {
    const tempPercent = Math.min(100, (flight.internal.temperatureC / 120) * 100);
    return [
      {
        label: 'Combustible',
        value: `${flight.internal.fuelPercent.toFixed(0)}%`,
        percent: flight.internal.fuelPercent,
        tone: flight.internal.fuelPercent < 30 ? 'error' : 'accent',
        hint: 'Margen de propelente para maniobras.',
      },
      {
        label: 'Temperatura',
        value: `${flight.internal.temperatureC.toFixed(0)} °C`,
        percent: tempPercent,
        tone: tempPercent > 80 ? 'error' : tempPercent > 60 ? 'warning' : 'success',
        hint: 'Si sube demasiado, reduce la carga térmica.',
      },
      {
        label: 'Integridad',
        value: `${flight.internal.integrityPercent.toFixed(0)}%`,
        percent: flight.internal.integrityPercent,
        tone: flight.internal.integrityPercent < 70 ? 'warning' : 'success',
        hint: 'Resistencia estructural restante.',
      },
      {
        label: 'Balance energía',
        value: `${flight.internal.energyBalanceKw.toFixed(1)} kW`,
        percent: Math.min(100, Math.abs(flight.internal.energyBalanceKw) * 10),
        tone: flight.internal.energyBalanceKw < 0 ? 'error' : 'success',
        hint: 'Generación menos consumo eléctrico.',
      },
    ];
  }

  if (flight.role === 'SCIENCE') {
    const active = flight.sensors.filter((sensor) => sensor.active);
    const activeCount = active.length;
    const total = flight.sensors.length || 1;
    const dataRate = active.reduce((totalRate, sensor) => totalRate + sensor.dataGenMbps, 0);
    const sciencePoints = modules
      .filter(
        (module) =>
          module.category === 'SCI' &&
          active.some((sensor) => sensor.moduleId === module.id),
      )
      .reduce((sum, module) => sum + module.sciencePoints, 0);
    return [
      {
        label: 'Sensores activos',
        value: `${activeCount} / ${flight.sensors.length}`,
        percent: (activeCount / total) * 100,
        tone: activeCount === 0 ? 'warning' : 'primary',
        hint: 'Activa instrumentos para generar ciencia.',
      },
      {
        label: 'Tasa de datos',
        value: `${dataRate} Mbps`,
        percent: Math.min(100, dataRate * 2),
        tone: 'primary',
        hint: 'Datos generados por los sensores activos.',
      },
      {
        label: 'Ciencia a bordo',
        value: `${sciencePoints} pts`,
        percent: Math.min(100, sciencePoints),
        tone: sciencePoints > 0 ? 'success' : 'warning',
        hint: 'Puntos científicos en juego.',
      },
    ];
  }

  if (flight.role === 'COMMS') {
    return [
      {
        label: 'Ventana de bajada',
        value: flight.downlinkWindowOpen ? 'Abierta' : 'Cerrada',
        percent: flight.downlinkWindowOpen ? 100 : 15,
        tone: flight.downlinkWindowOpen ? 'success' : 'warning',
        hint: 'Contacto con la estación terrestre.',
      },
      {
        label: 'Amenazas orbitales',
        value: `${flight.threats.length}`,
        percent: Math.min(100, flight.threats.length * 34),
        tone: flight.threats.length === 0 ? 'success' : 'error',
        hint: 'Eventos que amenazan la misión.',
      },
      {
        label: 'Trayectoria',
        value: `${flight.trajectory.length} puntos`,
        percent: flight.progress,
        tone: 'primary',
        hint: 'Ruta didáctica de la órbita.',
      },
    ];
  }

  return [
    {
      label: 'Objetivo científico',
      value: `${flight.science.projectedPoints} / ${flight.science.targetPoints}`,
      percent: flight.science.progressPercent,
      tone: flight.science.progressPercent >= 100 ? 'success' : 'primary',
      hint: 'Puntos proyectados frente al objetivo.',
    },
    {
      label: 'Experimentos activos',
      value: `${flight.activeExperimentIds.length}`,
      percent: Math.min(100, flight.activeExperimentIds.length * 34),
      tone: 'primary',
      hint: 'Instrumentos que siguen aportando ciencia.',
    },
    {
      label: 'Decisión de crisis',
      value: flight.crisisDecisionAvailable ? 'Disponible' : 'Sin pendientes',
      percent: flight.crisisDecisionAvailable ? 100 : 25,
      tone: flight.crisisDecisionAvailable ? 'error' : 'success',
      hint: 'Puedes sacrificar un experimento para salvar la nave.',
    },
  ];
}

export function FlightScreen() {
  const flight = useDesignStore((s) => s.flight);
  const crisisAlert = useDesignStore((s) => s.crisisAlert);
  const mission = useDesignStore((s) => s.mission);
  const roomState = useDesignStore((s) => s.roomState);
  const difficulty = useDesignStore((s) => s.difficulty);
  const myRole = useDesignStore((s) => s.myRole);
  const localMode = useDesignStore((s) => s.localMode);
  const solvePuzzle = useDesignStore((s) => s.solvePuzzle);
  const toggleSensor = useDesignStore((s) => s.toggleSensor);
  const execDecision = useDesignStore((s) => s.execDecision);
  const selectRole = useDesignStore((s) => s.selectRole);
  const notify = useDesignStore((s) => s.notify);
  const leaveRoom = useDesignStore((s) => s.leaveRoom);
  const openHome = useDesignStore((s) => s.openHome);

  const [activeGame, setActiveGame] = useState<MinigameId>('esquivar');

  useEffect(() => {
    if (flight) setActiveGame(ROLE_TO_GAME[flight.role]);
  }, [flight?.role]);

  const isSolo = localMode || (roomState?.players.length ?? 1) <= 1;

  if (!flight) {
    return (
      <div className="flex min-h-screen flex-col bg-surface text-on-surface">
        <ConsoleHeader
          section="Seguimiento Orbital"
          badge={{
            label:
              difficulty === 'APPRENTICE'
                ? 'Modo Aprendiz · Asistido'
                : 'Modo Ingeniero · Manual',
            tone: difficulty === 'APPRENTICE' ? 'primary' : 'accent',
          }}
          status={{ label: 'Sincronizando telemetría', icon: Satellite, tone: 'warning' }}
          onHome={openHome}
        />
        <main className="flex flex-1 items-center justify-center p-gutter-lg">
          <Panel className="flex w-full max-w-md flex-col items-center gap-gutter-md text-center">
            <Satellite className="h-10 w-10 animate-pulse text-primary" aria-hidden="true" />
            <h1 className="font-headline text-headline-md text-on-surface">
              Estableciendo enlace de vuelo
            </h1>
            <p className="font-body text-body-md text-on-surface-variant">
              La nave está en la rampa. Recibirás la telemetría de tu segmento en cuanto el
              centro de control inicie la secuencia.
            </p>
            <div className="flex flex-wrap justify-center gap-gutter-sm">
              <ActionButton variant="secondary" onClick={() => leaveRoom()}>
                Abortar y salir
              </ActionButton>
            </div>
          </Panel>
        </main>
      </div>
    );
  }

  const modules = roomState?.selectedModules ?? [];
  const targetPoints = mission?.targetSciencePoints ?? 0;
  const projectedPoints =
    flight.role === 'DIRECTOR'
      ? flight.science.projectedPoints
      : roomState?.telemetry.projectedSciencePoints ?? 0;

  const handleGameSelect = (game: MinigameId) => {
    const role = GAME_TO_ROLE[game];
    if (role === flight.role) {
      setActiveGame(game);
      return;
    }
    if (!isSolo) {
      notify(
        'Esa estación pertenece a otro segmento. En cooperativo cada operador ve solo su consola.',
        'warning',
      );
      return;
    }
    setActiveGame(game);
    selectRole(role);
  };

  const handleSacrifice = (moduleId: string) => {
    const module = modules.find((item) => item.id === moduleId);
    if (
      !window.confirm(
        `¿Sacrificar ${module?.name ?? moduleId}? Perderás sus puntos científicos, pero la crisis quedará resuelta.`,
      )
    ) {
      return;
    }
    execDecision(moduleId);
  };

  const roleSwitcher = (
    <Panel className="flex flex-col gap-gutter-sm">
      <SectionTitle icon={Compass}>Tu segmento</SectionTitle>
      <div className="grid grid-cols-2 gap-gutter-sm">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          const active = flight.role === role;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={active}
              disabled={!isSolo || active}
              onClick={() => selectRole(role)}
              title={isSolo ? `Ver consola de ${meta.label}` : 'Disponible solo en solitario'}
              className={cn(
                'flex items-center gap-gutter-xs rounded border px-gutter-sm py-gutter-xs text-left font-label text-label-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                active
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-outline bg-surface-container text-on-surface-variant hover:border-primary/50 hover:text-on-surface',
                !isSolo && !active && 'cursor-not-allowed opacity-50',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{meta.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <p className="font-body text-[10px] leading-tight text-on-surface-variant">
        {isSolo
          ? 'Solitario: cambia de consola para resolver todas las tareas.'
          : 'Consola asignada a tu rol en esta partida cooperativa.'}
      </p>
    </Panel>
  );

  const crisisBanner = crisisAlert ? (
    <section
      role="alert"
      className={cn(
        'flex flex-wrap items-center justify-between gap-gutter-sm rounded-md border px-gutter-md py-gutter-sm',
        crisisAlert.severity === 'HIGH'
          ? 'border-error/50 bg-error/10'
          : 'border-warning/50 bg-warning/10',
      )}
    >
      <div className="flex min-w-0 items-center gap-gutter-sm">
        <TriangleAlert
          className={cn(
            'h-5 w-5 shrink-0',
            crisisAlert.severity === 'HIGH' ? 'text-error' : 'text-warning',
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-label text-label-lg text-on-surface">
            Crisis en vuelo: {crisisAlert.title}
          </p>
          <p className="truncate font-body text-[11px] text-on-surface-variant">
            {crisisAlert.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-gutter-sm">
        <Pill tone={SEVERITY_TONE[crisisAlert.severity]} solid>
          Severidad {crisisAlert.severity}
        </Pill>
        <Pill tone="muted">Acto {ACT_LABEL[flight.act]}</Pill>
      </div>
    </section>
  ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <FlightConsoleTemplate
        mode={difficulty}
        role={flight.role}
        orbitType={mission?.orbitType ?? 'LEO'}
        progress={flight.progress}
        actLabel={ACT_LABEL[flight.act]}
        orbitLabel={`${mission?.title ?? 'Misión'} · ${mission?.orbitType ?? 'LEO'}`}
        statusLabel={
          flight.act === 'CRISIS'
            ? 'Fase crítica · acción requerida'
            : flight.act === 'OPERATIONS'
              ? 'Operaciones científicas'
              : 'Ascenso nominal'
        }
        scoreLabel="Objetivo ciencia"
        scoreValue={`${projectedPoints} / ${targetPoints} pts`}
        games={GAMES}
        activeGame={activeGame}
        onSelectGame={handleGameSelect}
        hintLeft={
          isSolo
            ? `Consola de ${ROLE_META[flight.role].label} · ${myRole ?? flight.role}`
            : `Rol: ${ROLE_META[flight.role].label}`
        }
        hintRight={
          flight.role === 'COMMS'
            ? flight.downlinkWindowOpen
              ? 'Enlace abierto'
              : 'Enlace en espera'
            : flight.role === 'PROPULSION'
              ? 'Vigila la integridad'
              : flight.role === 'SCIENCE'
                ? 'Sensores en operación'
                : 'Decisiones del equipo'
        }
        stats={buildStats(flight, modules)}
        roleSwitcher={roleSwitcher}
        crisisBanner={crisisBanner}
        onExit={openHome}
      >
        <RoleConsole
          flight={flight}
          modules={modules}
          onSolvePuzzle={(id, answer) => solvePuzzle(id, answer)}
          onToggleSensor={(moduleId, enabled) => toggleSensor(moduleId, enabled)}
          onSacrifice={handleSacrifice}
        />
      </FlightConsoleTemplate>
    </div>
  );
}

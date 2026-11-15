import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { GraduationCap, HardHat, Satellite } from 'lucide-react';
import type { DifficultyMode, MissionConfig, RoleType } from '@shared/types';
import { cn } from '../../lib/cn';
import {
  ConsoleHeader,
  MeterBar,
  Panel,
  SectionTitle,
  type MeterTone,
} from './ConsolePrimitives';

export type MinigameId = 'esquivar' | 'paneles' | 'antena';

export interface MinigameOption {
  id: MinigameId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

export interface FlightStat {
  label: string;
  value: string;
  percent: number;
  tone?: MeterTone;
  hint?: string;
}

const STARS = [
  [18, 22, 0.8], [64, 48, 0.6], [104, 18, 0.9], [150, 62, 0.5], [196, 30, 0.8],
  [242, 14, 0.6], [292, 44, 0.9], [340, 20, 0.5], [388, 58, 0.8], [432, 26, 0.6],
  [482, 52, 0.9], [508, 92, 0.5], [30, 98, 0.6], [78, 128, 0.8], [128, 96, 0.5],
  [176, 136, 0.7], [224, 102, 0.6], [274, 128, 0.9], [326, 96, 0.5], [378, 134, 0.8],
  [428, 102, 0.6], [474, 138, 0.7], [14, 176, 0.8], [56, 210, 0.5], [98, 246, 0.7],
  [146, 208, 0.6], [196, 250, 0.8], [246, 214, 0.5], [298, 252, 0.7], [348, 210, 0.9],
  [400, 248, 0.6], [450, 216, 0.7], [496, 254, 0.5], [28, 280, 0.7], [82, 300, 0.5],
  [140, 288, 0.8], [204, 302, 0.6], [330, 298, 0.7], [392, 286, 0.5], [458, 306, 0.8],
] as const;

function OrbitView({
  progress,
  mode,
  role,
  orbitType,
}: {
  progress: number;
  mode: DifficultyMode;
  role: RoleType;
  orbitType: MissionConfig['orbitType'];
}) {
  const angle = Math.PI * 0.92 + (Math.max(0, Math.min(100, progress)) / 100) * Math.PI * 2;
  const [orbitRx, orbitRy] = {
    LEO: [192, 66],
    SSO: [192, 54],
    LUNAR: [210, 92],
    DEEP_SPACE: [226, 108],
  }[orbitType];
  const satelliteX = 260 + orbitRx * Math.cos(angle);
  const satelliteY = 168 + orbitRy * Math.sin(angle);
  const accent = mode === 'APPRENTICE' ? '#38bdf8' : '#f59e0b';
  const trail = mode === 'APPRENTICE' ? '#10b981' : '#f59e0b';
  const activityColor = {
    DIRECTOR: '#fbbf24',
    PROPULSION: '#fb923c',
    SCIENCE: '#22d3ee',
    COMMS: '#a78bfa',
  }[role];

  return (
    <svg
      viewBox="0 0 520 340"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="orbit-bg" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#101b2e" />
          <stop offset="60%" stopColor="#08101d" />
          <stop offset="100%" stopColor="#05080f" />
        </radialGradient>
        <radialGradient id="earth-fill" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#164e63" />
          <stop offset="55%" stopColor="#0c2a3d" />
          <stop offset="100%" stopColor="#071522" />
        </radialGradient>
        <radialGradient id="earth-glow" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trail-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={trail} stopOpacity="0" />
          <stop offset="100%" stopColor={activityColor ?? trail} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <rect width="520" height="340" fill="url(#orbit-bg)" />
      {STARS.map(([x, y, opacity], index) => (
        <circle key={index} cx={x} cy={y} r={index % 7 === 0 ? 1.4 : 0.9} fill="#e2e8f0" opacity={opacity} />
      ))}

      <circle cx="260" cy="168" r="118" fill="url(#earth-glow)" />
      <circle cx="260" cy="168" r="72" fill="url(#earth-fill)" stroke={accent} strokeOpacity="0.45" strokeWidth="1.2" />
      <ellipse cx="260" cy="168" rx="72" ry="20" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="0.8" />
      <ellipse cx="260" cy="168" rx="42" ry="72" fill="none" stroke={accent} strokeOpacity="0.12" strokeWidth="0.8" />
      <path d="M206 144 Q230 130 258 140 Q282 148 304 134" fill="none" stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1" />
      <path d="M198 184 Q226 172 252 184 Q280 198 314 182" fill="none" stroke="#22d3ee" strokeOpacity="0.22" strokeWidth="1" />

      <ellipse
        cx="260"
        cy="168"
        rx={orbitRx}
        ry={orbitRy}
        fill="none"
        stroke={accent}
        strokeOpacity="0.42"
        strokeWidth="1.2"
        strokeDasharray="7 5"
      />
      <ellipse
        cx="260"
        cy="168"
        rx={orbitRx}
        ry={orbitRy}
        fill="none"
        stroke="url(#trail-grad)"
        strokeWidth="2.4"
        strokeDasharray={`${Math.max(0, Math.min(100, progress)) * 8.2} 2000`}
        strokeLinecap="round"
        opacity="0.9"
      />

      {role === 'SCIENCE' && (
        <g>
          <path
            d={`M${satelliteX} ${satelliteY} L260 168`}
            stroke="#22d3ee"
            strokeWidth="2"
            strokeDasharray="5 4"
            className="flight-scan-beam"
          />
          <circle
            cx={260 + 46 * Math.cos(angle)}
            cy={168 + 46 * Math.sin(angle)}
            r="8"
            fill="#22d3ee"
            fillOpacity="0.12"
            stroke="#67e8f9"
            strokeWidth="1.5"
            className="flight-scan-footprint"
          />
          <circle
            cx={260 + 46 * Math.cos(angle)}
            cy={168 + 46 * Math.sin(angle)}
            r="3"
            fill="#67e8f9"
            opacity="0.9"
          />
        </g>
      )}

      {role === 'COMMS' && (
        <g>
          <path
            d={`M${satelliteX} ${satelliteY} Q${(satelliteX + 260) / 2 + 28} ${(satelliteY + 286) / 2} 260 273`}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            className="flight-radio-beam"
          />
          <circle cx="330" cy="228" r="3" fill="#c4b5fd" className="flight-data-packet" />
          <circle cx="292" cy="255" r="2.5" fill="#c4b5fd" className="flight-data-packet [animation-delay:0.5s]" />
        </g>
      )}

      {role === 'PROPULSION' && (
        <g transform={`translate(${satelliteX} ${satelliteY}) rotate(${(angle * 180) / Math.PI})`}>
          <path d="M-16 -2 L-40 -2" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
          <path d="M-16 3 L-31 3" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" className="flight-engine-flame" />
          <circle cx="0" cy="0" r="18" fill="none" stroke="#fb923c" strokeWidth="1" strokeDasharray="3 4" className="flight-route-marker" />
        </g>
      )}

      {role === 'DIRECTOR' && (
        <g>
          <circle cx="260" cy="168" r="88" fill="none" stroke="#fbbf24" strokeOpacity="0.25" strokeDasharray="2 7" />
          <g transform="translate(260 168)">
            <path d="M0 -88 L0 -78 M-5 -83 L5 -83" stroke="#fbbf24" strokeWidth="1.5" />
            <circle cy="-83" r="7" fill="none" stroke="#fbbf24" strokeWidth="1.2" className="flight-route-marker" />
          </g>
        </g>
      )}

      <g transform={`translate(${satelliteX} ${satelliteY}) rotate(${(angle * 180) / Math.PI})`}>
        <rect x="-13" y="-8" width="26" height="16" rx="3" fill="#0f172a" stroke={accent} strokeWidth="1.4" />
        <rect x="-34" y="-5" width="18" height="10" rx="1.5" fill="#0f172a" stroke={accent} strokeWidth="1" />
        <rect x="16" y="-5" width="18" height="10" rx="1.5" fill="#0f172a" stroke={accent} strokeWidth="1" />
        <line x1="-16" y1="0" x2="-13" y2="0" stroke={accent} strokeWidth="1" />
        <line x1="13" y1="0" x2="16" y2="0" stroke={accent} strokeWidth="1" />
        <circle cx="0" cy="0" r="2.2" fill={accent} />
      </g>

      <g transform="translate(260 286)">
        <rect x="-18" y="8" width="36" height="5" rx="1.5" fill="#10b981" opacity="0.85" />
        <line x1="0" y1="8" x2="0" y2="-8" stroke="#10b981" strokeWidth="1.4" />
        <path d="M-9 -12 Q0 -22 9 -12" fill="none" stroke="#10b981" strokeWidth="1.4" />
        <circle cx="0" cy="-13" r="2.2" fill="#10b981" />
        <text x="0" y="28" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="'Space Mono', monospace">
          ESTACIÓN TERRESTRE
        </text>
      </g>

      <text x="16" y="330" fill="#475569" fontSize="8" fontFamily="'Space Mono', monospace">
        TRAZA DIDÁCTICA · NO ES UNA TRAYECTORIA REAL DE NASA
      </text>
    </svg>
  );
}

interface FlightConsoleTemplateProps {
  mode: DifficultyMode;
  role: RoleType;
  orbitType: MissionConfig['orbitType'];
  progress: number;
  actLabel: string;
  orbitLabel: string;
  statusLabel: string;
  scoreLabel: string;
  scoreValue: string;
  games: MinigameOption[];
  activeGame: MinigameId;
  onSelectGame: (game: MinigameId) => void;
  hintLeft: string;
  hintRight: string;
  stats: FlightStat[];
  onExit?: () => void;
  roleSwitcher?: ReactNode;
  crisisBanner?: ReactNode;
  children: ReactNode;
}

export function FlightConsoleTemplate({
  mode,
  role,
  orbitType,
  progress,
  actLabel,
  orbitLabel,
  statusLabel,
  scoreLabel,
  scoreValue,
  games,
  activeGame,
  onSelectGame,
  hintLeft,
  hintRight,
  stats,
  onExit,
  roleSwitcher,
  crisisBanner,
  children,
}: FlightConsoleTemplateProps) {
  const isApprentice = mode === 'APPRENTICE';
  const modeBadge = isApprentice
    ? { label: 'Modo Aprendiz · Asistido', icon: GraduationCap, tone: 'primary' as const }
    : { label: 'Modo Ingeniero · Manual', icon: HardHat, tone: 'accent' as const };
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <ConsoleHeader
        section="Seguimiento Orbital"
        badge={modeBadge}
        status={
          isApprentice
            ? { label: 'En órbita · Asistencia activa', tone: 'success' }
            : { label: `ÓRBITA #04 · ${actLabel}`, tone: 'warning' }
        }
        right={
          <span className="font-mono text-mono-sm text-on-surface-variant">
            T+{Math.round(safeProgress)}%
          </span>
        }
        onHome={onExit}
      />

      <main className="flex flex-1 flex-col gap-gutter-lg p-gutter-lg">
        {crisisBanner}

        <div className="grid flex-1 grid-cols-1 gap-gutter-lg lg:grid-cols-12">
          <aside className="flex flex-col gap-gutter-md lg:col-span-3">
            <Panel className="flex flex-col gap-gutter-sm">
              <SectionTitle icon={Satellite}>Minijuegos orbitales</SectionTitle>
              {games.map((game, index) => {
                const active = activeGame === game.id;
                const Icon = game.icon;
                return (
                  <button
                    key={game.id}
                    type="button"
                    data-game={game.id}
                    aria-pressed={active}
                    onClick={() => onSelectGame(game.id)}
                    className={cn(
                      'flex w-full items-center gap-gutter-sm rounded-md p-gutter-md text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      active
                        ? 'border-2 border-primary bg-surface-container-high'
                        : 'border border-outline bg-surface-container hover:bg-surface-container-high',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6 shrink-0',
                        active ? 'text-primary' : 'text-on-surface-variant',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-title text-title-md text-on-surface">
                        {index + 1}. {game.title}
                      </span>
                      <span
                        className={cn(
                          'text-on-surface-variant',
                          isApprentice
                            ? 'font-body text-body-md'
                            : 'font-mono text-mono-sm',
                        )}
                      >
                        {game.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </Panel>

            {roleSwitcher}

            <Panel className="mt-auto hidden lg:block">
              <p className="font-body text-[11px] leading-relaxed text-on-surface-variant">
                {isApprentice
                  ? 'La asistencia orbital marca el siguiente paso y sugiere maniobras seguras. Aun así, las decisiones finales son del equipo.'
                  : 'Sin asistencia: interpreta la telemetría, ajusta los controles y documenta cada maniobra. El margen de error es menor.'}
              </p>
            </Panel>
          </aside>

          <section className="flex flex-col gap-gutter-md lg:col-span-6">
            <Panel className="flex flex-1 flex-col gap-gutter-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-headline text-headline-md text-on-surface">
                  {games.find((game) => game.id === activeGame)?.title ?? 'Consola de vuelo'}
                </h2>
                <span
                  className={cn(
                    isApprentice
                      ? 'font-label text-label-lg text-primary'
                      : 'font-mono text-mono-md text-accent tabular-nums',
                  )}
                >
                  {scoreLabel}: {scoreValue}
                </span>
              </div>

              <div className="relative flex min-h-[400px] flex-1 flex-col justify-between overflow-hidden rounded border border-outline-variant bg-surface p-gutter-md">
                <OrbitView progress={safeProgress} mode={mode} role={role} orbitType={orbitType} />

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={cn(
                      'rounded border border-outline-variant bg-surface-container-low/90 px-gutter-sm py-gutter-xs text-on-surface',
                      isApprentice ? 'font-body text-body-md' : 'font-mono text-mono-sm',
                    )}
                  >
                    {orbitLabel}
                  </span>
                  <span
                    className={cn(
                      'rounded border px-gutter-sm py-gutter-xs font-label text-label-sm',
                      isApprentice
                        ? 'border-success/40 bg-success/20 text-success'
                        : 'border-accent/40 bg-accent/20 text-accent',
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div
                  className={cn(
                    'relative z-10 mx-auto my-auto flex w-full max-w-md flex-col items-center gap-gutter-md rounded-md border bg-surface-container-low/80 p-gutter-lg text-center backdrop-blur-md',
                    isApprentice ? 'border-primary/50' : 'border-accent/50',
                  )}
                >
                  {children}
                </div>

                <div
                  className={cn(
                    'relative z-10 flex flex-wrap justify-between gap-2 rounded border border-outline-variant bg-surface-container-low/90 p-gutter-sm text-on-surface-variant',
                    isApprentice ? 'font-body text-body-md' : 'font-mono text-mono-sm',
                  )}
                >
                  <span>{hintLeft}</span>
                  <span className={isApprentice ? 'font-label text-primary' : 'text-accent'}>
                    {hintRight}
                  </span>
                </div>
              </div>

              <MeterBar
                label={`Acto ${actLabel}`}
                value={`${Math.round(safeProgress)}%`}
                percent={safeProgress}
                tone={isApprentice ? 'primary' : 'accent'}
                mono={!isApprentice}
              />
            </Panel>
          </section>

          <section className="flex flex-col gap-gutter-md lg:col-span-3">
            <Panel className="flex flex-col gap-gutter-md">
              <SectionTitle icon={Satellite}>{isApprentice ? 'Estadísticas' : 'Telemetría'}</SectionTitle>
              <div className="flex flex-col gap-gutter-sm">
                {stats.map((stat) => (
                  <MeterBar
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    percent={stat.percent}
                    tone={stat.tone}
                    hint={isApprentice ? stat.hint : undefined}
                    mono={!isApprentice}
                  />
                ))}
              </div>
            </Panel>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="mt-auto rounded border border-outline bg-surface-container px-gutter-md py-gutter-sm font-label text-label-sm text-on-surface-variant transition-colors hover:border-error/50 hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                Abortar y volver al inicio
              </button>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

import {
  ArrowRight,
  BadgeCheck,
  Compass,
  FlaskConical,
  GraduationCap,
  HardHat,
  Orbit,
  RadioTower,
  Rocket,
  Satellite,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Wrench,
} from 'lucide-react';
import { ROLE_META, ROLE_ORDER } from '../../lib/roles';
import { useDesignStore } from '../../store/useDesignStore';
import { ActionButton, Pill } from '../templates/ConsolePrimitives';

const FLOW = [
  {
    id: '01',
    title: 'Define la misión',
    body: 'Elige órbita, presupuesto y objetivo científico. Cada escenario cambia las restricciones.',
    icon: Target,
  },
  {
    id: '02',
    title: 'Diseña la nave',
    body: 'Monta módulos EST, SCI y COM sobre el plano y observa las seis barras de telemetría.',
    icon: Wrench,
  },
  {
    id: '03',
    title: 'Negocia en equipo',
    body: 'Propón, vota y asume los tradeoffs de masa, energía, datos y riesgo estructural.',
    icon: Users,
  },
  {
    id: '04',
    title: 'Vuela y audita',
    body: 'Resuelve crisis asimétricas en tres actos y recibe un informe comparado con NASA.',
    icon: BadgeCheck,
  },
];

const LEVELS = [
  {
    id: 'APPRENTICE',
    title: 'Modo Aprendiz',
    subtitle: 'Principiante / Juvenil',
    icon: GraduationCap,
    tone: 'primary' as const,
    points: [
      'Mini-tutorial y alertas guiadas',
      'Recomendaciones de margen en cada decisión',
      'Minijuegos orbitales asistidos',
    ],
  },
  {
    id: 'ENGINEER',
    title: 'Modo Ingeniero',
    subtitle: 'Intermedio',
    icon: HardHat,
    tone: 'accent' as const,
    points: [
      'Telemetría completa y controles manuales',
      'Presupuestos ajustados y menos margen',
      'Mayor probabilidad de anomalías en vuelo',
    ],
  },
];

function HeroOrbit() {
  return (
    <svg
      viewBox="0 0 520 420"
      className="home-orbit-illustration h-full w-full"
      role="img"
      aria-label="Esquema orbital de una misión con cuatro segmentos"
    >
      <defs>
        <radialGradient id="home-glow" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="home-earth" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#155e75" />
          <stop offset="60%" stopColor="#0c2a3d" />
          <stop offset="100%" stopColor="#071522" />
        </radialGradient>
      </defs>
      <circle cx="260" cy="215" r="190" fill="url(#home-glow)" />
      <ellipse cx="260" cy="215" rx="228" ry="92" fill="none" stroke="#38bdf8" strokeOpacity="0.28" strokeDasharray="8 6" />
      <ellipse cx="260" cy="215" rx="158" ry="64" fill="none" stroke="#818cf8" strokeOpacity="0.35" strokeDasharray="4 6" />
      <circle cx="260" cy="215" r="88" fill="url(#home-earth)" stroke="#38bdf8" strokeOpacity="0.55" strokeWidth="1.5" />
      <ellipse cx="260" cy="215" rx="88" ry="24" fill="none" stroke="#38bdf8" strokeOpacity="0.25" />
      <ellipse cx="260" cy="215" rx="50" ry="88" fill="none" stroke="#38bdf8" strokeOpacity="0.18" />
      <path d="M196 190 Q222 172 254 184 Q284 194 320 178" fill="none" stroke="#22d3ee" strokeOpacity="0.45" />
      <path d="M186 236 Q218 220 250 236 Q286 252 326 232" fill="none" stroke="#22d3ee" strokeOpacity="0.3" />

      <g transform="translate(466 142) rotate(24)">
        <rect x="-15" y="-9" width="30" height="18" rx="3" fill="#0b101b" stroke="#38bdf8" strokeWidth="1.6" />
        <rect x="-39" y="-6" width="20" height="12" rx="2" fill="#0b101b" stroke="#38bdf8" strokeWidth="1.1" />
        <rect x="19" y="-6" width="20" height="12" rx="2" fill="#0b101b" stroke="#38bdf8" strokeWidth="1.1" />
        <circle r="2.6" fill="#38bdf8" />
      </g>

      {[
        { x: 112, y: 118, icon: Compass, label: 'DIR', color: '#38bdf8' },
        { x: 402, y: 300, icon: Wrench, label: 'PRO', color: '#f59e0b' },
        { x: 132, y: 322, icon: FlaskConical, label: 'SCI', color: '#22d3ee' },
        { x: 414, y: 122, icon: RadioTower, label: 'COM', color: '#10b981' },
      ].map((node) => (
        <g key={node.label} transform={`translate(${node.x} ${node.y})`}>
          <line x1="0" y1="0" x2={(260 - node.x) * 0.58} y2={(215 - node.y) * 0.58} stroke={node.color} strokeOpacity="0.22" strokeDasharray="3 4" />
          <circle r="18" fill="#0b101b" stroke={node.color} strokeWidth="1.4" />
          <node.icon x="-8" y="-8" width="16" height="16" color={node.color} aria-hidden="true" />
          <text x="0" y="34" textAnchor="middle" fill={node.color} fontSize="9" fontFamily="'Space Mono', monospace">
            {node.label}
          </text>
        </g>
      ))}

      <g transform="translate(260 358)">
        <rect x="-22" y="6" width="44" height="6" rx="2" fill="#10b981" opacity="0.85" />
        <line x1="0" y1="6" x2="0" y2="-10" stroke="#10b981" strokeWidth="1.5" />
        <path d="M-12 -14 Q0 -26 12 -14" fill="none" stroke="#10b981" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function HomeScreen({ onStart }: { onStart: () => void }) {
  const missions = useDesignStore((state) => state.missions);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <header className="flex flex-wrap items-center justify-between gap-gutter-md border-b border-outline-variant bg-surface-container-low px-gutter-lg py-gutter-md">
        <div className="flex items-center gap-gutter-sm">
          <Satellite className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="font-headline text-title-md text-on-surface">OrbitaLab</span>
        </div>
        <div className="flex items-center">
          <img
            src="/space-apps-challenge.png"
            alt="NASA Space Apps Challenge"
            className="h-16 w-16 object-contain transition-transform duration-200 hover:scale-105 motion-reduce:transition-none"
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-section px-gutter-lg py-gutter-xl">
        <section className="grid grid-cols-1 items-center gap-gutter-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-gutter-lg">
            <div className="flex flex-wrap gap-2">
              <Pill
                icon={Orbit}
                tone="muted"
                className="!border-[#ff822f]/60 !bg-[#ff822f]/10 !text-[#ff822f]"
              >
                PACHA TEAM
              </Pill>
              <Pill icon={Users} tone="muted">
                1–4 jugadores
              </Pill>
            </div>
            <h1 className="font-headline text-display-lg-mobile text-on-surface text-balance md:text-display-lg">
              Diseña, Simula y Despega tu Misión Espacial en{' '}
              <span className="text-[#22D3EE] drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]">
                Tiempo Real.
              </span>
            </h1>
            <p className="max-w-xl font-body text-body-lg text-on-surface-variant">
              OrbitaLab convierte el ciclo de vida de una misión NASA en un juego de decisiones:
              blueprint modular, votación de recursos, vuelo asimétrico en tres actos y auditoría
              final comparada con misiones reales.
            </p>
            <div className="flex flex-wrap items-center gap-gutter-md">
              <ActionButton icon={Rocket} onClick={onStart} className="px-gutter-xl">
                Comenzar ahora
              </ActionButton>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded px-gutter-md py-gutter-sm font-label text-label-lg text-on-surface-variant transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                Ver cómo funciona
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <ActionButton
                variant="secondary"
                style={{ backgroundColor: '#323232' }}
                className="!border-transparent !text-white hover:!text-primary"
              >
                <a href="https://github.com/Jjulianperez/Mision-Space-Nasa-App" className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  Código fuente
                </a>
              </ActionButton>
            </div>
            <div className="grid grid-cols-2 gap-gutter-sm sm:grid-cols-4">
              {[
                { label: 'Segmentos', value: `${ROLE_ORDER.length} roles` },
                { label: 'Actos de vuelo', value: '3' },
                { label: 'Dificultades', value: '2' },
                { label: 'Misiones', value: `${missions.length}` },
              ].map((item) => (
                <div key={item.label} className="rounded border border-outline-variant bg-surface-container-low p-gutter-sm">
                  <p className="font-mono text-mono-md text-primary">{item.value}</p>
                  <p className="font-body text-[11px] uppercase tracking-wider text-on-surface-variant">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-md border border-outline-variant bg-surface-container-low console-grid shadow-console">
            <HeroOrbit />
          </div>
        </section>

        <section id="como-funciona" className="flex flex-col gap-gutter-lg">
          <div className="flex flex-col gap-gutter-xs">
            <span className="font-mono text-mono-sm text-primary">FLUJO DE MISIÓN</span>
            <h2 className="font-headline text-headline-lg text-on-surface">
              Del objetivo científico al informe de auditoría
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-gutter-md sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.id}
                  className="flex flex-col gap-gutter-sm rounded-md border border-outline-variant bg-surface-container-low p-gutter-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-mono-sm text-primary">{step.id}</span>
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-title text-title-md text-on-surface">{step.title}</h3>
                  <p className="font-body text-body-md text-on-surface-variant">{step.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="segmentos" className="flex flex-col gap-gutter-lg scroll-mt-8">
          <div className="flex flex-col gap-gutter-xs">
            <span className="font-mono text-mono-sm text-primary">LOS 4 SEGMENTOS NASA</span>
            <h2 className="font-headline text-headline-lg text-on-surface">
              Cada jugador protege un recurso distinto
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-gutter-md sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_ORDER.map((roleId) => {
              const meta = ROLE_META[roleId];
              const Icon = meta.icon;
              return (
                <article
                  key={roleId}
                  className="flex flex-col gap-gutter-sm rounded-md border border-outline-variant bg-surface-container-low p-gutter-md transition-colors hover:border-primary/50"
                >
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="font-title text-title-md text-on-surface">{meta.label}</h3>
                  <p className="font-body text-body-md text-on-surface-variant">
                    {meta.responsibility}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="dificultad" className="grid grid-cols-1 gap-gutter-lg scroll-mt-8 lg:grid-cols-2">
          {LEVELS.map((level) => {
            const Icon = level.icon;
            const isApprentice = level.id === 'APPRENTICE';
            return (
              <article
                key={level.id}
                className={`flex flex-col gap-gutter-md rounded-md border p-gutter-lg ${
                  isApprentice
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-accent/40 bg-accent/5'
                }`}
              >
                <div className="flex items-center gap-gutter-sm">
                  <Icon
                    className={`h-6 w-6 ${isApprentice ? 'text-primary' : 'text-accent'}`}
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-headline text-headline-md text-on-surface">{level.title}</h3>
                    <p className="font-mono text-mono-sm text-on-surface-variant">{level.subtitle}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-gutter-xs">
                  {level.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 font-body text-body-md text-on-surface-variant">
                      <ShieldCheck
                        className={`mt-0.5 h-4 w-4 shrink-0 ${isApprentice ? 'text-primary' : 'text-accent'}`}
                        aria-hidden="true"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="flex flex-col items-center gap-gutter-md rounded-md border border-primary/30 bg-primary/5 p-gutter-xl text-center">
          <Satellite className="h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="font-headline text-headline-lg text-on-surface text-balance">
            ¿Listo para liderar la próxima expedición espacial?
          </h2>
          <p className="max-w-2xl font-body text-body-lg text-on-surface-variant">
            Únete al puente de mando con tu equipo. Diseña tu lanzador, supera las auditorías técnicas del MDL y realiza tu primer despegue con éxito. Cada decisión cuenta: ¿podrás cumplir la misión?


          </p>
          <ActionButton icon={Rocket} onClick={onStart} className="px-gutter-xl">
            Configurar misión
          </ActionButton>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-low px-gutter-lg py-gutter-md">
        <p className="mx-auto max-w-6xl font-body text-[11px] leading-relaxed text-on-surface-variant">
          OrbitaLab · Pacha Team. Los costos, masas,
          potencias y trayectorias son valores didácticos de balance del juego; no son
          especificaciones ni efemérides oficiales de NASA.
        </p>
      </footer>
    </div>
  );
}

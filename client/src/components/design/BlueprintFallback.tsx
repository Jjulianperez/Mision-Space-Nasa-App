export interface BlueprintProps {
  /** 0: lanzador · 1: satélite · 2: órbita */
  view: number;
  hasEST: boolean;
  hasSCI: boolean;
  hasCOM: boolean;
}

export const BLUEPRINT_VIEW_NAMES = ['lanzador', 'satélite', 'satélite en órbita'];

const STROKE = '#38bdf8';
const MUTED = '#334155';
const AMBER = '#f59e0b';
const EMERALD = '#10b981';

function Launcher({ hasEST, hasSCI, hasCOM }: Omit<BlueprintProps, 'view'>) {
  return (
    <g fill="#0f172a" strokeWidth="1.5">
      <ellipse cx="160" cy="262" rx="74" ry="10" fill="none" stroke={STROKE} strokeOpacity="0.35" />
      <path d="M160 26 L176 62 L144 62 Z" stroke={STROKE} />
      <rect x="146" y="62" width="28" height="30" stroke={hasSCI ? STROKE : MUTED} />
      {hasCOM && (
        <>
          <rect x="112" y="72" width="30" height="8" stroke={EMERALD} />
          <rect x="178" y="72" width="30" height="8" stroke={EMERALD} />
        </>
      )}
      <rect x="144" y="92" width="32" height="46" stroke={AMBER} />
      <rect x="140" y="138" width="40" height="100" stroke={STROKE} />
      <path d="M148 238 L172 238 L180 258 L140 258 Z" stroke={AMBER} />
      {hasEST && (
        <>
          <rect x="118" y="150" width="18" height="88" stroke={AMBER} />
          <path d="M118 150 L127 132 L136 150 Z" stroke={AMBER} />
          <rect x="184" y="150" width="18" height="88" stroke={AMBER} />
          <path d="M184 150 L193 132 L202 150 Z" stroke={AMBER} />
        </>
      )}
    </g>
  );
}

function Satellite({ hasSCI, hasCOM }: Pick<BlueprintProps, 'hasSCI' | 'hasCOM'>) {
  const panel = hasCOM ? EMERALD : MUTED;
  return (
    <g fill="#0f172a" strokeWidth="1.5">
      <rect x="126" y="112" width="68" height="68" rx="4" stroke={STROKE} />
      <rect x="36" y="130" width="82" height="32" stroke={panel} />
      <rect x="202" y="130" width="82" height="32" stroke={panel} />
      <path d="M118 146 H126 M194 146 H202" stroke={panel} />
      <path d="M140 112 Q160 82 180 112" fill="none" stroke={panel} />
      <circle cx="160" cy="92" r="3" fill={panel} stroke="none" />
      <circle cx="160" cy="146" r="14" stroke={hasSCI ? STROKE : MUTED} />
      {hasSCI && <path d="M146 180 L128 236 H192 L174 180" fill="#38bdf8" fillOpacity="0.12" stroke={STROKE} strokeOpacity="0.5" />}
    </g>
  );
}

function Orbit({ hasSCI, hasCOM }: Pick<BlueprintProps, 'hasSCI' | 'hasCOM'>) {
  return (
    <g fill="none" strokeWidth="1.5">
      <circle cx="160" cy="150" r="62" fill="#0c2a3d" stroke={STROKE} strokeOpacity="0.6" />
      <ellipse cx="160" cy="150" rx="62" ry="18" stroke={STROKE} strokeOpacity="0.25" />
      <ellipse cx="160" cy="150" rx="26" ry="62" stroke={STROKE} strokeOpacity="0.2" />
      <ellipse cx="160" cy="150" rx="130" ry="46" transform="rotate(-18 160 150)" stroke={STROKE} strokeOpacity="0.55" strokeDasharray="6 5" />
      <g transform="translate(274 96)">
        <rect x="-9" y="-6" width="18" height="12" rx="2" fill="#0f172a" stroke={STROKE} />
        <rect x="-26" y="-4" width="14" height="8" fill="#0f172a" stroke={hasCOM ? EMERALD : MUTED} />
        <rect x="12" y="-4" width="14" height="8" fill="#0f172a" stroke={hasCOM ? EMERALD : MUTED} />
      </g>
      {hasSCI && <path d="M270 102 L212 132" stroke={STROKE} strokeOpacity="0.6" strokeDasharray="3 4" />}
      <circle cx="132" cy="118" r="4" fill={EMERALD} stroke="none" />
      {hasCOM && <path d="M134 116 L266 98" stroke={EMERALD} strokeOpacity="0.7" />}
    </g>
  );
}

/**
 * Plano esquemático 2D. Sustituye al modelo 3D cuando el navegador no puede crear
 * un contexto WebGL o cuando no se puede descargar el visor.
 */
export function BlueprintFallback({ view, hasEST, hasSCI, hasCOM }: BlueprintProps) {
  return (
    <svg
      viewBox="0 0 320 290"
      className="h-full max-h-[420px] w-full"
      role="img"
      aria-label={`Plano 2D del ${BLUEPRINT_VIEW_NAMES[view] ?? 'diseño de misión'}`}
    >
      {view === 0 ? (
        <Launcher hasEST={hasEST} hasSCI={hasSCI} hasCOM={hasCOM} />
      ) : view === 1 ? (
        <Satellite hasSCI={hasSCI} hasCOM={hasCOM} />
      ) : (
        <Orbit hasSCI={hasSCI} hasCOM={hasCOM} />
      )}
    </svg>
  );
}

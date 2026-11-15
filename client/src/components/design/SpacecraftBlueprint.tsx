import type { DemoModule } from '../../data/demoCatalog';
import type { DesignMetrics } from '../../lib/designCalculations';
import { formatNumber } from '../../lib/format';

const SHORT_CODES: Record<string, string> = {
  'SCI-IR': 'IR',
  'SCI-SAR': 'SAR',
  'SCI-UV': 'UV',
  'SCI-LIDAR': 'LIDAR',
  'SCI-MAG': 'MAG',
  'COM-X': 'X',
  'COM-KA': 'KA',
  'COM-SBAND': 'S',
};

function SolarArray({ x, active }: { x: number; active: boolean }) {
  const stroke = active ? '#38BDF8' : '#334155';
  const fill = active ? 'rgba(56,189,248,0.09)' : 'rgba(28,37,56,0.35)';

  return (
    <g>
      <rect
        x={x}
        y={132}
        width={183}
        height={74}
        rx={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={active ? 1.2 : 1}
        strokeDasharray={active ? undefined : '4 5'}
      />
      {[x + 36, x + 72, x + 108, x + 144].map((cellX) => (
        <line
          key={cellX}
          x1={cellX}
          y1={134}
          x2={cellX}
          y2={204}
          stroke={stroke}
          strokeWidth={0.6}
          opacity={active ? 0.65 : 0.35}
        />
      ))}
      <line
        x1={x + 2}
        y1={169}
        x2={x + 181}
        y2={169}
        stroke={stroke}
        strokeWidth={0.6}
        opacity={active ? 0.65 : 0.35}
      />
      <line
        x1={x + 2}
        y1={188}
        x2={x + 181}
        y2={188}
        stroke={stroke}
        strokeWidth={0.6}
        opacity={active ? 0.65 : 0.35}
      />
    </g>
  );
}

export function SpacecraftBlueprint({
  modules,
  metrics,
}: {
  modules: DemoModule[];
  metrics: DesignMetrics;
}) {
  const scienceModules = modules.filter((module) => module.category === 'SCI');
  const solarModule = modules.find((module) => module.id === 'COM-SOLAR');
  const antennas = modules.filter((module) => module.dataDownlinkMbps > 0);
  const battery = modules.some((module) => module.id === 'EST-BATT');
  const propulsion = modules.some((module) => module.id === 'EST-PROP');
  const thermal = modules.some((module) => module.id === 'EST-THERM');

  const antennaCodes = antennas
    .map((module) => SHORT_CODES[module.id] ?? module.id)
    .join(' + ');
  const antennaCapacity = antennas.reduce((sum, module) => sum + module.dataDownlinkMbps, 0);
  const payloadCodes = scienceModules.map((module) => SHORT_CODES[module.id] ?? module.id).join(' + ');
  const scienceScore = `${formatNumber(metrics.projectedSciencePoints)} / ${formatNumber(
    metrics.targetSciencePoints,
  )}`;

  return (
    <div className="relative overflow-hidden border-y border-outline-variant bg-surface blueprint-grid">
      <div
        className="blueprint-scan pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-primary/10 to-transparent"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l border-t border-primary/50" aria-hidden="true" />
      <div className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r border-t border-primary/50" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b border-l border-primary/50" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b border-r border-primary/50" aria-hidden="true" />

      <svg
        viewBox="0 0 800 340"
        className="h-auto w-full"
        role="img"
        aria-label={`Esquema de la nave Aura-CL1. Órbita ${metrics.orbit.name}, lanzador ${metrics.launcher.name}. ${scienceModules.length} instrumentos científicos, ${antennas.length} antenas de descarga.`}
        style={{ fontFamily: '"Space Mono", monospace' }}
      >
        <defs>
          <linearGradient id="bus-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1C2538" />
            <stop offset="100%" stopColor="#101827" />
          </linearGradient>
          <radialGradient id="dish-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
          <pattern id="micro-grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#334155" strokeWidth="0.35" opacity="0.35" />
          </pattern>
        </defs>

        <ellipse
          cx="400"
          cy="170"
          rx="355"
          ry="122"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="0.7"
          strokeDasharray="3 8"
          opacity="0.16"
        />
        <ellipse
          cx="400"
          cy="170"
          rx="262"
          ry="92"
          fill="none"
          stroke="#818CF8"
          strokeWidth="0.6"
          strokeDasharray="2 7"
          opacity="0.1"
        />

        <g fill="#94A3B8" fontSize="8" letterSpacing="1.2">
          <text x="22" y="26" fill="#38BDF8">
            AURA-CL1 / CONFIGURACIÓN ACTIVA
          </text>
          <text x="22" y="41" fill="#64748B" fontSize="7">
            BLUEPRINT MDL · REV 04
          </text>
          <text x="778" y="26" textAnchor="end" fill="#94A3B8">
            {metrics.orbit.shortName}
          </text>
          <text x="778" y="41" textAnchor="end" fill="#64748B" fontSize="7">
            LANZADOR {metrics.launcher.name.toUpperCase()}
          </text>
        </g>

        <g stroke="#475569" strokeWidth="0.7" opacity="0.7">
          <line x1="340" y1="70" x2="460" y2="70" />
          <line x1="340" y1="66" x2="340" y2="74" />
          <line x1="460" y1="66" x2="460" y2="74" />
          <text x="400" y="62" textAnchor="middle" fill="#64748B" fontSize="6.5" stroke="none">
            1,2 m
          </text>
        </g>

        <SolarArray x={125} active={Boolean(solarModule)} />
        <SolarArray x={492} active={Boolean(solarModule)} />

        <g stroke={solarModule ? '#38BDF8' : '#334155'} strokeWidth="1" opacity={solarModule ? 0.9 : 0.5}>
          <line x1="308" y1="169" x2="340" y2="169" />
          <line x1="460" y1="169" x2="492" y2="169" />
        </g>

        <g fill={solarModule ? '#38BDF8' : '#64748B'} fontSize="7" letterSpacing="0.8">
          <text x="125" y="123">
            {solarModule ? `SAW · +${formatNumber(solarModule.generationKw ?? 0, 2)} kW` : 'SAW · OFF'}
          </text>
          <text x="675" y="123" textAnchor="end">
            {solarModule ? 'GaAs · DESPLEGADO' : 'SIN PANELES'}
          </text>
        </g>

        <g>
          <rect x="340" y="100" width="120" height="155" rx="9" fill="url(#bus-body)" stroke="#38BDF8" strokeWidth="1.3" />
          <rect x="346" y="106" width="108" height="143" rx="6" fill="url(#micro-grid)" opacity="0.8" />
          <rect x="350" y="111" width="100" height="36" rx="3" fill="#0B101B" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 4" />

          {Array.from({ length: 5 }, (_, index) => {
            const module = scienceModules[index];
            const x = 355 + index * 19;
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={119}
                  width={15}
                  height={19}
                  rx={2}
                  fill={module ? 'rgba(129,140,248,0.22)' : 'rgba(11,16,27,0.5)'}
                  stroke={module ? '#818CF8' : '#334155'}
                  strokeWidth={module ? 1 : 0.7}
                  strokeDasharray={module ? undefined : '2 3'}
                />
                {module ? (
                  <text
                    x={x + 7.5}
                    y={131}
                    textAnchor="middle"
                    fill="#C7D2FE"
                    fontSize="4.6"
                    stroke="none"
                  >
                    {SHORT_CODES[module.id] ?? ''}
                  </text>
                ) : null}
              </g>
            );
          })}

          <rect x="350" y="158" width="100" height="48" rx="3" fill="#111A2B" stroke="#334155" strokeWidth="0.8" />
          <line x1="350" y1="182" x2="450" y2="182" stroke="#334155" strokeWidth="0.5" opacity="0.7" />
          <text x="400" y="173" textAnchor="middle" fill="#F1F5F9" fontSize="10" letterSpacing="1.4">
            AURA-CL1
          </text>
          <text x="400" y="193" textAnchor="middle" fill="#64748B" fontSize="5.8" letterSpacing="0.9">
            BUS MDL-04 · {formatNumber(metrics.totalMassKg)} kg
          </text>

          <rect
            x="352"
            y="216"
            width="34"
            height="20"
            rx="2"
            fill={battery ? 'rgba(16,185,129,0.16)' : 'rgba(11,16,27,0.45)'}
            stroke={battery ? '#10B981' : '#334155'}
            strokeWidth={battery ? 1 : 0.7}
            strokeDasharray={battery ? undefined : '2 3'}
          />
          <text x="369" y="229" textAnchor="middle" fill={battery ? '#6EE7B7' : '#64748B'} fontSize="5.2">
            {battery ? 'BATT' : 'PWR'}
          </text>

          <rect x="394" y="219" width="50" height="17" rx="2" fill="#0F172A" stroke="#334155" strokeWidth="0.6" />
          <text x="419" y="230" textAnchor="middle" fill="#64748B" fontSize="4.8">
            AVIONICS
          </text>

          {thermal ? (
            <>
              <rect x="331" y="145" width="5" height="48" rx="1.5" fill="rgba(16,185,129,0.14)" stroke="#10B981" strokeWidth="0.8" />
              <rect x="464" y="145" width="5" height="48" rx="1.5" fill="rgba(16,185,129,0.14)" stroke="#10B981" strokeWidth="0.8" />
              <text x="323" y="173" textAnchor="end" fill="#10B981" fontSize="5.8">
                THERMAL
              </text>
            </>
          ) : null}
        </g>

        <g fill="#94A3B8" fontSize="6.4" letterSpacing="0.7">
          <text x="472" y="106" fill={scienceModules.length ? '#A5B4FC' : '#64748B'}>
            {scienceModules.length ? `P/L · ${payloadCodes}` : 'P/L · VACÍO'}
          </text>
          <text x="472" y="116" fill="#64748B" fontSize="5.4">
            {scienceModules.length} / 3 ranuras científicas
          </text>
        </g>

        <g>
          <line x1="398" y1="255" x2="398" y2="268" stroke="#64748B" strokeWidth="1" />
          <path
            d="M 386 268 L 410 268 L 404 278 L 392 278 Z"
            fill={propulsion ? 'rgba(245,158,11,0.16)' : '#111A2B'}
            stroke={propulsion ? '#F59E0B' : '#475569'}
            strokeWidth="0.9"
          />
          {propulsion ? (
            <g stroke="#F59E0B" strokeWidth="1" opacity="0.65">
              <line x1="394" y1="279" x2="392" y2="289" />
              <line x1="399" y1="279" x2="399" y2="292" />
              <line x1="404" y1="279" x2="406" y2="289" />
            </g>
          ) : null}
          <text x="378" y="266" textAnchor="end" fill={propulsion ? '#F59E0B' : '#64748B'} fontSize="5.6">
            {propulsion ? 'PROP · ION' : 'PROP · CHEM'}
          </text>
        </g>

        <g>
          <circle cx="466" cy="276" r="24" fill="url(#dish-glow)" />
          <line x1="460" y1="255" x2="468" y2="266" stroke={antennas.length ? '#38BDF8' : '#475569'} strokeWidth="1" />
          <path
            d="M 442 284 Q 466 262 490 284"
            fill="none"
            stroke={antennas.length ? '#38BDF8' : '#475569'}
            strokeWidth={antennas.length ? 1.4 : 0.9}
            strokeDasharray={antennas.length ? undefined : '3 4'}
          />
          <line
            x1="466"
            y1="276"
            x2="466"
            y2="284"
            stroke={antennas.length ? '#38BDF8' : '#475569'}
            strokeWidth="0.8"
          />
          {antennas.length ? (
            <g fill="none" stroke="#38BDF8" strokeWidth="0.8" opacity="0.6">
              <path d="M 493 274 q 7 8 0 16" />
              <path d="M 499 269 q 12 13 0 26" />
            </g>
          ) : null}
          <text x="506" y="279" fill={antennas.length ? '#38BDF8' : '#64748B'} fontSize="6">
            {antennas.length ? `ENLACE · ${antennaCodes}` : 'ENLACE · OFF'}
          </text>
          <text x="506" y="289" fill="#64748B" fontSize="5.2">
            {antennas.length ? `${formatNumber(antennaCapacity)} Mbps de descarga` : 'Sin antena de descarga'}
          </text>
        </g>

        <g fill="#64748B" fontSize="5.8" letterSpacing="0.5">
          <text x="22" y="329">
            ● ACTIVO · {modules.length} MÓDULOS
          </text>
          <text x="778" y="329" textAnchor="end">
            CIENCIA {scienceScore} · ENERGÍA {formatNumber(metrics.powerConsumedKw, 2)} / {formatNumber(metrics.powerGeneratedKw, 2)} kW
          </text>
        </g>
      </svg>
    </div>
  );
}

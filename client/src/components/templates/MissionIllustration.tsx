import { useState } from 'react';
import { Rocket } from 'lucide-react';
import type { MissionConfig } from '@shared/types';
import { cn } from '../../lib/cn';

export function MissionIllustration({
  mission,
  className,
}: {
  mission: MissionConfig;
  className?: string;
}) {
  const isLunar = mission.orbitType === 'LUNAR';
  const isDeepSpace = mission.orbitType === 'DEEP_SPACE';
  const [imageFailed, setImageFailed] = useState(false);
  const label = isLunar ? 'Objetivo lunar' : isDeepSpace ? 'Espacio profundo' : 'Órbita baja terrestre';

  return (
    <div
      className={cn(
        'relative h-44 overflow-hidden rounded-md border border-primary/20 bg-surface',
        className,
      )}
      role="img"
      aria-label={`Imagen de referencia relacionada con ${mission.title}`}
    >
      {mission.imageUrl && !imageFailed ? (
        <>
          <img
            src={mission.imageUrl}
            alt=""
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface/95 via-surface/30 to-surface/10" />
        </>
      ) : (
        <svg
          viewBox="0 0 320 180"
          className="absolute inset-0 h-full w-full"
          role="presentation"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="mission-stars" cx="50%" cy="38%" r="70%">
              <stop offset="0%" stopColor="#172348" />
              <stop offset="100%" stopColor="#050914" />
            </radialGradient>
            <radialGradient id="mission-earth" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="45%" stopColor="#0369A1" />
              <stop offset="100%" stopColor="#0C1E3A" />
            </radialGradient>
            <radialGradient id="mission-moon" cx="36%" cy="34%" r="68%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="58%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#1E293B" />
            </radialGradient>
            <radialGradient id="mission-dawn" cx="34%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="48%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#1C0A00" />
            </radialGradient>
            <linearGradient id="mission-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>

          <rect width="320" height="180" fill="url(#mission-stars)" />
          <g fill="#E0F2FE" opacity="0.9">
            <circle cx="27" cy="32" r="1.1" />
            <circle cx="63" cy="18" r="0.8" />
            <circle cx="91" cy="49" r="1.4" />
            <circle cx="123" cy="22" r="0.8" />
            <circle cx="143" cy="67" r="1.2" />
            <circle cx="179" cy="25" r="1.5" />
            <circle cx="213" cy="46" r="0.8" />
            <circle cx="242" cy="21" r="1.2" />
            <circle cx="281" cy="58" r="1" />
          </g>

          {isLunar ? (
            <>
              <ellipse cx="135" cy="88" rx="145" ry="40" transform="rotate(-8 135 88)" fill="none" stroke="url(#mission-line)" strokeWidth="1.5" opacity="0.75" />
              <circle cx="132" cy="104" r="54" fill="url(#mission-moon)" />
              <circle cx="108" cy="89" r="7" fill="#475569" opacity="0.75" />
              <circle cx="152" cy="108" r="10" fill="#475569" opacity="0.65" />
              <circle cx="128" cy="136" r="6" fill="#475569" opacity="0.8" />
              <circle cx="50" cy="53" r="4" fill="#F59E0B" />
            </>
          ) : isDeepSpace ? (
            <>
              <ellipse cx="155" cy="86" rx="134" ry="34" transform="rotate(-12 155 86)" fill="none" stroke="url(#mission-line)" strokeWidth="1.6" opacity="0.8" />
              <circle cx="155" cy="94" r="42" fill="url(#mission-dawn)" />
              <ellipse cx="155" cy="94" rx="67" ry="16" transform="rotate(-16 155 94)" fill="none" stroke="#FDE68A" strokeWidth="2" opacity="0.5" />
              <path d="M155 94 L254 32" stroke="#F59E0B" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.7" />
              <path d="M238 23l15 11-6-14 12-8" fill="none" stroke="#38BDF8" strokeWidth="1.3" strokeLinejoin="round" opacity="0.9" />
            </>
          ) : (
            <>
              <ellipse cx="127" cy="88" rx="148" ry="44" transform="rotate(-8 127 88)" fill="none" stroke="url(#mission-line)" strokeWidth="1.6" opacity="0.75" />
              <circle cx="131" cy="103" r="55" fill="url(#mission-earth)" />
              <path d="M94 100c13-16 31-20 57-10 14 5 26-1 38-13-6 20-19 32-42 37-25 6-42-1-53-14Z" fill="#10B981" opacity="0.55" />
              <ellipse cx="126" cy="51" rx="49" ry="13" transform="rotate(-8 126 51)" fill="none" stroke="#7DD3FC" strokeWidth="1.3" opacity="0.8" />
              <circle cx="51" cy="47" r="4" fill="#F59E0B" />
            </>
          )}
        </svg>
      )}

      <div className="absolute bottom-3 left-4 right-4">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
          <Rocket className="h-3 w-3" aria-hidden="true" />
          {label}
        </div>
        <p className="mt-1 font-headline text-title-md text-on-surface">
          {mission.realNasaReference.missionName}
        </p>
      </div>
    </div>
  );
}

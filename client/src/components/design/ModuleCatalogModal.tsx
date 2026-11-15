import { useEffect, useState } from 'react';
import { CheckCircle2, Handshake, Minus, Plus, ThumbsDown, ThumbsUp, Timer } from 'lucide-react';
import type { ActiveVote, ModuleCategory, ModuleItem } from '@shared/types';
import { cn } from '../../lib/cn';
import { formatKg, formatKw, formatMbps, formatMillions, formatSigned } from '../../lib/format';
import {
  MAX_SCIENCE_BAY_SLOTS,
  countScienceBaySlots,
  getProposalBlocker,
} from '../../lib/localEngine';
import { ROLE_META } from '../../lib/roles';
import { useDesignStore } from '../../store/useDesignStore';
import { Modal } from '../shared/Modal';
import { ActionButton, EmptyState, Pill } from '../templates/ConsolePrimitives';
import { CATEGORY_META } from './designGauges';

export type CatalogView = ModuleCategory | 'debate';

/** Duración de una votación en el servidor; solo se usa para estimar el tiempo restante. */
const VOTE_WINDOW_MS = 30_000;

interface ModuleSpec {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}

function getModuleSpecs(module: ModuleItem): ModuleSpec[] {
  const specs: ModuleSpec[] = [
    { label: 'Coste', value: formatMillions(module.costMillions) },
    { label: 'Masa', value: formatKg(module.massKg) },
  ];
  if (module.powerKw > 0) specs.push({ label: 'Consume', value: formatKw(module.powerKw) });
  if (module.powerKw < 0) {
    specs.push({ label: 'Genera', value: formatKw(-module.powerKw), tone: 'good' });
  }
  if (module.dataGenMbps > 0) {
    specs.push({ label: 'Datos', value: formatMbps(module.dataGenMbps) });
  }
  if (module.dataDownlinkMbps > 0) {
    specs.push({ label: 'Bajada', value: formatMbps(module.dataDownlinkMbps), tone: 'good' });
  }
  if (module.sciencePoints > 0) {
    specs.push({ label: 'Ciencia', value: `+${module.sciencePoints} pts`, tone: 'good' });
  }
  if (module.riskModifier !== 0) {
    specs.push({
      label: 'Riesgo',
      value: `${formatSigned(module.riskModifier)} %`,
      tone: module.riskModifier < 0 ? 'good' : 'bad',
    });
  }
  if ((module.slotsRequired ?? 1) > 1) {
    specs.push({ label: 'Ranuras', value: String(module.slotsRequired) });
  }
  return specs;
}

function ModuleSpecList({ module }: { module: ModuleItem }) {
  return (
    <dl className="grid grid-cols-2 gap-x-gutter-md gap-y-1 sm:grid-cols-3">
      {getModuleSpecs(module).map((spec) => (
        <div key={spec.label} className="flex flex-col">
          <dt className="font-body text-[11px] text-on-surface-variant">{spec.label}</dt>
          <dd
            className={cn(
              'font-mono text-mono-sm tabular-nums',
              spec.tone === 'good'
                ? 'text-success'
                : spec.tone === 'bad'
                  ? 'text-warning'
                  : 'text-on-surface',
            )}
          >
            {spec.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ModuleCard({ module }: { module: ModuleItem }) {
  const mission = useDesignStore((s) => s.mission);
  const modules = useDesignStore((s) => s.modules);
  const selectedModules = useDesignStore((s) => s.selectedModules);
  const activeVote = useDesignStore((s) => s.activeVote);
  const myRole = useDesignStore((s) => s.myRole);
  const difficulty = useDesignStore((s) => s.difficulty);
  const localMode = useDesignStore((s) => s.localMode);
  const playerCount = useDesignStore((s) => s.roomState?.players.length ?? 1);
  const proposeModule = useDesignStore((s) => s.proposeModule);

  if (!mission) return null;

  const isSolo = localMode || playerCount <= 1;
  const equipped = selectedModules.some((item) => item.id === module.id);
  const action = equipped ? 'REMOVE' : 'ADD';
  const required = module.requiresModuleId
    ? modules.find((item) => item.id === module.requiresModuleId)
    : undefined;

  // Mismo criterio que aplicará el motor: se explica antes de que el jugador lo intente.
  const disabledReason =
    !isSolo && module.allowedRole !== myRole
      ? `Solo ${ROLE_META[module.allowedRole].label} puede proponerlo.`
      : !isSolo && activeVote
        ? 'Hay una votación en curso: resuélvela antes de proponer otro módulo.'
        : getProposalBlocker(mission, selectedModules, module, action);

  const label = equipped
    ? isSolo
      ? 'Quitar del diseño'
      : 'Proponer retirada'
    : isSolo
      ? 'Añadir al diseño'
      : 'Proponer al equipo';

  return (
    <li
      className={cn(
        'flex flex-col gap-gutter-sm rounded border p-gutter-md',
        equipped
          ? 'border-success/40 bg-success/5'
          : 'border-outline-variant bg-surface-container',
      )}
    >
      <div className="flex items-start justify-between gap-gutter-sm">
        <div className="min-w-0">
          <h3 className="font-label text-label-lg text-on-surface">{module.name}</h3>
          <p className="font-mono text-mono-xs text-on-surface-variant">{module.id}</p>
        </div>
        {equipped && (
          <Pill tone="success" icon={CheckCircle2} className="shrink-0">
            Equipado
          </Pill>
        )}
      </div>

      <ModuleSpecList module={module} />

      {required && (
        <p className="font-body text-[12px] text-on-surface-variant">
          Requiere {required.name} ({required.id}).
        </p>
      )}
      {difficulty === 'APPRENTICE' && (
        <p className="font-body text-[12px] leading-relaxed text-on-surface-variant">
          {module.apprenticeTip}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-1 pt-gutter-xs">
        <ActionButton
          variant={equipped ? 'danger' : 'secondary'}
          icon={equipped ? Minus : Plus}
          disabled={disabledReason !== null}
          onClick={() => proposeModule(module.id, action)}
          className="self-start px-gutter-md"
        >
          {label}
        </ActionButton>
        {disabledReason && (
          <p className="font-body text-[12px] text-on-surface-variant">{disabledReason}</p>
        )}
      </div>
    </li>
  );
}

function useSecondsLeft(vote: ActiveVote): number {
  const [deadline] = useState(() => {
    // Los relojes del cliente y del servidor pueden diferir: si el margen calculado no
    // es creíble, se asume que la votación acaba de abrirse.
    const remaining = vote.expiresAt - Date.now();
    const credible = remaining > 0 && remaining <= VOTE_WINDOW_MS + 5000;
    return Date.now() + (credible ? remaining : VOTE_WINDOW_MS);
  });
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return secondsLeft;
}

function VotePanel({ vote }: { vote: ActiveVote }) {
  const myId = useDesignStore((s) => s.socket?.id);
  const roomState = useDesignStore((s) => s.roomState);
  const castVote = useDesignStore((s) => s.vote);
  const secondsLeft = useSecondsLeft(vote);

  const players = roomState?.players ?? [];
  const majority = Math.floor(players.length / 2) + 1;
  const alreadyVoted =
    myId !== undefined && (vote.approvals.includes(myId) || vote.rejections.includes(myId));
  const nameOf = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? 'Operador';

  return (
    <div className="flex flex-col gap-gutter-md rounded border border-accent/40 bg-accent/5 p-gutter-md">
      <div className="flex flex-wrap items-start justify-between gap-gutter-sm">
        <div>
          <p className="font-label text-label-sm text-accent">
            {ROLE_META[vote.proposedBy].label} propone{' '}
            {vote.action === 'ADD' ? 'añadir' : 'retirar'}
          </p>
          <h3 className="font-headline text-headline-md text-on-surface">{vote.module.name}</h3>
          <p className="font-mono text-mono-xs text-on-surface-variant">{vote.module.id}</p>
        </div>
        <Pill tone={secondsLeft <= 10 ? 'error' : 'accent'} icon={Timer}>
          <span className="tabular-nums">Expira en ~{secondsLeft} s</span>
        </Pill>
      </div>

      <ModuleSpecList module={vote.module} />
      <p className="font-body text-body-md text-on-surface-variant">{vote.module.apprenticeTip}</p>

      <dl className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2">
        <div className="rounded border border-success/30 bg-success/5 p-gutter-sm">
          <dt className="font-label text-label-sm text-success">
            A favor · {vote.approvals.length}
          </dt>
          <dd className="font-body text-body-md text-on-surface">
            {vote.approvals.map(nameOf).join(', ') || 'Nadie todavía'}
          </dd>
        </div>
        <div className="rounded border border-error/30 bg-error/5 p-gutter-sm">
          <dt className="font-label text-label-sm text-error">
            En contra · {vote.rejections.length}
          </dt>
          <dd className="font-body text-body-md text-on-surface">
            {vote.rejections.map(nameOf).join(', ') || 'Nadie todavía'}
          </dd>
        </div>
      </dl>

      {alreadyVoted ? (
        <p className="font-body text-body-md text-on-surface-variant" role="status">
          Tu voto está registrado. Se aprueba con {majority} de {players.length} votos a favor.
        </p>
      ) : (
        <div className="flex flex-col gap-gutter-sm sm:flex-row">
          <ActionButton
            variant="success"
            icon={ThumbsUp}
            fullWidth
            data-autofocus
            onClick={() => castVote(vote.voteId, true)}
          >
            Aprobar
          </ActionButton>
          <ActionButton
            variant="danger"
            icon={ThumbsDown}
            fullWidth
            onClick={() => castVote(vote.voteId, false)}
          >
            Rechazar
          </ActionButton>
        </div>
      )}
    </div>
  );
}

export function ModuleCatalogModal({
  view,
  onClose,
}: {
  view: CatalogView;
  onClose: () => void;
}) {
  const modules = useDesignStore((s) => s.modules);
  const selectedModules = useDesignStore((s) => s.selectedModules);
  const activeVote = useDesignStore((s) => s.activeVote);
  const telemetry = useDesignStore((s) => s.telemetry);
  const myRole = useDesignStore((s) => s.myRole);
  const localMode = useDesignStore((s) => s.localMode);
  const playerCount = useDesignStore((s) => s.roomState?.players.length ?? 1);

  if (view === 'debate') {
    return (
      <Modal
        title="Mesa de debate"
        description="Cada propuesta se vota entre todos los operadores antes de aplicarse al diseño."
        icon={Handshake}
        iconClassName="text-accent"
        onClose={onClose}
      >
        {activeVote ? (
          <VotePanel key={activeVote.voteId} vote={activeVote} />
        ) : (
          <EmptyState>
            No hay propuestas pendientes. Cuando alguien proponga un módulo, la votación
            aparecerá aquí.
          </EmptyState>
        )}
      </Modal>
    );
  }

  const category = CATEGORY_META[view];
  const isSolo = localMode || playerCount <= 1;
  const readOnly = !isSolo && category.role !== myRole;
  const budgetRemaining = telemetry?.budgetRemaining ?? 0;
  const description =
    view === 'SCI'
      ? `${formatMillions(budgetRemaining)} disponibles · bahía científica ${countScienceBaySlots(selectedModules)}/${MAX_SCIENCE_BAY_SLOTS} ranuras`
      : `${formatMillions(budgetRemaining)} disponibles`;

  return (
    <Modal title={category.label} description={description} size="lg" onClose={onClose}>
      {readOnly && (
        <p className="mb-gutter-md rounded border border-outline bg-surface-container px-gutter-md py-gutter-sm font-body text-body-md text-on-surface-variant">
          Este catálogo pertenece a {ROLE_META[category.role].label}. Puedes consultarlo, pero
          solo su responsable propone estos módulos.
        </p>
      )}
      <ul className="grid grid-cols-1 gap-gutter-md md:grid-cols-2">
        {modules
          .filter((module) => module.category === view)
          .map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
      </ul>
    </Modal>
  );
}

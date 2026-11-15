import { useMemo } from 'react';
import { Check, Handshake, Minus, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useDesignStore, type DecisionLogEntry } from '../../store/useDesignStore';
import { DEMO_PROPOSALS, getModule, ROLE_META, TEAM_ROLES, type ProposalTemplate } from '../../data/demoCatalog';
import {
  countVotes,
  getCoordinationMeta,
  getProposalImpact,
  getTeamVotes,
  type ProposalImpact,
  type RoleVote,
  type VoteStance,
} from '../../lib/designCalculations';
import {
  formatSignedKg,
  formatSignedKw,
  formatSignedMbps,
  formatSignedMillions,
  formatSignedNumber,
  formatSignedYears,
  formatNumber,
} from '../../lib/format';
import { ROLE_GLYPHS, ROLE_ICON_BOX_CLASS, ROLE_TEXT_CLASS } from './roleUi';
import { DesignStatusPill, MeterBar, cx, type Tone } from './ui';

const VOTE_STYLE: Record<VoteStance, { box: string; label: string; icon: typeof Check }> = {
  FOR: {
    box: 'border-success/30 bg-success/10 text-success',
    label: 'A favor',
    icon: Check,
  },
  AGAINST: {
    box: 'border-error/30 bg-error/10 text-error',
    label: 'En contra',
    icon: X,
  },
  NEUTRAL: {
    box: 'border-outline-variant bg-surface-container text-on-surface-variant',
    label: 'Se abstiene',
    icon: Minus,
  },
};

const IMPACT_CELL_CLASS: Record<Tone, string> = {
  primary: 'text-on-surface',
  secondary: 'text-secondary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-accent',
  error: 'text-error',
};

function ImpactCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="rounded border border-outline-variant bg-surface-container/60 px-2 py-1.5">
      <p className="font-mono text-mono-xs uppercase tracking-[0.08em] text-on-surface-variant">
        {label}
      </p>
      <p className={cx('mt-0.5 font-mono text-mono-sm tabular-nums', IMPACT_CELL_CLASS[tone])}>
        {value}
      </p>
    </div>
  );
}

function VoteChip({ vote }: { vote: RoleVote }) {
  const style = VOTE_STYLE[vote.stance];
  const Icon = style.icon;
  const RoleIcon = ROLE_GLYPHS[vote.role];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-label text-label-sm',
        style.box,
      )}
      title={`${ROLE_META[vote.role].owner}: ${style.label}`}
    >
      <RoleIcon className="h-3 w-3" aria-hidden="true" />
      {ROLE_META[vote.role].label}
      <Icon className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

function DecisionLog({ entries }: { entries: DecisionLogEntry[] }) {
  if (!entries.length) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-mono-xs uppercase tracking-[0.14em] text-on-surface-variant">
        Decisiones recientes
      </p>
      {entries.slice(0, 3).map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-2 rounded border border-outline-variant bg-surface-container/60 px-2 py-1.5"
        >
          <span
            className={cx(
              'shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-mono-xs uppercase tracking-[0.08em]',
              entry.outcome === 'APROBADA'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-accent/30 bg-accent/10 text-accent',
            )}
          >
            {entry.outcome === 'APROBADA' ? 'Aprobada' : 'Margen'}
          </span>
          <span className="min-w-0 flex-1 truncate font-body text-body-md text-on-surface">
            {entry.moduleName}
          </span>
          <span className="shrink-0 font-mono text-mono-xs text-on-surface-variant">
            {ROLE_META[entry.role].label} · {entry.time} · +{entry.coordinationDelta}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface ProposalCardData {
  proposal: ProposalTemplate;
  impact: ProposalImpact | null;
  votes: RoleVote[];
  forVotes: number;
  againstVotes: number;
  neutralVotes: number;
  canApply: boolean;
}

interface ProposalCardProps {
  data: ProposalCardData;
  active: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onMaintainMargin: () => void;
}

function ProposalCard({
  data,
  active,
  onSelect,
  onApprove,
  onMaintainMargin,
}: ProposalCardProps) {
  const { proposal, impact, votes, forVotes, againstVotes, neutralVotes, canApply } = data;
  const module = impact?.module ?? getModule(proposal.moduleId);
  const proposerRole = proposal.proposedBy;
  const ProposerIcon = ROLE_GLYPHS[proposerRole];
  const actionClass =
    proposal.action === 'ADD'
      ? 'border-primary/40 bg-primary/10 text-primary'
      : 'border-accent/40 bg-accent/10 text-accent';
  const actionLabel = proposal.action === 'ADD' ? 'Añadir módulo' : 'Liberar espacio';

  return (
    <article
      onClick={onSelect}
      data-proposal-id={proposal.id}
      data-active={active}
      className={cx(
        'flex cursor-pointer flex-col gap-2 rounded-md border p-3 transition-all duration-200 ease-state-change',
        active
          ? 'border-primary/60 bg-surface-container'
          : 'border-outline-variant bg-surface-container/70 hover:border-outline hover:bg-surface-container',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span
            className={cx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded border',
              ROLE_ICON_BOX_CLASS[proposerRole],
            )}
          >
            <ProposerIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-mono-xs uppercase tracking-[0.12em] text-on-surface-variant">
              {ROLE_META[proposerRole].owner} propone
            </p>
            <h3 className="font-title text-title-md text-on-surface">
              {proposal.action === 'ADD' ? 'Instalar' : 'Liberar'} {module?.name}
            </h3>
          </div>
        </div>
        <span
          className={cx(
            'shrink-0 rounded-full border px-2 py-0.5 font-label text-label-sm',
            actionClass,
          )}
        >
          {actionLabel}
        </span>
      </div>

      <p className="font-body text-body-md text-on-surface-variant">{proposal.rationale}</p>

      {impact ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <ImpactCell label="Masa" value={formatSignedKg(impact.deltas.massKg)} tone={impact.deltas.massKg > 0 ? 'warning' : impact.deltas.massKg < 0 ? 'success' : 'primary'} />
            <ImpactCell label="Coste" value={formatSignedMillions(impact.deltas.costMillions)} tone={impact.deltas.costMillions > 0 ? 'warning' : impact.deltas.costMillions < 0 ? 'success' : 'primary'} />
            <ImpactCell label="Ciencia" value={`${formatSignedNumber(impact.deltas.sciencePoints)} pts`} tone={impact.deltas.sciencePoints > 0 ? 'success' : impact.deltas.sciencePoints < 0 ? 'error' : 'primary'} />
            <ImpactCell label="Energía" value={formatSignedKw(impact.deltas.powerKw)} tone={impact.deltas.powerKw > 0 ? 'warning' : impact.deltas.powerKw < 0 ? 'success' : 'primary'} />
            <ImpactCell label="Enlace" value={formatSignedMbps(impact.deltas.dataMbps)} tone={impact.deltas.dataMbps > 0 ? 'secondary' : impact.deltas.dataMbps < 0 ? 'warning' : 'primary'} />
            <ImpactCell label="Vida útil" value={formatSignedYears(impact.deltas.lifeYears)} tone={impact.deltas.lifeYears > 0 ? 'success' : impact.deltas.lifeYears < 0 ? 'warning' : 'primary'} />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded border border-outline-variant bg-surface-container px-2.5 py-2">
            <span className="font-label text-label-sm text-on-surface-variant">
              Estado resultante
            </span>
            <DesignStatusPill status={impact.next.status} compact />
            <span className="font-mono text-mono-xs text-on-surface-variant">
              Ciencia {formatNumber(impact.next.projectedSciencePoints)} pts · Presupuesto{' '}
              {formatNumber(impact.next.budgetRemaining)} M$
            </span>
          </div>
        </>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-mono-xs uppercase tracking-[0.1em] text-on-surface-variant">
          Votación
        </span>
        {votes.map((vote) => (
          <VoteChip key={vote.role} vote={vote} />
        ))}
      </div>

      <p className="mt-1.5 font-mono text-mono-xs text-on-surface-variant">
        {forVotes}/{TEAM_ROLES.length} a favor
        {againstVotes ? ` · ${againstVotes} en contra` : ''}
        {neutralVotes ? ` · ${neutralVotes} se abstiene${neutralVotes === 1 ? '' : 'n'}` : ''}
      </p>

      {active ? (
        impact && canApply ? (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex items-center justify-center gap-2 rounded px-3 py-2 font-label text-label-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary bg-primary text-on-primary hover:opacity-90"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Aprobar propuesta
            </button>
            <button
              type="button"
              onClick={onMaintainMargin}
              className="inline-flex items-center justify-center gap-2 rounded border border-outline bg-surface-container px-3 py-2 font-label text-label-lg text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              Mantener margen
            </button>
          </div>
        ) : (
          <p className="mt-3 rounded border border-accent/30 bg-accent/5 px-2 py-1.5 font-body text-body-md text-accent">
            {impact ? 'Esta propuesta ya no aplica: el diseño ha cambiado desde que se abrió.' : 'No hay proyección de impacto disponible.'}
          </p>
        )
      ) : (
        <p className="mt-3 rounded border border-dashed border-outline-variant bg-surface-container/50 px-2 py-2 font-body text-body-md text-on-surface-variant">
          Esperando la votación del equipo para esta propuesta.
        </p>
      )}
    </article>
  );
}

export function NegotiationCard() {
  const proposal = useDesignStore((state) => state.proposal);
  const selectedModuleIds = useDesignStore((state) => state.selectedModuleIds);
  const orbitId = useDesignStore((state) => state.orbitId);
  const launcherId = useDesignStore((state) => state.launcherId);
  const coordination = useDesignStore((state) => state.coordination);
  const approvals = useDesignStore((state) => state.approvals);
  const marginHolds = useDesignStore((state) => state.marginHolds);
  const decisionLog = useDesignStore((state) => state.decisionLog);
  const approveProposal = useDesignStore((state) => state.approveProposal);
  const maintainMargin = useDesignStore((state) => state.maintainMargin);
  const requestProposal = useDesignStore((state) => state.requestProposal);
  const selectProposal = useDesignStore((state) => state.selectProposal);

  const cards = useMemo<ProposalCardData[]>(
    () =>
      DEMO_PROPOSALS.map((proposalItem) => {
        const impact = getProposalImpact(proposalItem, selectedModuleIds, orbitId, launcherId);
        const votes = getTeamVotes(impact);
        const forVotes = countVotes(votes, 'FOR');
        const againstVotes = countVotes(votes, 'AGAINST');
        const neutralVotes = countVotes(votes, 'NEUTRAL');
        return {
          proposal: proposalItem,
          impact,
          votes,
          forVotes,
          againstVotes,
          neutralVotes,
          canApply: impact?.canApply ?? false,
        };
      }),
    [selectedModuleIds, orbitId, launcherId],
  );

  const coordinationMeta = getCoordinationMeta(coordination);

  return (
    <section className="panel flex flex-col gap-3 rounded-md p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
            <Handshake className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-mono-xs uppercase tracking-[0.18em] text-on-surface-variant">
              Colaboración
            </p>
            <h2 className="font-headline text-title-md text-on-surface">Mesa de negociación</h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Propuestas, votos y margen de equipo.
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-mono-xs uppercase tracking-[0.1em] text-on-surface-variant">
            Coordinación
          </p>
          <p className={cx('font-mono text-headline-md tabular-nums', ROLE_TEXT_CLASS[proposal?.proposedBy ?? 'CIENCIA'])}>
            {coordination}%
          </p>
          <p className="font-label text-label-sm text-on-surface-variant">{coordinationMeta.label}</p>
        </div>
      </div>

      <div>
        <MeterBar
          percent={coordination}
          tone={coordinationMeta.tone}
          label="Índice de coordinación del equipo"
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 font-mono text-mono-xs text-on-surface-variant">
          <span>
            {approvals} aprobadas · {marginHolds} márgenes mantenidos
          </span>
          <span>{TEAM_ROLES.length} roles conectados</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {cards.map((card) => (
          <ProposalCard
            key={card.proposal.id}
            data={card}
            active={proposal?.id === card.proposal.id}
            onSelect={() => selectProposal(card.proposal.id)}
            onApprove={approveProposal}
            onMaintainMargin={maintainMargin}
          />
        ))}
      </div>

      {!proposal ? (
        <div className="rounded-md border border-dashed border-outline-variant bg-surface-container/50 p-4 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-title text-title-md text-on-surface">Sin propuestas abiertas</p>
          <p className="mt-1 font-body text-body-md text-on-surface-variant">
            Pide al equipo una propuesta de cambio para ejercitar la negociación de recursos.
          </p>
          <button
            type="button"
            onClick={requestProposal}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded border border-primary/40 bg-primary/10 px-3 py-2 font-label text-label-lg text-primary transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Pedir propuesta al equipo
          </button>
        </div>
      ) : null}

      <DecisionLog entries={decisionLog} />

      <p className="font-mono text-mono-xs text-on-surface-variant">
        La votación es una simulación local de la mesa; no hay backend ni Socket.io.
      </p>
    </section>
  );
}

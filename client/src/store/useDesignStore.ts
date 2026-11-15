import { create } from 'zustand';
import {
  DEFAULT_COORDINATION,
  DEMO_PROPOSALS,
  INITIAL_LAUNCHER_ID,
  INITIAL_MODULE_IDS,
  INITIAL_ORBIT_ID,
  ROLE_META,
  ROLE_TAB,
  SCIENCE_SLOTS,
  TAB_ROLE,
  getModule,
  getOrbit,
  getLauncher,
  type CatalogTab,
  type ProposalTemplate,
  type TeamRole,
} from '../data/demoCatalog';
import { clamp, formatMillions } from '../lib/format';
import { computeDesignMetrics, getProposalImpact } from '../lib/designCalculations';

export type ToastTone = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface DecisionLogEntry {
  id: string;
  outcome: 'APROBADA' | 'MARGEN';
  moduleName: string;
  role: TeamRole;
  time: string;
  coordinationDelta: number;
}

interface DesignState {
  activeRole: TeamRole;
  activeTab: CatalogTab;
  selectedModuleIds: string[];
  orbitId: string;
  launcherId: string;
  proposal: ProposalTemplate | null;
  proposalCursor: number;
  coordination: number;
  approvals: number;
  marginHolds: number;
  decisionLog: DecisionLogEntry[];
  toasts: ToastItem[];
  launchModalOpen: boolean;
  lastLaunchValidated: boolean;

  setRole: (role: TeamRole) => void;
  setTab: (tab: CatalogTab) => void;
  toggleModule: (moduleId: string) => void;
  selectOrbit: (orbitId: string) => void;
  selectLauncher: (launcherId: string) => void;
  approveProposal: () => void;
  maintainMargin: () => void;
  requestProposal: () => void;
  selectProposal: (proposalId: string) => void;
  openLaunchModal: () => void;
  closeLaunchModal: () => void;
  confirmLaunch: () => void;
  resetDesign: () => void;
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

let toastSequence = 0;

function nextToastId(): number {
  toastSequence += 1;
  return toastSequence;
}

function timeLabel(): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function initialProposal(): ProposalTemplate {
  return DEMO_PROPOSALS[0];
}

export const useDesignStore = create<DesignState>()((set, get) => ({
  activeRole: 'CIENCIA',
  activeTab: 'ciencia',
  selectedModuleIds: [...INITIAL_MODULE_IDS],
  orbitId: INITIAL_ORBIT_ID,
  launcherId: INITIAL_LAUNCHER_ID,
  proposal: initialProposal(),
  proposalCursor: 1,
  coordination: DEFAULT_COORDINATION,
  approvals: 0,
  marginHolds: 0,
  decisionLog: [],
  toasts: [],
  launchModalOpen: false,
  lastLaunchValidated: false,

  notify: (message, tone = 'info') => {
    const toast: ToastItem = { id: nextToastId(), message, tone };
    set((state) => ({ toasts: [...state.toasts.slice(-3), toast] }));
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  setRole: (role) => {
    set({ activeRole: role, activeTab: ROLE_TAB[role] });
  },

  setTab: (tab) => {
    set({ activeTab: tab, activeRole: TAB_ROLE[tab] });
  },

  toggleModule: (moduleId) => {
    const state = get();
    const module = getModule(moduleId);
    if (!module) return;

    const isSelected = state.selectedModuleIds.includes(moduleId);
    const canReleaseAsDirector = state.activeRole === 'RECURSOS' && isSelected;

    if (state.activeRole !== module.allowedRole && !canReleaseAsDirector) {
      state.notify(
        `Acceso restringido: ${ROLE_META[module.allowedRole].owner} gestiona este módulo.`,
        'error',
      );
      return;
    }

    if (!isSelected && module.category === 'SCI') {
      const scienceCount = state.selectedModuleIds
        .map((id) => getModule(id))
        .filter((item) => item?.category === 'SCI').length;
      if (scienceCount >= SCIENCE_SLOTS) {
        state.notify(
          `Ranuras científicas completas (${SCIENCE_SLOTS}/${SCIENCE_SLOTS}). Retira un instrumento antes de añadir otro.`,
          'warning',
        );
        return;
      }
    }

    const nextIds = isSelected
      ? state.selectedModuleIds.filter((id) => id !== moduleId)
      : [...state.selectedModuleIds, moduleId];

    set({ selectedModuleIds: nextIds, lastLaunchValidated: false });

    const after = computeDesignMetrics(nextIds, state.orbitId, state.launcherId);

    if (isSelected) {
      state.notify(
        canReleaseAsDirector ? `${module.name} liberado del presupuesto.` : `${module.name} retirado.`,
        'info',
      );
      return;
    }

    if (after.status === 'CRITICO') {
      state.notify(
        `${module.name} instalado. Atención: el diseño entra en estado crítico.`,
        'warning',
      );
    } else {
      state.notify(
        `${module.name} instalado. Telemetría recalculada.`,
        module.allowedRole === 'CIENCIA' ? 'success' : 'info',
      );
    }
  },

  selectOrbit: (orbitId) => {
    const state = get();
    if (state.activeRole !== 'ORBITA') {
      state.notify('Solo el Especialista Orbital puede cambiar la órbita.', 'error');
      return;
    }

    const orbit = getOrbit(orbitId);
    set({ orbitId: orbit.id, lastLaunchValidated: false });

    const after = computeDesignMetrics(state.selectedModuleIds, orbit.id, state.launcherId);
    state.notify(
      `Órbita fijada: ${orbit.shortName}.${after.status === 'CRITICO' ? ' Revisa los bloqueos de masa.' : ''}`,
      after.status === 'CRITICO' ? 'warning' : 'info',
    );
  },

  selectLauncher: (launcherId) => {
    const state = get();
    if (state.activeRole !== 'ORBITA') {
      state.notify('Solo el Especialista Orbital puede cambiar el lanzador.', 'error');
      return;
    }

    const launcher = getLauncher(launcherId);
    set({ launcherId: launcher.id, lastLaunchValidated: false });

    const after = computeDesignMetrics(state.selectedModuleIds, state.orbitId, launcher.id);
    state.notify(
      `Lanzador fijado: ${launcher.name} (${formatMillions(launcher.costMillions)}).${
        after.totalMassKg > after.massLimitKg ? ' La masa excede su capacidad.' : ''
      }`,
      after.totalMassKg > after.massLimitKg ? 'warning' : 'info',
    );
  },

  approveProposal: () => {
    const state = get();
    const proposal = state.proposal;
    if (!proposal) return;

    const impact = getProposalImpact(
      proposal,
      state.selectedModuleIds,
      state.orbitId,
      state.launcherId,
    );

    if (!impact) {
      set({ proposal: null });
      return;
    }

    if (!impact.canApply) {
      set({ proposal: null });
      state.notify('La propuesta ya no aplica al diseño actual. Sin cambios.', 'info');
      return;
    }

    const coordination = clamp(state.coordination + 8, 0, 100);
    const outcome = proposal.action === 'ADD' ? 'instalado' : 'liberado';
    const entry: DecisionLogEntry = {
      id: `${proposal.id}-${Date.now()}`,
      outcome: 'APROBADA',
      moduleName: impact.module.name,
      role: proposal.proposedBy,
      time: timeLabel(),
      coordinationDelta: 8,
    };

    set((current) => ({
      selectedModuleIds: impact.nextIds,
      proposal: null,
      coordination,
      approvals: current.approvals + 1,
      decisionLog: [entry, ...current.decisionLog].slice(0, 4),
      lastLaunchValidated: false,
    }));

    state.notify(
      `Propuesta aprobada: ${impact.module.name} ${outcome}. Coordinación +8 (${coordination}%).`,
      impact.next.status === 'CRITICO' ? 'warning' : 'success',
    );
  },

  maintainMargin: () => {
    const state = get();
    const proposal = state.proposal;
    if (!proposal) return;

    const module = getModule(proposal.moduleId);
    const coordination = clamp(state.coordination + 3, 0, 100);
    const entry: DecisionLogEntry = {
      id: `${proposal.id}-${Date.now()}`,
      outcome: 'MARGEN',
      moduleName: module?.name ?? 'Cambio sin módulo',
      role: proposal.proposedBy,
      time: timeLabel(),
      coordinationDelta: 3,
    };

    set((current) => ({
      proposal: null,
      coordination,
      marginHolds: current.marginHolds + 1,
      decisionLog: [entry, ...current.decisionLog].slice(0, 4),
    }));

    state.notify(
      `Mantienes el margen actual. El diseño no cambia. Coordinación +3 (${coordination}%).`,
      'info',
    );
  },

  requestProposal: () => {
    const state = get();
    const scienceCount = state.selectedModuleIds
      .map((id) => getModule(id))
      .filter((module) => module?.category === 'SCI').length;

    let cursor = state.proposalCursor % DEMO_PROPOSALS.length;

    for (let attempt = 0; attempt < DEMO_PROPOSALS.length; attempt += 1) {
      const index = (cursor + attempt) % DEMO_PROPOSALS.length;
      const candidate = DEMO_PROPOSALS[index];
      const module = getModule(candidate.moduleId);
      if (!module) continue;

      const isSelected = state.selectedModuleIds.includes(module.id);
      if (candidate.action === 'ADD' && isSelected) continue;
      if (candidate.action === 'REMOVE' && !isSelected) continue;
      if (candidate.action === 'ADD' && module.category === 'SCI' && scienceCount >= SCIENCE_SLOTS) {
        continue;
      }

      set({
        proposal: candidate,
        proposalCursor: (index + 1) % DEMO_PROPOSALS.length,
      });
      state.notify(
        `Nueva propuesta del equipo: ${candidate.action === 'ADD' ? 'añadir' : 'liberar'} ${module.name}.`,
        'info',
      );
      return;
    }

    state.notify('No hay propuestas compatibles con el diseño actual.', 'info');
  },

  selectProposal: (proposalId) => {
    const proposal = DEMO_PROPOSALS.find((item) => item.id === proposalId);
    if (!proposal) return;

    set({
      proposal,
      approvals: 0,
      marginHolds: 0,
      decisionLog: [],
    });

    const module = getModule(proposal.moduleId);
    get().notify(
      `Propuesta ${proposal.id} abierta a votación: ${
        proposal.action === 'ADD' ? 'añadir' : 'liberar'
      } ${module?.name ?? proposal.moduleId}.`,
      'info',
    );
  },

  openLaunchModal: () => set({ launchModalOpen: true }),

  closeLaunchModal: () => set({ launchModalOpen: false }),

  confirmLaunch: () => {
    const state = get();
    const metrics = computeDesignMetrics(state.selectedModuleIds, state.orbitId, state.launcherId);
    const blocked = metrics.budgetRemaining < 0 || metrics.totalMassKg > metrics.massLimitKg;

    if (blocked) {
      state.notify(
        'No puedes simular el lanzamiento: corrige el presupuesto o la masa primero.',
        'error',
      );
      return;
    }

    set({ launchModalOpen: false, lastLaunchValidated: true });
    state.notify(
      'Secuencia de lanzamiento validada. La mesa queda lista para la simulación de vuelo (demo).',
      'success',
    );
  },

  resetDesign: () => {
    set({
      selectedModuleIds: [...INITIAL_MODULE_IDS],
      orbitId: INITIAL_ORBIT_ID,
      launcherId: INITIAL_LAUNCHER_ID,
      proposal: initialProposal(),
      proposalCursor: 1,
      coordination: DEFAULT_COORDINATION,
      approvals: 0,
      marginHolds: 0,
      decisionLog: [],
      launchModalOpen: false,
      lastLaunchValidated: false,
    });
    get().notify('Mesa restablecida al diseño base de Aura-CL1.', 'info');
  },
}));

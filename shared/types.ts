export type RoleType = 'DIRECTOR' | 'PROPULSION' | 'SCIENCE' | 'COMMS';
export type DifficultyMode = 'APPRENTICE' | 'ENGINEER';
export type GamePhase = 'LOBBY' | 'DESIGN' | 'FLIGHT' | 'REPORT';
export type GameMode = 'SOLO' | 'TEAM';
export type ModuleCategory = 'EST' | 'SCI' | 'COM';
export type ModuleAction = 'ADD' | 'REMOVE';
export type FlightAct = 'ASCENT_INSERTION' | 'CRISIS' | 'OPERATIONS';
export type FlightOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILURE';
export type FlightActionType = 'SOLVE_PUZZLE' | 'TOGGLE_SENSOR' | 'EXEC_DECISION';
export type FlightEventTrigger =
  | 'POWER_DEFICIT'
  | 'STRUCTURAL_STRESS'
  | 'LOW_DOWNLINK'
  | 'NOMINAL'
  | 'SPACE_RADIATION'
  | 'FLUID_SHIFT_SANS'
  | 'SPATIAL_DISORIENTATION'
  | 'MICROBIOME_ALERT'
  | 'AUTONOMOUS_MEDICAL';

export interface Player {
  id: string;
  name: string;
  role: RoleType | null;
  ready: boolean;
}

export interface ModuleItem {
  id: string;
  name: string;
  category: ModuleCategory;
  allowedRole: RoleType;
  costMillions: number;
  massKg: number;
  powerKw: number;
  dataGenMbps: number;
  dataDownlinkMbps: number;
  sciencePoints: number;
  riskModifier: number;
  slotsRequired?: number;
  requiresModuleId?: string;
  apprenticeTip: string;
}

export interface MissionConfig {
  id: string;
  title: string;
  orbitType: 'LEO' | 'SSO' | 'LUNAR' | 'DEEP_SPACE';
  budgetMillions: number;
  maxLauncherMassKg: number;
  targetSciencePoints: number;
  requiredDownlinkRatio: number;
  groundStationId: string;
  realNasaReference: {
    missionName: string;
    summary: string;
    engineeringLesson: string;
    sourceUrl: string;
  };
  /** Narrativa breve de la misión para briefing / registro (opcional, MVP). */
  story?: string;
  /** URL de arte conceptual o referencia visual de la misión (opcional, MVP). */
  imageUrl?: string;
  /** Crédito de la imagen usada en el briefing. */
  imageCredit?: string;
  /** Objetivos que la misión espera alcanzar (ciencia / ingeniería). */
  objectives?: string[];
}

export interface GroundStation {
  id: string;
  name: string;
  supportedOrbits: MissionConfig['orbitType'][];
  downlinkMultiplier: number;
  windowDurationSeconds: number;
  windowPeriodSeconds: number;
  sourceUrl: string;
  gameBalanceNote: string;
}

export interface FlightSimulationConfig {
  durationSeconds: number;
  tickIntervalMs: number;
  crisisProgressPercent: number;
  crisisActEndPercent: number;
  baseFuelPercent: number;
  fuelConsumptionPercentPerProgress: number;
  baseTemperatureC: number;
  temperatureRiseCPerMassPercent: number;
  temperatureRiseCAtFullProgress: number;
  integrityLossPerStructuralRisk: number;
  trajectoryByOrbit: Record<
    MissionConfig['orbitType'],
    { progress: number; x: number; y: number }[]
  >;
  scoreWeights: { science: number; data: number; operations: number };
  outcomeThresholds: { success: number; partial: number };
  modelNote: string;
}

export interface TelemetryMetrics {
  budgetSpent: number;
  budgetRemaining: number;
  totalMassKg: number;
  massPercentage: number;
  powerGeneratedKw: number;
  powerConsumedKw: number;
  propulsiveEfficiency: number;
  totalDataGenerated: number;
  totalDownlinkCapacity: number;
  structuralRisk: number;
  projectedSciencePoints: number;
  warnings: string[];
}

export interface AuditIssue {
  code: string;
  message: string;
  severity: 'WARNING' | 'BLOCK';
}

export interface PrelaunchAudit {
  canLaunch: boolean;
  warnings: AuditIssue[];
  blocks: AuditIssue[];
  telemetry: TelemetryMetrics;
  scienceBaySlotsUsed: number;
}

export interface ActiveVote {
  voteId: string;
  proposedBy: RoleType;
  module: ModuleItem;
  action: ModuleAction;
  approvals: string[];
  rejections: string[];
  expiresAt: number;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  difficulty: DifficultyMode;
  phase: GamePhase;
  mission: MissionConfig;
  players: Player[];
  selectedModules: ModuleItem[];
  telemetry: TelemetryMetrics;
  activeVote: ActiveVote | null;
  audit: PrelaunchAudit;
}

export interface FlightEventDefinition {
  id: string;
  title: string;
  trigger: FlightEventTrigger;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  rootCause: string;
  recommendation: string;
  puzzle?: {
    id: string;
    role: 'PROPULSION' | 'SCIENCE';
    prompt: string;
    answer: string;
  };
}

export interface FlightCrisisAlert {
  eventId: string;
  title: string;
  severity: FlightEventDefinition['severity'];
  description: string;
}

export interface FlightTickBase {
  progress: number;
  act: FlightAct;
}

export type AsymmetricFlightPayload =
  | (FlightTickBase & {
      role: 'COMMS';
      trajectory: { progress: number; x: number; y: number }[];
      threats: FlightCrisisAlert[];
      downlinkWindowOpen: boolean;
    })
  | (FlightTickBase & {
      role: 'PROPULSION';
      internal: {
        fuelPercent: number;
        temperatureC: number;
        integrityPercent: number;
        energyBalanceKw: number;
      };
      repairPuzzle: { id: string; prompt: string } | null;
    })
  | (FlightTickBase & {
      role: 'SCIENCE';
      sensors: {
        moduleId: string;
        name: string;
        active: boolean;
        dataGenMbps: number;
      }[];
      calibrationPuzzle: { id: string; prompt: string } | null;
    })
  | (FlightTickBase & {
      role: 'DIRECTOR';
      science: {
        projectedPoints: number;
        targetPoints: number;
        progressPercent: number;
      };
      crisisDecisionAvailable: boolean;
      activeExperimentIds: string[];
    });

export interface MissionReport {
  roomId: string;
  outcome: FlightOutcome;
  score: number;
  sciencePointsEarned: number;
  dataRecoveryRatio: number;
  crisisResolved: boolean;
  rootCauses: { code: string; title: string; explanation: string }[];
  recommendations: string[];
  missionReference: MissionConfig['realNasaReference'];
  flightDurationSeconds: number;
}

export interface SocketError {
  code: string;
  message: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: {
    roomId?: string;
    playerName: string;
    difficulty: DifficultyMode;
    missionId?: string;
  }) => void;
  'room:join': (payload: { roomId: string; playerName: string }) => void;
  'room:leave': (payload: { roomId: string }) => void;
  'room:start': (payload: { roomId: string }) => void;
  'role:select': (payload: { roomId: string; role: RoleType }) => void;
  'design:propose_module': (payload: {
    roomId: string;
    moduleId: string;
    action: ModuleAction;
  }) => void;
  'design:vote': (payload: { roomId: string; voteId: string; approve: boolean }) => void;
  'mission:launch': (payload: { roomId: string }) => void;
  'flight:action': (payload: {
    roomId: string;
    actionType: FlightActionType;
    payload: Record<string, unknown>;
  }) => void;
}

export interface ServerToClientEvents {
  'room:state_update': (state: RoomState) => void;
  'flight:tick_asym': (payload: AsymmetricFlightPayload) => void;
  'flight:crisis_alert': (alert: FlightCrisisAlert) => void;
  'mission:report_ready': (report: MissionReport) => void;
  'design:advisor_feedback': (messages: string[]) => void;
  'server:error': (error: SocketError) => void;
}
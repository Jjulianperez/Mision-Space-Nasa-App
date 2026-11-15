/**
 * Datos demo de la mesa de diseño.
 *
 * Todo vive en el cliente: no hay llamadas al backend ni conexión Socket.io.
 * Los tipos base (`MissionConfig`, `ModuleItem`) vienen de shared/types.ts
 * y aquí sólo se extienden con campos visuales o de simulación local.
 */

export type ModuleCategory = 'SCI' | 'COM' | 'EST';

export type TeamRole = 'CIENCIA' | 'NAVE' | 'ORBITA' | 'RECURSOS';
export type CatalogTab = 'ciencia' | 'nave' | 'orbita';
export type OrbitType = 'LEO' | 'SSO' | 'LUNAR' | 'DEEP_SPACE';
export type RoleStatus = 'LISTO' | 'REVISION';
export type OrbitCompatibilityStatus = 'COMPATIBLE' | 'PARCIAL' | 'INCOMPATIBLE';
export type DesignStatus = 'NOMINAL' | 'ALERTA' | 'CRITICO';
export type OrbitCompatibility = OrbitCompatibilityStatus;

export interface DesignWarning {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  resource?: string;
  title: string;
  detail: string;
}

export interface DesignMetrics {
  // Base platform
  baseMassKg: number;
  moduleMassKg: number;
  orbitMassPenaltyKg: number;
  massLimitKg: number;
  totalMassKg: number;
  massPercentage: number;
  massMarginKg: number;

  // Budget
  baseCostMillions: number;
  launcherCostMillions: number;
  moduleCostMillions: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetTotal: number;
  budgetPercentage: number;

  // Power
  powerGeneratedKw: number;
  powerConsumedKw: number;
  powerRatio: number;
  powerMarginKw: number;
  propulsiveEfficiency: number;

  // Data
  totalDataGenerated: number;
  totalDownlinkCapacity: number;
  dataUtilization: number;
  dataMarginMbps: number;
  downlinkCoverage: number;
  requiredDownlinkRatio: number;

  // Science
  scienceRaw: number;
  projectedSciencePoints: number;
  sciencePercentage: number;
  targetSciencePoints: number;
  scienceSlotsUsed: number;
  structuralRisk: number;
  estimatedLifeYears: number;
  requiredLifeYears: number;
  lifePercentage: number;
  scienceEfficiency: number;

  // Comms
  commsBand: string;

  // Orbit & Launcher
  orbit: OrbitOption;
  launcher: LauncherOption;

  // Selected modules (added for UI compatibility)
  selectedModules: DemoModule[];

  // Warnings
  warnings: DesignWarning[];
  warningCount: number;
  status: DesignStatus;
}

export type ModuleGlyph =
  | 'ir'
  | 'radar'
  | 'uv'
  | 'lidar'
  | 'mag'
  | 'solar'
  | 'bandX'
  | 'bandKa'
  | 'bandS'
  | 'battery'
  | 'propulsion'
  | 'thermal';

export type RoleGlyph = 'science' | 'engineering' | 'orbit' | 'resources';

export interface DemoModule {
  id: string;
  name: string;
  category: 'SCI' | 'COM' | 'EST';
  allowedRole: TeamRole;
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
  tagline: string;
  glyph: ModuleGlyph;
  generationKw?: number;
  lifeBonusYears?: number;
}

export interface RoleMeta {
  id: TeamRole;
  label: string;
  owner: string;
  responsibility: string;
  glyph: RoleGlyph;
}

export interface DemoMission {
  id: string;
  code: string;
  title: string;
  objective: string;
  orbitType: OrbitType;
  budgetMillions: number;
  maxLauncherMassKg: number;
  targetSciencePoints: number;
  requiredDownlinkRatio: number;
  defaultOrbitId: string;
  defaultLauncherId: string;
  initialModuleIds: string[];
  realNasaReference: {
    missionName: string;
    summary: string;
    engineeringLesson: string;
  };
}

export interface OrbitOption {
  id: string;
  name: string;
  shortName: string;
  type: OrbitType;
  altitudeKm: number;
  altitudeLabel: string;
  inclination: string;
  description: string;
  compatibility: OrbitCompatibilityStatus;
  massPenaltyKg: number;
  powerFactor: number;
  scienceFactor: number;
  lifeDeltaYears: number;
}

export interface LauncherOption {
  id: string;
  name: string;
  maxMassKg: number;
  costMillions: number;
  description: string;
  supportsLunar: boolean;
}

export interface ProposalTemplate {
  id: string;
  action: 'ADD' | 'REMOVE';
  moduleId: string;
  proposedBy: TeamRole;
  rationale: string;
}

export const ROLE_META: Record<TeamRole, RoleMeta> = {
  CIENCIA: {
    id: 'CIENCIA',
    label: 'Ciencia',
    owner: 'Científico de Carga',
    responsibility: 'Maximiza los puntos científicos sin romper el enlace de datos.',
    glyph: 'science',
  },
  NAVE: {
    id: 'NAVE',
    label: 'Nave',
    owner: 'Ingeniero de Nave',
    responsibility: 'Garantiza energía, estructura y vida útil de la plataforma.',
    glyph: 'engineering',
  },
  ORBITA: {
    id: 'ORBITA',
    label: 'Órbita',
    owner: 'Especialista Orbital',
    responsibility: 'Alinea la órbita y el lanzador con el objetivo de la misión.',
    glyph: 'orbit',
  },
  RECURSOS: {
    id: 'RECURSOS',
    label: 'Recursos',
    owner: 'Director de Recursos',
    responsibility: 'Protege el presupuesto y libera masa o coste cuando hace falta.',
    glyph: 'resources',
  },
};

export const TEAM_ROLES: TeamRole[] = ['CIENCIA', 'NAVE', 'ORBITA', 'RECURSOS'];

export const TAB_ROLE: Record<CatalogTab, TeamRole> = {
  ciencia: 'CIENCIA',
  nave: 'NAVE',
  orbita: 'ORBITA',
};

export const ROLE_TAB: Record<TeamRole, CatalogTab> = {
  CIENCIA: 'ciencia',
  NAVE: 'nave',
  ORBITA: 'orbita',
  RECURSOS: 'nave',
};

export const DEMO_MISSION: DemoMission = {
  id: 'MDL-04',
  code: 'AURA-CL1',
  title: 'Observación climática LEO',
  objective: 'Vigilar hielo marino, nubes y ozono desde una órbita heliosíncrona.',
  orbitType: 'SSO',
  budgetMillions: 350,
  maxLauncherMassKg: 2300,
  targetSciencePoints: 100,
  requiredDownlinkRatio: 0.75,
  defaultOrbitId: 'SSO-650',
  defaultLauncherId: 'VEGA-C',
  initialModuleIds: ['SCI-IR', 'SCI-SAR', 'COM-SOLAR', 'COM-X'],
  realNasaReference: {
    missionName: 'NASA PACE',
    summary:
      'PACE monitoriza océanos y atmósfera con un bus moderado y un enlace de altas prestaciones.',
    engineeringLesson:
      'El éxito no está en instalar más instrumentos, sino en cerrar masa, energía y datos sin sacrificar el objetivo científico.',
  },
};

export const BASE_PLATFORM = {
  massKg: 1000,
  costMillions: 70,
  powerConsumptionKw: 0.16,
  powerGenerationKw: 0.8,
  baseLifeYears: 4,
} as const;

export const SCIENCE_SLOTS = 3;
export const REQUIRED_LIFE_YEARS = 3;
export const REFERENCE_LIFE_YEARS = 5;
export const DEFAULT_COORDINATION = 74;

export const INITIAL_MODULE_IDS = ['SCI-IR', 'SCI-SAR', 'COM-SOLAR', 'COM-X'];
export const INITIAL_ORBIT_ID = 'SSO-650';
export const INITIAL_LAUNCHER_ID = 'VEGA-C';

export const DEMO_MODULES: DemoModule[] = [
  // SCI modules
  {
    id: 'SCI-IR',
    name: 'Espectrómetro IR',
    category: 'SCI',
    allowedRole: 'CIENCIA',
    costMillions: 45,
    massKg: 180,
    powerKw: 0.22,
    dataGenMbps: 16,
    dataDownlinkMbps: 0,
    sciencePoints: 45,
    riskModifier: 0.1,
    slotsRequired: 1,
    apprenticeTip:
      'Combínalo con una antena de banda ancha: genera más datos que un instrumento óptico.',
    tagline: 'Mide gases de efecto invernadero y temperatura superficial.',
    glyph: 'ir',
  },
  {
    id: 'SCI-SAR',
    name: 'Radar SAR',
    category: 'SCI',
    allowedRole: 'CIENCIA',
    costMillions: 55,
    massKg: 240,
    powerKw: 0.26,
    dataGenMbps: 12,
    dataDownlinkMbps: 0,
    sciencePoints: 40,
    riskModifier: 0.25,
    slotsRequired: 1,
    apprenticeTip:
      'Su gran ventaja es observar de noche y bajo nubes; su precio es masa y consumo continuo.',
    tagline: 'Cartografía hielo marino y nivel del mar a través de nubes.',
    glyph: 'radar',
  },
  {
    id: 'SCI-UV',
    name: 'Radiómetro UV',
    category: 'SCI',
    allowedRole: 'CIENCIA',
    costMillions: 28,
    massKg: 95,
    powerKw: 0.11,
    dataGenMbps: 6,
    dataDownlinkMbps: 0,
    sciencePoints: 25,
    riskModifier: 0.05,
    slotsRequired: 1,
    apprenticeTip:
      'Instrumento ligero: útil para cerrar el objetivo científico cuando el margen es escaso.',
    tagline: 'Vigila el ozono estratosférico y la radiación ultravioleta.',
    glyph: 'uv',
  },
  // COM modules
  {
    id: 'COM-SOLAR',
    name: 'Paneles Solares GaAs',
    category: 'COM',
    allowedRole: 'NAVE',
    costMillions: 45,
    massKg: 140,
    powerKw: 0,
    dataGenMbps: 0,
    dataDownlinkMbps: 0,
    sciencePoints: 0,
    riskModifier: 0.15,
    generationKw: 0.55,
    apprenticeTip:
      'La generación extra se mide contra el consumo continuo, no contra el pico de los instrumentos.',
    tagline: 'Alta eficiencia para órbita baja con eclipses frecuentes.',
    glyph: 'solar',
  },
  {
    id: 'COM-X',
    name: 'Antena Banda X',
    category: 'COM',
    allowedRole: 'NAVE',
    costMillions: 27,
    massKg: 40,
    powerKw: 0.05,
    dataGenMbps: 0,
    dataDownlinkMbps: 40,
    sciencePoints: 0,
    riskModifier: 0.125,
    apprenticeTip:
      'Una antena sobredimensionada encarece la misión; infrautilizarla también deja margen sobre la mesa.',
    tagline: 'Enlace de alta velocidad para descarga de datos científicos.',
    glyph: 'bandX',
  },
  // EST modules
  {
    id: 'EST-BATT',
    name: 'Batería Li-ion 3 kWh',
    category: 'EST',
    allowedRole: 'NAVE',
    costMillions: 32,
    massKg: 120,
    powerKw: 0,
    dataGenMbps: 0,
    dataDownlinkMbps: 0,
    sciencePoints: 0,
    riskModifier: -0.2,
    lifeBonusYears: 0.45,
    apprenticeTip:
      'La batería no genera energía: compra tiempo durante el eclipse y mejora la vida útil.',
    tagline: 'Reserva energía para eclipses y picos de carga.',
    glyph: 'battery',
  },
];

export const ORBIT_OPTIONS: OrbitOption[] = [
  {
    id: 'SSO-650',
    name: 'Órbita Heliosíncrona 650 km',
    shortName: 'SSO · 650 km',
    type: 'SSO',
    altitudeKm: 650,
    altitudeLabel: '650 km',
    inclination: '98,2°',
    description: 'Iluminación solar constante y cobertura polar para observación climática.',
    compatibility: 'COMPATIBLE',
    massPenaltyKg: 0,
    powerFactor: 1,
    scienceFactor: 1,
    lifeDeltaYears: 0,
  },
  {
    id: 'LEO-400',
    name: 'Órbita Baja 400 km',
    shortName: 'LEO · 400 km',
    type: 'LEO',
    altitudeKm: 400,
    altitudeLabel: '400 km',
    inclination: '51,6°',
    description: 'Mayor resolución, pero eclipses frecuentes y más arrastre atmosférico.',
    compatibility: 'PARCIAL',
    massPenaltyKg: 0,
    powerFactor: 0.88,
    scienceFactor: 1.08,
    lifeDeltaYears: -0.4,
  },
];

export const DEMO_PROPOSALS: ProposalTemplate[] = [
  {
    id: 'PROP-01',
    action: 'ADD',
    moduleId: 'SCI-UV',
    proposedBy: 'CIENCIA',
    rationale: 'Cierra el objetivo científico y eleva el uso del enlace del 70% al 85%.',
  },
  {
    id: 'PROP-02',
    action: 'ADD',
    moduleId: 'EST-BATT',
    proposedBy: 'NAVE',
    rationale: 'Refuerza el margen en eclipse y eleva la vida útil por encima de 3,8 años.',
  },
  {
    id: 'PROP-03',
    action: 'ADD',
    moduleId: 'SCI-LIDAR',
    proposedBy: 'CIENCIA',
    rationale: 'Añade 35 pts de perfilado atmosférico; exige revisar el enlace de datos.',
  },
  {
    id: 'PROP-04',
    action: 'ADD',
    moduleId: 'COM-KA',
    proposedBy: 'NAVE',
    rationale: 'Duplica la capacidad de descarga para futuras campañas, con +55 kg y 38 M$.',
  },
  {
    id: 'PROP-05',
    action: 'REMOVE',
    moduleId: 'SCI-SAR',
    proposedBy: 'RECURSOS',
    rationale: 'Libera 240 kg y 55 M$; sacrifica 40 pts científicos.',
  },
];

export const LAUNCHER_OPTIONS: LauncherOption[] = [
  {
    id: 'VEGA-C',
    name: 'Vega-C',
    maxMassKg: 2300,
    costMillions: 50,
    description: 'Lanzador ligero; ideal para SSO de hasta 2,3 t.',
    supportsLunar: false,
  },
  {
    id: 'FALCON-9',
    name: 'Falcon 9',
    maxMassKg: 5500,
    costMillions: 95,
    description: 'Capacidad media; da margen para cargas pesadas y TLI.',
    supportsLunar: true,
  },
];

export const MODULES_BY_ID: Record<string, DemoModule> = Object.fromEntries(
  DEMO_MODULES.map((module) => [module.id, module]),
) as Record<string, DemoModule>;

export const ORBITS_BY_ID: Record<string, OrbitOption> = Object.fromEntries(
  ORBIT_OPTIONS.map((orbit) => [orbit.id, orbit]),
) as Record<string, OrbitOption>;

export const LAUNCHERS_BY_ID: Record<string, LauncherOption> = Object.fromEntries(
  LAUNCHER_OPTIONS.map((launcher) => [launcher.id, launcher]),
) as Record<string, LauncherOption>;

export function getModule(moduleId: string): DemoModule | undefined {
  return MODULES_BY_ID[moduleId];
}

export function getOrbit(orbitId: string): OrbitOption {
  return ORBITS_BY_ID[orbitId] ?? ORBIT_OPTIONS[0];
}

export function getLauncher(launcherId: string): LauncherOption {
  return LAUNCHERS_BY_ID[launcherId] ?? LAUNCHER_OPTIONS[0];
}
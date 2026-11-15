import {
  Activity,
  Antenna,
  BatteryCharging,
  ChartNoAxesColumn,
  FlaskConical,
  Microscope,
  Orbit,
  Radar,
  Radio,
  Rocket,
  SatelliteDish,
  ScanLine,
  Sun,
  Thermometer,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type {
  CatalogTab,
  ModuleCategory,
  ModuleGlyph,
  RoleGlyph,
  TeamRole,
  ROLE_META,
} from '../../data/demoCatalog';

export const ROLE_GLYPHS: Record<TeamRole, LucideIcon> = {
  CIENCIA: FlaskConical,
  NAVE: Wrench,
  ORBITA: Orbit,
  RECURSOS: ChartNoAxesColumn,
};

export const MODULE_GLYPHS: Record<ModuleGlyph, LucideIcon> = {
  ir: Microscope,
  radar: Radar,
  uv: Sun,
  lidar: ScanLine,
  mag: Activity,
  solar: Zap,
  bandX: SatelliteDish,
  bandKa: Antenna,
  bandS: Radio,
  battery: BatteryCharging,
  propulsion: Rocket,
  thermal: Thermometer,
};

export const ROLE_GLYPHS_ALT: Record<RoleGlyph, LucideIcon> = {
  science: FlaskConical,
  engineering: Wrench,
  orbit: Orbit,
  resources: ChartNoAxesColumn,
};

export interface TabMeta {
  id: CatalogTab;
  label: string;
  glyph: LucideIcon;
  role: TeamRole;
  hint: string;
}

export const TAB_META: Record<CatalogTab, TabMeta> = {
  ciencia: {
    id: 'ciencia',
    label: 'Ciencia',
    glyph: FlaskConical,
    role: 'CIENCIA',
    hint: 'Instrumentos y ranuras científicas',
  },
  nave: {
    id: 'nave',
    label: 'Nave',
    glyph: Wrench,
    role: 'NAVE',
    hint: 'Plataforma, energía y comunicaciones',
  },
  orbita: {
    id: 'orbita',
    label: 'Órbita',
    glyph: Orbit,
    role: 'ORBITA',
    hint: 'Órbita y vehículo lanzador',
  },
};

export const ROLE_TEXT_CLASS: Record<TeamRole, string> = {
  CIENCIA: 'text-secondary',
  NAVE: 'text-primary',
  ORBITA: 'text-accent',
  RECURSOS: 'text-success',
};

export const ROLE_BORDER_CLASS: Record<TeamRole, string> = {
  CIENCIA: 'border-secondary/50',
  NAVE: 'border-primary/50',
  ORBITA: 'border-accent/50',
  RECURSOS: 'border-success/50',
};

export const ROLE_ACTIVE_CHIP_CLASS: Record<TeamRole, string> = {
  CIENCIA: 'border-secondary/50 bg-secondary/10 text-secondary',
  NAVE: 'border-primary/50 bg-primary/10 text-primary',
  ORBITA: 'border-accent/50 bg-accent/10 text-accent',
  RECURSOS: 'border-success/50 bg-success/10 text-success',
};

export const ROLE_ICON_BOX_CLASS: Record<TeamRole, string> = {
  CIENCIA: 'border-secondary/30 bg-secondary/10 text-secondary',
  NAVE: 'border-primary/30 bg-primary/10 text-primary',
  ORBITA: 'border-accent/30 bg-accent/10 text-accent',
  RECURSOS: 'border-success/30 bg-success/10 text-success',
};

export const ROLE_BANNER_CLASS: Record<TeamRole, string> = {
  CIENCIA: 'border-secondary/30 bg-secondary/5',
  NAVE: 'border-primary/30 bg-primary/5',
  ORBITA: 'border-accent/30 bg-accent/5',
  RECURSOS: 'border-success/30 bg-success/5',
};

export const TAB_ACTIVE_CLASS: Record<CatalogTab, string> = {
  ciencia: 'border-secondary/50 bg-secondary/10 text-secondary',
  nave: 'border-primary/50 bg-primary/10 text-primary',
  orbita: 'border-accent/50 bg-accent/10 text-accent',
};

export const TAB_GLYPH_CLASS: Record<CatalogTab, string> = {
  ciencia: 'text-secondary',
  nave: 'text-primary',
  orbita: 'text-accent',
};

export const CATEGORY_LABEL: Record<ModuleCategory, string> = {
  SCI: 'Ciencia',
  COM: 'Enlace / energía',
  EST: 'Plataforma',
};

export const CATEGORY_SHORT_LABEL: Record<ModuleCategory, string> = {
  SCI: 'SCI',
  COM: 'COM',
  EST: 'EST',
};

export const CATEGORY_TEXT_CLASS: Record<ModuleCategory, string> = {
  SCI: 'text-secondary',
  COM: 'text-primary',
  EST: 'text-success',
};

export const CATEGORY_BORDER_CLASS: Record<ModuleCategory, string> = {
  SCI: 'border-secondary/40',
  COM: 'border-primary/40',
  EST: 'border-success/40',
};

export const CATEGORY_BG_CLASS: Record<ModuleCategory, string> = {
  SCI: 'bg-secondary/10',
  COM: 'bg-primary/10',
  EST: 'bg-success/10',
};

export const CATEGORY_DOT_CLASS: Record<ModuleCategory, string> = {
  SCI: 'bg-secondary',
  COM: 'bg-primary',
  EST: 'bg-success',
};

export const MODULE_ICON_BOX_CLASS: Record<ModuleCategory, string> = {
  SCI: 'border-secondary/30 bg-secondary/10 text-secondary',
  COM: 'border-primary/30 bg-primary/10 text-primary',
  EST: 'border-success/30 bg-success/10 text-success',
};

export const MODULE_SELECTED_CLASS: Record<ModuleCategory, string> = {
  SCI: 'border-secondary/70 bg-secondary/5',
  COM: 'border-primary/70 bg-primary/5',
  EST: 'border-success/70 bg-success/5',
};

export const MODULE_ACCENT_CLASS: Record<ModuleCategory, string> = {
  SCI: 'bg-secondary',
  COM: 'bg-primary',
  EST: 'bg-success',
};

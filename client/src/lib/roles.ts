import type { LucideIcon } from 'lucide-react';
import { Compass, FlaskConical, RadioTower, Wrench } from 'lucide-react';
import type { RoleType } from '@shared/types';

export interface RoleMeta {
  id: RoleType;
  label: string;
  shortLabel: string;
  responsibility: string;
  icon: LucideIcon;
}

export const ROLE_META: Record<RoleType, RoleMeta> = {
  DIRECTOR: {
    id: 'DIRECTOR',
    label: 'Director de Misión',
    shortLabel: 'Director',
    responsibility: 'Presupuesto, objetivos científicos y decisiones ejecutivas.',
    icon: Compass,
  },
  PROPULSION: {
    id: 'PROPULSION',
    label: 'Ing. de Propulsión y Nave',
    shortLabel: 'Propulsión',
    responsibility: 'Estructura, masa, combustible e integridad de la nave.',
    icon: Wrench,
  },
  SCIENCE: {
    id: 'SCIENCE',
    label: 'Especialista de Ciencia',
    shortLabel: 'Ciencia',
    responsibility: 'Instrumentos, calibración y puntos científicos.',
    icon: FlaskConical,
  },
  COMMS: {
    id: 'COMMS',
    label: 'Ing. de Comunicaciones',
    shortLabel: 'Comms',
    responsibility: 'Energía, enlace de datos y ventanas con estaciones terrestres.',
    icon: RadioTower,
  },
};

export const ROLE_ORDER: RoleType[] = ['DIRECTOR', 'PROPULSION', 'SCIENCE', 'COMMS'];

import type { FlightAct, FlightOutcome } from '@shared/types';

export const ACT_LABEL: Record<FlightAct, string> = {
  ASCENT_INSERTION: 'Ascenso e inserción',
  CRISIS: 'Crisis crítica',
  OPERATIONS: 'Operaciones finales',
};

export const OUTCOME_META: Record<
  FlightOutcome,
  { title: string; summary: string; tone: 'success' | 'warning' | 'error' }
> = {
  SUCCESS: {
    title: '¡Misión completada con éxito!',
    summary:
      'La nave completó las maniobras principales y estableció un enlace estable con la estación terrestre.',
    tone: 'success',
  },
  PARTIAL: {
    title: 'Misión completada parcialmente',
    summary:
      'La nave regresó con datos útiles, pero algunos objetivos científicos o de enlace quedaron incompletos.',
    tone: 'warning',
  },
  FAILURE: {
    title: 'Misión no completada',
    summary:
      'La misión no alcanzó los objetivos mínimos. El informe identifica las causas raíz y cómo corregirlas.',
    tone: 'error',
  },
};

export function getMissionRank(score: number): string {
  if (score >= 92) return 'A+';
  if (score >= 84) return 'A';
  if (score >= 74) return 'B';
  if (score >= 62) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

export const SCHEMA_VERSION = 1;

/**
 * @typedef {{ id: string, name: string, description: string, order: number }} Alternative
 * @typedef {{ id: string, name: string, description: string, type: 'rating' | 'numeric', weight: number, unit?: string, min?: number, max?: number, direction?: 'higher' | 'lower' }} Criterion
 * @typedef {{ alternativeId: string, criterionId: string, value: number }} Evaluation
 * @typedef {{ id: string, name: string, weights: Record<string, number> }} Scenario
 * @typedef {{ id: string, schemaVersion: number, name: string, question: string, description: string, workflowStep?: 'details' | 'alternatives' | 'criteria' | 'weights' | 'evaluation' | 'results', createdAt: string, updatedAt: string, alternatives: Alternative[], criteria: Criterion[], evaluations: Evaluation[], scenarios: Scenario[] }} Project
 */

/** Creates a deterministic, saveable draft. The caller supplies a stable ID and ISO timestamp. */
export function createDraftProject({ id, timestamp } = {}) {
  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    name: '',
    question: '',
    description: '',
    workflowStep: 'details',
    createdAt: timestamp,
    updatedAt: timestamp,
    alternatives: [],
    criteria: [],
    evaluations: [],
    scenarios: [],
  };
}

import { evaluationProgress } from '../../domain/answers.js';
import { evaluateProject } from '../../domain/evaluation.js';
import { validateSetup } from '../../domain/setup.js';

// toFixed matches the engine's apparent-tie precision; the approved UI uses a comma.
const fixed = (value) => value.toFixed(2).replace('.', ',');

export const formatScore = fixed;
export const formatInput = (value) => String(value).replace('.', ',');
export const formatImportance = (proportion) => fixed(proportion * 100);
export const formatDifference = (value) => (value > 0 && value < 0.01 ? '< 0,01' : fixed(value));

/** Presentation data comes from the current project and the existing 10A engine. */
export function prepareResults(project) {
  const setup = validateSetup(project);
  if (!setup.ok) return { kind: 'setup', errors: setup.errors };
  const progress = evaluationProgress(project);
  if (progress.remaining) return { kind: 'missing', progress };
  const computed = evaluateProject(project);
  if (!computed.ok) return { kind: 'invalid', errors: computed.errors };

  const criteria = new Map(project.criteria.map((criterion) => [criterion.id, criterion]));
  const leader = computed.value.results[0];
  const results = computed.value.results.map((result) => ({
    ...result,
    formattedScore: formatScore(result.score),
    difference: leader.score - result.score,
    contributions: result.contributions.map((contribution) => ({
      ...contribution,
      criterion: criteria.get(contribution.criterionId),
      formattedNormalized: formatScore(contribution.normalizedValue),
      formattedImportance: formatImportance(contribution.proportion),
      formattedPoints: formatScore(contribution.points),
    })),
  }));
  const leaders = results.filter(({ rank }) => rank === 1);
  const runner = results.find(({ rank }) => rank > 1) ?? null;
  const comparison =
    leaders.length === 1 && runner
      ? {
          leaderName: leaders[0].name,
          runnerName: runner.name,
          difference: leaders[0].score - runner.score,
          criteria: leaders[0].contributions.map((contribution, index) => ({
            criterionId: contribution.criterionId,
            name: contribution.criterionName,
            delta: contribution.points - runner.contributions[index].points,
          })),
        }
      : null;
  return {
    kind: 'ready',
    scenarioName: 'Escenario base',
    results,
    leaders,
    comparison,
    apparentTies: results.some(({ apparentTieWithPrevious }) => apparentTieWithPrevious),
  };
}

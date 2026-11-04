/* global structuredClone, URL, console */
// Isolated probes for audit evidence; no application or test files are changed.
import { writeFile } from 'node:fs/promises';
import { officialExampleProject } from '../../src/shared/demo/official-project.js';
import { serializeBackup, parseBackup } from '../../src/data/backup-format.js';
import { validateSetup } from '../../src/domain/setup.js';
import { compareScores, evaluateProject } from '../../src/domain/evaluation.js';
import { compareScenarios } from '../../src/domain/scenarios.js';
import { normalizeNumeric, normalizeWeights } from '../../src/domain/normalization.js';

const rejection = (project) => {
  try {
    parseBackup(serializeBackup([project]));
    return 'accepted';
  } catch (error) {
    return `${error.code}: ${error.message}`;
  }
};
const example = officialExampleProject();
const scores = evaluateProject(example).value.results.map(({ name, score }) => ({ name, score }));
const scenario = compareScenarios(example, 'cost-first').value.alternate.results.map(
  ({ name, score }) => ({ name, score }),
);
const roundTrip = parseBackup(serializeBackup([example])).projects[0];
const impossibleDate = structuredClone(example);
impossibleDate.createdAt = '2026-02-31T00:00:00.000Z';
impossibleDate.updatedAt = '2026-03-04T00:00:00.000Z';
const duplicateId = structuredClone(example);
duplicateId.criteria[1].id = duplicateId.criteria[0].id;
const brokenReference = structuredClone(example);
brokenReference.evaluations[0].alternativeId = 'missing';
const protoKey = structuredClone(example);
protoKey.scenarios[0].weights = Object.fromEntries([
  ...Object.entries(protoKey.scenarios[0].weights),
  ['__proto__', 1],
]);
const overLimit = structuredClone(example);
for (let n = 4; n <= 6; n++)
  overLimit.alternatives.push({
    id: `alternative-${n}`,
    name: `Alternativa ${n}`,
    description: '',
    order: n - 1,
  });
for (let n = 5; n <= 9; n++)
  overLimit.criteria.push({
    id: `criterion-${n}`,
    name: `Criterio ${n}`,
    description: '',
    type: 'rating',
    weight: 1,
  });
const zeroWeight = structuredClone(example);
zeroWeight.criteria[3].weight = 0;
const results = {
  officialScores: scores,
  officialScenario: scenario,
  roundTripScores: evaluateProject(roundTrip).value.results.map(({ name, score }) => ({
    name,
    score,
  })),
  invalidCalendarDate: {
    dateParseIso: new Date(impossibleDate.createdAt).toISOString(),
    backup: rejection(impossibleDate),
  },
  duplicateId: rejection(duplicateId),
  brokenReference: rejection(brokenReference),
  prototypeKey: { result: rejection(protoKey), polluted: Object.prototype.polluted ?? null },
  beyondMvp: {
    imported: rejection(overLimit),
    setupErrors: validateSetup(overLimit).errors.map(({ code }) => code),
  },
  limits: {
    ratingZero: normalizeNumeric(0, { min: 0, max: 200, direction: 'lower' }),
    ratingMax: normalizeNumeric(200, { min: 0, max: 200, direction: 'lower' }),
    zeroWeight: normalizeWeights(zeroWeight.criteria),
    zeroWeightScore: evaluateProject(zeroWeight).value.results[0].score,
    actualTie: compareScores(1.234, 1.234),
    apparentTie: compareScores(1.2341, 1.2342),
  },
};
await writeFile(new URL('./probes.json', import.meta.url), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

export { SCHEMA_VERSION, createDraftProject } from './model.js';
export { validateProject } from './validation.js';
export { normalizeRating, normalizeNumeric, normalizeWeights } from './normalization.js';
export { compareScores, evaluateProject } from './evaluation.js';
export { getEvaluation, setEvaluation, removeEvaluation, evaluationProgress } from './answers.js';
export { compareScenarios } from './scenarios.js';
export {
  createScenario,
  updateScenario,
  resetScenarioWeights,
  removeScenario,
} from './scenario-operations.js';
export {
  validateSetup,
  addAlternative,
  updateAlternative,
  removeAlternative,
  moveAlternative,
  addCriterion,
  updateCriterion,
  setCriterionType,
  removeCriterion,
  moveCriterion,
  weightProportions,
} from './setup.js';

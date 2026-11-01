import { createDraftProject } from '../../domain/model.js';

/** Canonical, reusable inputs from the approved DATOS-EJEMPLO.md. No project is stored on import. */
export function officialExampleProject() {
  const project = createDraftProject({
    id: 'official-example',
    timestamp: '2026-10-31T00:00:00.000Z',
  });
  project.name = 'Herramientas para el equipo';
  project.question = '¿Cuál conviene para coordinar un proyecto académico?';
  project.alternatives = [
    { id: 'a', name: 'Herramienta A', description: '', order: 0 },
    { id: 'b', name: 'Herramienta B', description: '', order: 1 },
    { id: 'c', name: 'Herramienta C', description: '', order: 2 },
  ];
  project.criteria = [
    { id: 'ease', name: 'Facilidad de uso', description: '', type: 'rating', weight: 3 },
    {
      id: 'cost',
      name: 'Costo mensual',
      description: '',
      type: 'numeric',
      weight: 2,
      unit: 'S/',
      min: 0,
      max: 200,
      direction: 'lower',
    },
    { id: 'integrations', name: 'Integraciones', description: '', type: 'rating', weight: 2 },
    { id: 'support', name: 'Soporte disponible', description: '', type: 'rating', weight: 1 },
  ];
  const values = { a: [4, 100, 3, 4], b: [3, 50, 4, 2], c: [4, 150, 2, 0] };
  project.evaluations = Object.entries(values).flatMap(([alternativeId, answers]) =>
    project.criteria.map((criterion, index) => ({
      alternativeId,
      criterionId: criterion.id,
      value: answers[index],
    })),
  );
  project.scenarios = [
    {
      id: 'cost-first',
      name: 'Costo prioritario',
      weights: { ease: 1, cost: 4, integrations: 2, support: 1 },
    },
  ];
  return project;
}

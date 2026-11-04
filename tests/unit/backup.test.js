import { describe, expect, it } from 'vitest';
import { createDraftProject } from '../../src/domain/model.js';
import {
  parseBackup,
  planImport,
  prepareBackupBatches,
  serializeBackup,
  MAX_BACKUP_BYTES,
} from '../../src/data/backup-format.js';
import { evaluateProject } from '../../src/domain/evaluation.js';
import { compareScenarios } from '../../src/domain/scenarios.js';
import { officialExample } from '../fixtures/official-example.js';

const draft = () => createDraftProject({ id: 'draft', timestamp: '2026-11-04T00:00:00.000Z' });
const backup = (projects) => serializeBackup(projects, '2026-11-04T00:00:00.000Z');
const code = (fn) => {
  try {
    fn();
    return null;
  } catch (error) {
    return error.code;
  }
};

describe('formato de respaldo', () => {
  it('serializa un proyecto y todos, conserva borradores, respuestas y escenarios sin resultados derivados', () => {
    const complete = officialExample();
    const text = backup([complete, draft()]);
    const parsed = parseBackup(text);
    expect(parsed).toMatchObject({
      application: 'DecisionLab',
      formatVersion: 1,
      exportedAt: '2026-11-04T00:00:00.000Z',
    });
    expect(parsed.projects).toEqual([complete, draft()]);
    expect(parsed.projects[0].scenarios[0].weights.cost).toBe(4);
    expect(parsed.projects[0]).not.toHaveProperty('results');
    expect(evaluateProject(parsed.projects[0]).value.results.map((item) => item.score)).toEqual([
      67.5, 66.25, 46.25,
    ]);
    expect(
      compareScenarios(parsed.projects[0], 'cost-first').value.alternate.results.map(
        (item) => item.score,
      ),
    ).toEqual([70, 60, 32.5]);
    expect(parseBackup(backup([complete])).projects).toHaveLength(1);
  });

  it('rechaza JSON, formato, esquema, tamaño y estructuras malformadas', () => {
    expect(code(() => parseBackup('{'))).toBe('invalid-json');
    const valid = JSON.parse(backup([draft()]));
    for (const [change, expected] of [
      [
        (item) => {
          item.application = 'Otra';
        },
        'application',
      ],
      [
        (item) => {
          item.formatVersion = 2;
        },
        'format-version',
      ],
      [
        (item) => {
          item.projects[0].schemaVersion = 2;
        },
        'schema-version',
      ],
      [
        (item) => {
          item.projects = {};
        },
        'project-limit',
      ],
      [
        (item) => {
          item.projects[0].extra = true;
        },
        'unexpected-field',
      ],
      [
        (item) => {
          item.projects[0].createdAt = 'ayer';
        },
        'invalid-project',
      ],
      [
        (item) => {
          item.projects[0].name = null;
        },
        'null-field',
      ],
    ]) {
      const changed = structuredClone(valid);
      change(changed);
      expect(code(() => parseBackup(JSON.stringify(changed)))).toBe(expected);
    }
    expect(code(() => parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1)))).toBe('file-too-large');
  });

  it('rechaza IDs duplicados, referencias, rangos, pesos y datos inesperados anidados', () => {
    const valid = JSON.parse(backup([officialExample()]));
    for (const [change, expected] of [
      [
        (item) => {
          item.projects.push(structuredClone(item.projects[0]));
        },
        'duplicate-project',
      ],
      [
        (item) => {
          item.projects[0].alternatives[1].id = 'a';
        },
        'invalid-project',
      ],
      [
        (item) => {
          item.projects[0].evaluations[0].criterionId = 'ghost';
        },
        'invalid-project',
      ],
      [
        (item) => {
          item.projects[0].criteria[1].max = 0;
        },
        'invalid-project',
      ],
      [
        (item) => {
          item.projects[0].scenarios[0].weights.cost = -1;
        },
        'invalid-project',
      ],
      [
        (item) => {
          item.projects[0].scenarios[0].weights.cost = null;
        },
        'null-field',
      ],
      [
        (item) => {
          item.projects[0].criteria[0].html = '<img>';
        },
        'unexpected-field',
      ],
    ]) {
      const changed = structuredClone(valid);
      change(changed);
      expect(code(() => parseBackup(JSON.stringify(changed)))).toBe(expected);
    }
  });

  it('prepara copias independientes y conserva ID libres sin alterar referencias internas', () => {
    const source = officialExample();
    const independent = planImport([source], new Set([source.id]), { idFactory: () => 'new-id' });
    expect(independent[0]).toMatchObject({ sourceId: source.id, copied: true });
    expect(independent[0].project.id).toBe('new-id');
    expect(independent[0].project.evaluations).toEqual(source.evaluations);
    expect(independent[0].project.scenarios).toEqual(source.scenarios);
    expect(source.id).toBe('official-example');
    const preserved = planImport([source, draft()], new Set([source.id]), {
      mode: 'copy-conflicts',
      idFactory: () => 'another-id',
    });
    expect(preserved.map((item) => [item.project.id, item.copied])).toEqual([
      ['another-id', true],
      ['draft', false],
    ]);
    expect(
      code(() => planImport([source], new Set([source.id]), { idFactory: () => source.id })),
    ).toBe('id-collision');
  });

  it('divide 502 proyectos en archivos válidos sin omisiones', () => {
    const projects = Array.from({ length: 502 }, (_, index) => ({
      ...draft(),
      id: `draft-${index}`,
      name: `Proyecto ${index}`,
    }));
    const batches = prepareBackupBatches(projects, '2026-11-04T00:00:00.000Z');
    expect(batches.map((batch) => batch.count)).toEqual([500, 2]);
    const restored = batches.flatMap((batch) => parseBackup(batch.json).projects);
    expect(restored.map((project) => project.id)).toEqual(projects.map((project) => project.id));
    expect(new Set(restored.map((project) => project.id)).size).toBe(502);
    expect(
      batches.every(
        (batch) => new globalThis.TextEncoder().encode(batch.json).length <= MAX_BACKUP_BYTES,
      ),
    ).toBe(true);
  });

  it('divide también por tamaño cuando hay menos de 500 proyectos', () => {
    const longText = 'x'.repeat(5000);
    const projects = Array.from({ length: 400 }, (_, index) => ({
      ...draft(),
      id: `large-${index}`,
      description: longText,
      alternatives: Array.from({ length: 5 }, (_, order) => ({
        id: `a-${order}`,
        name: `A ${order}`,
        description: longText,
        order,
      })),
      criteria: Array.from({ length: 8 }, (_, criterion) => ({
        id: `c-${criterion}`,
        name: `C ${criterion}`,
        description: longText,
        type: 'rating',
        weight: 1,
      })),
    }));
    const batches = prepareBackupBatches(projects, '2026-11-04T00:00:00.000Z');
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.reduce((sum, batch) => sum + batch.count, 0)).toBe(400);
    expect(
      batches.every(
        (batch) => new globalThis.TextEncoder().encode(batch.json).length <= MAX_BACKUP_BYTES,
      ),
    ).toBe(true);
    expect(
      batches.flatMap((batch) => parseBackup(batch.json).projects).map((project) => project.id),
    ).toEqual(projects.map((project) => project.id));
  });

  it('rechaza en la importación un proyecto que supere 5 alternativas u 8 criterios y conserva borradores pequeños', () => {
    const oversized = draft();
    oversized.name = 'Fuera de límite';
    oversized.alternatives = Array.from({ length: 6 }, (_, index) => ({
      id: `a-${index}`,
      name: `Alternativa ${index}`,
      description: '',
      order: index,
    }));
    oversized.criteria = Array.from({ length: 9 }, (_, index) => ({
      id: `c-${index}`,
      name: `Criterio ${index}`,
      description: '',
      type: 'rating',
      weight: 1,
    }));
    expect(code(() => parseBackup(backup([oversized])))).toBe('mvp-limit');
    expect(code(() => planImport([oversized], new Set()))).toBe('mvp-limit');
    expect(parseBackup(backup([draft()])).projects).toHaveLength(1);
  });

  it('rechaza fechas calendáricas imposibles en proyecto y respaldo', () => {
    const valid = JSON.parse(backup([draft()]));
    valid.projects[0].createdAt = '2026-02-31T00:00:00.000Z';
    expect(code(() => parseBackup(JSON.stringify(valid)))).toBe('invalid-project');
    valid.projects[0].createdAt = '2026-11-04T00:00:00.000Z';
    valid.exportedAt = '2026-02-31T00:00:00.000Z';
    expect(code(() => parseBackup(JSON.stringify(valid)))).toBe('invalid-date');
  });
});

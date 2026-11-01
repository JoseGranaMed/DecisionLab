# Dominio y motor de evaluación · fases 10A–10E

## Modelo de datos

El dominio usa objetos y listas de JavaScript que pueden serializarse como JSON. `src/domain/model.js` documenta los tipos con JSDoc y expone `SCHEMA_VERSION = 1` y `createDraftProject({ id, timestamp })`. El llamador proporciona el identificador estable y una fecha ISO; el dominio no depende del reloj, del DOM ni del almacenamiento.

Desde 10C, `Project` puede incluir `workflowStep`; 10D añade `evaluation` y 10E `results`. `src/domain/setup.js` contiene operaciones puras para alternativas, criterios y pesos. `src/domain/answers.js` añade operaciones puras para respuestas por par de IDs. Ambas reutilizan la validación y normalización de 10A. Las funciones del motor matemático permanecen separadas de la interfaz.

| Entidad     | Campos                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Proyecto    | `id`, `schemaVersion`, `name`, `question`, `description`, `createdAt`, `updatedAt`, `alternatives`, `criteria`, `evaluations`, `scenarios` |
| Alternativa | `id`, `name`, `description`, `order`                                                                                                       |
| Criterio    | `id`, `name`, `description`, `type`, `weight`; para `numeric`: `unit`, `min`, `max`, `direction`                                           |
| Evaluación  | `alternativeId`, `criterionId`, `value`                                                                                                    |
| Escenario   | `id`, `name`, `weights` como objeto `{ [criterionId]: número }`                                                                            |

Los criterios son `rating` o `numeric`. La dirección numérica es `higher` o `lower`. Una evaluación se identifica por el par alternativa–criterio; no se almacena la puntuación ni la clasificación. El escenario base usa `criterion.weight`. Un escenario alternativo contiene solo su identidad, nombre y pesos: conserva las mismas alternativas, criterios y respuestas.

## Fórmulas y decisiones numéricas

**Conveniencia.** El MVP acepta **enteros de 0 a 5**, inclusivos. La puntuación normalizada es `valor / 5 × 100`. Los controles de 10D ofrecen únicamente esos enteros y explican la escala. Se eligió esta convención porque las respuestas aprobadas son enteras y evita sugerir una precisión subjetiva que aún no se diseñó. Admitir fracciones después requeriría cambiar validaciones y controles, no la fórmula.

**Numérico.** Se exige `min < max`, límites finitos, una unidad y un sentido favorable. Para `higher`, `((valor − min) / (max − min)) × 100`; para `lower`, `((max − valor) / (max − min)) × 100`. Los límites son inclusivos. Un valor fuera del rango produce un error; nunca se recorta ni extrapola silenciosamente. Cada criterio se normaliza antes de combinar unidades distintas.

**Pesos.** Se aceptan números finitos y no negativos, incluido cero. La suma debe ser positiva y finita. Para el criterio `i`, `proporciónᵢ = pesoᵢ / suma(pesos)`, `aporteᵢ = normalizadoᵢ × proporciónᵢ` y `puntuación = suma(aportes)`. No se exige escribir porcentajes que sumen 100.

Las operaciones usan `Number` de JavaScript y suma compensada para reducir pérdida evitable de precisión. No se redondean aportes ni puntuaciones. La clasificación usa esos valores sin redondear. `compareScores` identifica empate real cuando las puntuaciones calculadas son exactamente iguales y marca por separado una igualdad aparente a la precisión de presentación elegida, dos decimales por defecto. Los empates comparten posición (`1, 1, 3`); diferencias visibles solo al aumentar decimales conservan posiciones distintas. En caso de puntuaciones iguales, el orden de presentación sigue `alternative.order` y luego `id`.

**Límite numérico:** `Number` representa algunos decimales de forma aproximada. Por ello, dos expresiones matemáticamente equivalentes que lleguen a representaciones binarias distintas podrían no detectarse como empate exacto. La comparación no introduce una tolerancia arbitraria que pueda convertir una diferencia real en empate. Si el producto exige equivalencia decimal exacta para entradas extremas, se deberá decidir una representación decimal o racional en otra fase. Este motor evalúa preferencias; no realiza contabilidad monetaria.

## Validación y contratos

`validateProject(project, { mode: 'draft' | 'complete' })` devuelve `{ ok, errors }`. Un borrador permite nombres, detalles de criterios y respuestas pendientes, pero requiere una estructura reconocible y rechaza valores suministrados mal formados, IDs duplicados y referencias rotas. El modo `complete` exige al menos dos alternativas, un criterio, todas las respuestas, pesos válidos con suma positiva y escenarios completos. Cada error incluye `{ path, code, message }`, por ejemplo:

```js
{
  ok: false,
  errors: [{ path: 'evaluations.a.cost', code: 'missing-evaluation', message: 'Falta evaluar Herramienta A en Costo mensual.' }]
}
```

Las funciones de `src/domain/index.js` reciben datos y devuelven `{ ok: true, value }` o `{ ok: false, errors }`:

- `createDraftProject`: crea la estructura de un borrador; el llamador asigna ID y fecha.
- `validateProject`: comprueba estructura, campos, referencias y completitud.
- `normalizeRating`, `normalizeNumeric`, `normalizeWeights`: normalizan entradas concretas sin modificar sus argumentos.
- `evaluateProject(project, { scenarioId, displayDecimals })`: devuelve pesos, resultados ordenados, posiciones y aportes. `scenarioId` omitido utiliza la base.
- `compareScores`: distingue empate exacto e igualdad aparente por presentación.
- `compareScenarios(project, scenarioId)`: devuelve resultados base y alternativos, diferencia de puntuación, cambio de posición y variación de cada aporte. Un `rankChange` positivo significa que la alternativa ascendió.

La vista de evaluación asocia errores a controles y usa el estado de aplicación para persistir en IndexedDB. La vista de resultados invoca `evaluateProject()` con el proyecto vigente y muestra `score`, `rank` y `contributions` calculados. No se guardan como datos derivados. La transformación de presentación y sus límites se documentan en `RESULTS.md`.

## Operaciones de respuestas · fase 10D

`getEvaluation(project, alternativeId, criterionId)` devuelve la respuesta existente o `null`. `setEvaluation(project, alternativeId, criterionId, value)` agrega o reemplaza una única respuesta, valida IDs y valor y devuelve un proyecto nuevo. `removeEvaluation` elimina el par sin convertir vacío en cero. `evaluationProgress` devuelve `completed`, `total`, `remaining`, progreso por alternativa y pares pendientes; solo cuenta valores válidos para referencias existentes. No almacena puntuaciones derivadas. Los campos numéricos de la interfaz convierten coma o punto decimal a número antes de llamar al dominio y rechazan separadores de miles y formas ambiguas como `1.000`.

## Ejemplo aprobado

El fixture `tests/fixtures/official-example.js` contiene exclusivamente las entradas de `DATOS-EJEMPLO.md` del prototipo aprobado. Para A, las cuatro normalizaciones son `80, 50, 60, 80`; con pesos base `3, 2, 2, 1`, las proporciones son `0,375; 0,25; 0,25; 0,125` y los aportes `30 + 12,5 + 15 + 10 = 67,5`.

| Alternativa   |  Base | Alternativo | Posición base → alternativa |
| ------------- | ----: | ----------: | --------------------------- |
| Herramienta A | 67,50 |       60,00 | 1 → 2                       |
| Herramienta B | 66,25 |       70,00 | 2 → 1                       |
| Herramienta C | 46,25 |       32,50 | 3 → 3                       |

Los pesos alternativos son `1, 4, 2, 1`; solo cambian facilidad y costo. No se encontró inconsistencia entre el conjunto aprobado y las fórmulas. Los valores de esta tabla son expectativas de pruebas, no constantes del motor.

### Ejemplo de uso

```js
import { evaluateProject, compareScenarios } from './src/domain/index.js';

const base = evaluateProject(project);
const comparison = compareScenarios(project, 'cost-first');
if (base.ok && comparison.ok) {
  // base.value.results[0].score === 67.5
  // comparison.value.changes[0].scoreDelta === -7.5
}
```

## Módulos

| Archivo            | Responsabilidad                                              |
| ------------------ | ------------------------------------------------------------ |
| `model.js`         | Tipos documentados, versión de esquema y borrador inicial.   |
| `validation.js`    | Errores estructurados para borrador y comparación completa.  |
| `normalization.js` | Escalas de conveniencia y numérica; proporciones de pesos.   |
| `evaluation.js`    | Aportes, puntuaciones, clasificación y detección de empates. |
| `answers.js`       | Alta, sustitución, eliminación y progreso de respuestas.     |
| `scenarios.js`     | Comparación de pesos alternativos y explicación de cambios.  |
| `index.js`         | API pública del dominio.                                     |

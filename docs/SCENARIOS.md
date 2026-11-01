# Escenarios (Fase 10F)

Un proyecto conserva los pesos base en sus criterios. El MVP admite un único escenario alternativo, que guarda solamente `id`, `name` y un mapa de pesos por identificador de criterio. Alternativas, criterios y respuestas se comparten. No se persisten puntuaciones ni posiciones.

La pantalla de escenarios es complementaria al asistente de seis pasos. `#/scenarios` permite elegir un proyecto; `#/project/:id/scenarios` permite crear, editar, restablecer, eliminar y comparar. Crear copia los pesos base en un escenario nuevo con ID estable. Editar nombre y pesos aplica un cambio atómico solo si todos los campos son válidos y la suma es positiva. Los valores incompletos permanecen en el formulario, separados de la última versión válida; se advierte antes de salir.

`compareScenarios()` utiliza `evaluateProject()` para ambos conjuntos de pesos. Una subida de posición indica un cambio de prioridad, no una mejora de la alternativa. Los aportes de cada criterio explican las diferencias dentro del modelo, sin predicciones. Un escenario que queda con suma cero al eliminar criterios necesita corrección, pero no bloquea la evaluación base. La validación estructural sigue aplicándose a todos los escenarios.

## Editor y persistencia

Cada criterio muestra su peso base, su proporción base, el peso alternativo editable y su proporción alternativa. `normalizeWeights()` calcula ambas proporciones. Se admiten cero y decimales con coma o punto; se rechazan valores vacíos, negativos, no finitos, separadores de miles y sumas no positivas. Ningún campo vacío se convierte en cero. Al agregar un criterio, `setup.js` añade su ID con peso alternativo cero. Al eliminarlo, retira el peso asociado. Si esa eliminación deja la suma en cero, se conserva el escenario y se pide corregirlo.

La edición válida se incorpora al estado del proyecto y sigue su guardado automático con revisión y recuperación desde IndexedDB. «Guardar ahora» permite confirmar o reintentar un fallo. Una edición inválida queda solo en el DOM; la navegación y la recarga advierten antes de descartarla. El escenario guarda únicamente `id`, `name` y `weights`. No guarda alternativas, criterios, evaluaciones, resultados, rangos ni puntuaciones.

## Interpretación

`compareScenarios()` devuelve la puntuación y posición en ambos escenarios, diferencia de puntuación y aportes por criterio. La pantalla presenta barras con escala fija 0–100 y cifras, por lo que no depende solo del color. «Sube», «Baja» y «Mantiene su posición» describen el orden relativo dentro del modelo. Los empates reales comparten puesto; los aparentes se advierten cuando dos cifras redondeadas parecen iguales. Las contribuciones se consultan por alternativa. Los cálculos usan las respuestas completas y los pesos vigentes, sin duplicar fórmulas en la vista.

El ejemplo oficial usa pesos base `3, 2, 2, 1` y alternativos `1, 4, 2, 1`. El motor produce A `67,50 → 60,00` (puesto `1 → 2`), B `66,25 → 70,00` (`2 → 1`) y C `46,25 → 32,50` (`3 → 3`). Estas cifras son expectativas de prueba, no valores incluidos en la interfaz.

## Límites del MVP

Solo hay un escenario alternativo por proyecto. No se simulan cambios de respuestas, alternativas, criterios o rangos; para eso se edita el proyecto original. No hay predicción ni consejo objetivo. No se incluyen intercambio de archivos, informes, sincronización ni backend.

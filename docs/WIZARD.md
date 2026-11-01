# Asistente · fases 10E–10F

Los seis pasos funcionales son datos generales, alternativas, criterios, pesos, evaluación y resultados. Cada paso tiene URL propia y `workflowStep` recuerda el último abierto. Los dos últimos usan `#/project/:id/evaluation` y `#/project/:id/results`.

## Datos y validación

- Alternativas: se pueden guardar borradores con cero o una. Se necesitan entre dos y cinco para estar listo para evaluación. Nombres y descripciones son editables; subir o bajar cambia `order` sin modificar el ID.
- Criterios: se pueden guardar borradores con menos de dos. El límite del MVP es ocho. El orden es la posición en `criteria`; reordenar conserva cada ID. La valoración de conveniencia usa la escala entera 0–5 definida en el dominio. El tipo numérico pide unidad, mínimo, máximo y sentido favorable. Se usa `validateProject` para rechazar rangos inválidos y otros datos mal formados.
- Pesos: aceptan cero y otros números no negativos. La proporción visible se calcula con `normalizeWeights` del dominio, sin alterar los pesos introducidos. Una suma cero permite guardar el borrador, pero impide estar listo para evaluación.
- `validateSetup` aplica la validación completa pertinente a la configuración, sin exigir todavía respuestas de evaluación. Los valores incompletos del borrador son válidos para almacenamiento.
- Evaluación: solo se abre cuando `validateSetup` confirma nombre, pregunta, de dos a cinco alternativas, de dos a ocho criterios bien configurados y pesos con suma positiva. Si falta algo, el paso conserva el borrador y muestra enlaces de corrección. Las respuestas vacías quedan pendientes; el progreso se calcula con `evaluationProgress`. Ver `EVALUATION.md`.
- Resultados: exige configuración y todas las respuestas válidas. Un proyecto incompleto conserva sus datos y muestra las acciones de corrección. Uno completo invoca `evaluateProject()` al entrar; después de editar, regresar al paso recalcula desde el proyecto actual. Ver `RESULTS.md`.

## Edición y persistencia

Las operaciones puras de `src/domain/setup.js` devuelven un proyecto nuevo o errores estructurados. La vista entrega cambios a `project-state.js`, que guarda a través del repositorio IndexedDB existente. No se crea otro almacén ni un motor matemático paralelo. Los campos inválidos muestran el error junto al control y conservan lo escrito hasta corregirse; cambiar de paso exige decidir si se descarta ese valor local.

Al eliminar una alternativa se eliminan sus evaluaciones. Al eliminar un criterio se eliminan sus evaluaciones y sus pesos en escenarios. Un criterio nuevo recibe peso cero en los escenarios existentes. Cambiar el tipo de un criterio limpia sus evaluaciones y reinicia la configuración numérica; la interfaz consulta la versión vigente del criterio y enumera los datos que se perderán antes de pedir confirmación. Al cancelar, restaura el selector sin cambiar ni guardar el criterio. Estas operaciones no alteran los otros IDs ni pesos.

Un peso vacío puede guardarse en un borrador, pero el resumen pide completarlo y oculta las proporciones hasta entonces. La suma cero pide al menos un peso positivo. Los valores inválidos muestran el error estructurado del dominio junto al campo y en el resumen, sin reemplazar el valor persistido.

## Alcance pendiente

Los escenarios interactivos se abren desde Resultados o la navegación general, fuera de los seis pasos. Ver `SCENARIOS.md`. Siguen pendientes importación, exportación e informes.

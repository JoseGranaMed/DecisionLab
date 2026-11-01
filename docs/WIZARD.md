# Asistente de configuración · fase 10C

Los pasos funcionales son datos generales, alternativas, criterios y pesos. El indicador conserva seis pasos para la secuencia futura; no hay entrada de evaluaciones ni resultados activos. Cada paso tiene URL propia y `workflowStep` recuerda el último abierto.

## Datos y validación

- Alternativas: se pueden guardar borradores con cero o una. Se necesitan entre dos y cinco para estar listo para evaluación. Nombres y descripciones son editables; subir o bajar cambia `order` sin modificar el ID.
- Criterios: se pueden guardar borradores con menos de dos. El límite del MVP es ocho. El orden es la posición en `criteria`; reordenar conserva cada ID. La valoración de conveniencia usa la escala entera 0–5 definida en el dominio. El tipo numérico pide unidad, mínimo, máximo y sentido favorable. Se usa `validateProject` para rechazar rangos inválidos y otros datos mal formados.
- Pesos: aceptan cero y otros números no negativos. La proporción visible se calcula con `normalizeWeights` del dominio, sin alterar los pesos introducidos. Una suma cero permite guardar el borrador, pero impide estar listo para evaluación.
- `validateSetup` aplica la validación completa pertinente a la configuración, sin exigir todavía respuestas de evaluación. Los valores incompletos del borrador son válidos para almacenamiento.

## Edición y persistencia

Las operaciones puras de `src/domain/setup.js` devuelven un proyecto nuevo o errores estructurados. La vista entrega cambios a `project-state.js`, que guarda a través del repositorio IndexedDB existente. No se crea otro almacén ni un motor matemático paralelo. Los campos inválidos muestran el error junto al control y conservan lo escrito hasta corregirse; cambiar de paso exige decidir si se descarta ese valor local.

Al eliminar una alternativa se eliminan sus evaluaciones. Al eliminar un criterio se eliminan sus evaluaciones y sus pesos en escenarios. Un criterio nuevo recibe peso cero en los escenarios existentes. Cambiar el tipo de un criterio limpia sus evaluaciones y reinicia la configuración numérica; la interfaz consulta la versión vigente del criterio y enumera los datos que se perderán antes de pedir confirmación. Al cancelar, restaura el selector sin cambiar ni guardar el criterio. Estas operaciones no alteran los otros IDs ni pesos.

Un peso vacío puede guardarse en un borrador, pero el resumen pide completarlo y oculta las proporciones hasta entonces. La suma cero pide al menos un peso positivo. Los valores inválidos muestran el error estructurado del dominio junto al campo y en el resumen, sin reemplazar el valor persistido.

## Alcance pendiente

La fase 10D podrá conectar las respuestas individuales con el motor existente. Esta fase no muestra clasificaciones calculadas, gráficos, escenarios interactivos, importación/exportación ni informes.

# Evaluación interactiva · fase 10D

Antes de implementar: se conserva el modelo `evaluations: [{ alternativeId, criterionId, value }]`, la validación de `src/domain/validation.js`, el motor `evaluateProject()` y el repositorio IndexedDB. Las operaciones nuevas serán puras y usarán IDs; la vista entregará proyectos nuevos a `project-state.js` para el guardado automático.

El quinto paso usará `#/project/:id/evaluation` y `workflowStep: 'evaluation'`. La ruta pertenece al router existente. El sexto paso de resultados sigue pendiente y no presentará puntuaciones calculadas en pantalla.

La evaluación se habilitará cuando `validateSetup()` acepte la configuración. Un proyecto incompleto conservará sus datos y mostrará los errores de configuración con enlaces a los pasos pertinentes. Las respuestas vacías no se guardarán como cero.

En escritorio se usará una matriz con desplazamiento horizontal interno para conservar tamaño de texto y campos legibles hasta cinco alternativas y ocho criterios. En móvil se agruparán los campos por alternativa. Ambos diseños mostrarán los mismos datos del proyecto; la lógica de guardado y validación será única y mantendrá sincronizadas las vistas.

Para números decimales se acepta una coma **o** un punto como separador decimal, sin separadores de miles. El valor persistido es un número de JavaScript. La expresión `1.000` se rechaza por ambigua, al igual que cualquier expresión con ambos separadores; para un decimal de tres dígitos se puede escribir `0.125`. Esta regla conservadora evita interpretar mil como uno. Una entrada incompleta o inválida permanece visible en el formulario, con error cercano, sin contaminar IndexedDB. La navegación advierte antes de descartarla.

## Implementación

- `src/domain/answers.js`: `getEvaluation`, `setEvaluation`, `removeEvaluation` y `evaluationProgress`. La operación de escritura sustituye un par existente en lugar de duplicarlo, conserva otros pares y devuelve un proyecto nuevo. Validación de IDs y valores mediante módulos de 10A.
- `src/features/evaluation/evaluation.js`: puerta de configuración, matriz de escritorio, agrupación móvil, controles y progreso. Los nombres de usuario se insertan con `textContent`. Cada control tiene nombre accesible con alternativa y criterio; la matriz tiene región enfocables para desplazamiento horizontal.
- `src/features/evaluation/evaluation.css`: disposición responsive y errores próximos al control. A 700 px o menos se muestran grupos por alternativa; en tamaños mayores la matriz desplaza sus columnas dentro de la región.
- `src/app/main.js` y `router.js`: ruta del quinto paso, recuperación tras recarga y advertencia al intentar salir con texto inválido sin guardar. El guardado válido usa `project-state.js`.

La vista mantiene una representación de escritorio y otra móvil de cada par, sincronizadas al editar. Solo la representación visible participa en la navegación por teclado. El progreso visible trata una edición inválida sobre una respuesta previamente guardada como pendiente hasta que se corrija o se descarte. Si se cierra la pestaña con una entrada inválida, el navegador también solicita confirmación.

## Límites

La vista de resultados sigue pendiente; las puntuaciones del ejemplo se comprueban internamente con `evaluateProject()` en pruebas y no se muestran como resultados funcionales. No se ha realizado una auditoría WCAG 2.2 AA completa.

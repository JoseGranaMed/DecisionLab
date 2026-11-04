# Arquitectura frontend · fases 9A–10G

## Decisiones aplicadas

1. **Dos entradas HTML.** Vite procesa `index.html` y `app/index.html`. La landing puede cargarse sin el código del espacio de trabajo. La opción `base: './'` mantiene rutas relativas en un despliegue estático bajo una subcarpeta.
2. **Rutas dentro de la aplicación.** Se usa `#/ruta` en `app/index.html`. Esta decisión evita depender de reglas de reescritura del servidor para recarga, enlaces directos y atrás/adelante. Una ruta desconocida muestra una vista explícita de error.
3. **Separación por responsabilidad.** `app` contiene inicialización y navegación; `features` contiene vistas; `shared/components` contiene piezas reutilizables; `styles` contiene tokens y reglas comunes. Los datos aprobados del ejemplo están en `shared/demo`; las puntuaciones de proyectos reales se calculan por el dominio.
4. **Diseño aprobado.** Se trasladaron la paleta, tipografía, marca, hero analítico, cierre editorial, sidebar y navegación móvil. Los estilos están divididos entre base, landing, shell y vistas, sin copiar la hoja completa del prototipo.
5. **Estado transitorio.** El sidebar y el menú móvil viven solo en memoria. No se crea almacenamiento para simular una función aún inexistente.
6. **Recursos.** Los iconos y el símbolo de marca se generan como SVG en componentes de `src`, para que Vite los incluya en el código importado. `public/` se reservará para archivos estáticos que deban conservar su URL sin importación; no se creó una carpeta vacía.
7. **Dominio aislado.** `src/domain` contiene modelo, validación, operaciones de configuración, normalización, evaluación y escenarios. Sus funciones son puras respecto del proyecto recibido y devuelven resultados o errores estructurados. La vista de resultados invoca `evaluateProject()` y consume sus puntuaciones, posiciones y aportes sin duplicar el motor.
8. **Persistencia local.** `src/data` contiene la conexión IndexedDB y el repositorio. `src/app/project-state.js` coordina el proyecto activo, la revisión y el guardado automático; la interfaz no abre transacciones. Las vistas de proyectos y dashboard usan registros reales. La ruta por fragmento `#/project/:id` conserva recarga y enlaces directos.
9. **Asistente.** `src/features/wizard` implementa datos generales, alternativas, criterios y pesos; `src/features/evaluation` y `src/features/results` implementan los pasos quinto y sexto. Las rutas `#/project/:id/:step` guardan `workflowStep`; la ruta sin paso reanuda el último paso guardado. `#/results` lista proyectos guardados, sin crear un ejemplo.
10. **Integridad.** `src/domain/setup.js` aplica límites del MVP, conserva IDs al editar o reordenar y limpia evaluaciones y pesos de escenarios al eliminar referencias. La interfaz confirma pérdidas asociadas. Los valores inválidos permanecen en el formulario hasta corregirse y no se escriben al repositorio.
11. **Respuestas.** `src/domain/answers.js` registra, reemplaza, elimina y cuenta respuestas sin mutar el proyecto recibido. Reutiliza normalización y validación de 10A. La vista usa `project-state.js`; nunca abre IndexedDB. `validateSetup()` permite guardar borradores y bloquea únicamente el inicio de la evaluación si la configuración no está lista. Una entrada inválida permanece en el DOM y activa la advertencia de navegación.
12. **Resultados derivados.** `src/features/results/presentation.js` comprueba preparación y completitud, invoca el motor existente y transforma su salida para presentación. `results.js` crea el DOM con `textContent`; `results.css` resuelve clasificación, barras y desglose responsive. No se guardan puntuaciones ni se crea otra fuente de verdad. Las vistas ilustrativas globales de resultados y evaluación se retiraron o sustituyeron por selección de proyectos.
13. **Escenarios interactivos.** `src/domain/scenario-operations.js` crea, edita, restablece y elimina un único escenario alternativo sin mutar la base. `src/features/scenarios` conserva entradas temporalmente inválidas solo en el formulario y llama a `project-state.js` cuando el conjunto es válido. La ruta complementaria `#/project/:id/scenarios` no altera `workflowStep`. La ruta global permite elegir un proyecto y sustituye la vista ilustrativa. La comparación usa `compareScenarios()` y no persiste resultados derivados.
14. **Validación de base.** El modo completo estricto sigue exigiendo escenarios alternativos calculables. `scenarioMode: 'base'` omite únicamente sus requisitos de completitud y conserva las comprobaciones estructurales, para que un escenario con suma cero tras eliminar un criterio no bloquee los resultados base.
15. **Respaldos.** `data/backup-format.js` define el contenedor versionado, valida cada campo y prepara las copias. `features/transfer/transfer-service.js` lee archivos y descarga JSON con APIs nativas. `features/transfer/transfer.js` gestiona vista previa, confirmación y mensajes, sin abrir IndexedDB. `project-repository.js` importa todos los proyectos en una única transacción; `indexeddb.js` aborta la transacción al fallar cualquiera de sus peticiones. La versión de base y del proyecto continúan en 1.
16. **Informe derivado.** `features/report/presentation.js` reutiliza `prepareResults()`, `normalizeWeights()` y `compareScenarios()`. `report.js` compone el documento con APIs seguras del DOM y `report.css` separa pantalla e impresión A4. La ruta del informe no altera `workflowStep`. Los resultados no se persisten ni se mantienen como una segunda fuente de verdad.

## Estructura objetivo a incorporar por fases

`src/domain` y `src/data` incorporan el modelo, motor de evaluación, repositorio IndexedDB y formato de respaldo. Configuración, captura de evaluaciones, resultados base, escenarios, intercambio de archivos e informe tienen interfaz. No se añadió backend ni dependencia nueva.

## Contratos previstos

- Las vistas usan `project-state.js`; no acceden directamente a IndexedDB.
- Los módulos de dominio recibirán datos planos y devolverán resultados o errores explícitos, sin depender del DOM.
- La capa de datos conserva el contrato de repositorio de la fase 10B.
- Un borrador podrá guardarse aunque no esté completo; calcular resultados requerirá validación completa.
- El contenido proveniente del usuario se insertará mediante APIs seguras del DOM, no mediante plantillas HTML sin escape. Las plantillas actuales contienen únicamente cadenas estáticas del proyecto.

## Verificación de esta iteración

Los resultados de la preparación visual y técnica están en `VERIFICATION.md` y `screenshots/`. Las fórmulas y pruebas del dominio se documentan en `DOMAIN.md` y `VERIFICATION-10A.md`. La persistencia se describe en `PERSISTENCE.md`. El asistente, evaluación, resultados y escenarios se documentan en `WIZARD.md`, `EVALUATION.md`, `RESULTS.md` y `SCENARIOS.md`. El intercambio y el informe se documentan en `TRANSFER.md`, `REPORT.md` y `VERIFICATION-10G.md`.

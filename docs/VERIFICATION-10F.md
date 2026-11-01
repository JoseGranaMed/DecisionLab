# Verificación de la fase 10F

## Estado funcional

La ruta `#/scenarios` selecciona proyectos guardados. `#/project/:id/scenarios` crea o edita un único escenario alternativo, compara puntuaciones y posiciones, muestra variaciones de aportes, restablece pesos y elimina el escenario. Es una vista complementaria: el asistente conserva seis pasos y `workflowStep` no cambia al abrirla. Desde Resultados se accede con «Comparar escenarios». El ejemplo oficial ya trae su escenario; la vista no genera otro al abrirse.

La edición válida usa `project-state.js` y el repositorio IndexedDB. Una entrada incompleta permanece en el formulario, con error junto al campo y advertencia al salir; no sustituye la última versión válida. Un fallo de escritura muestra el estado y permite reintentar. Las puntuaciones, posiciones y aportes proceden de `compareScenarios()` y no se guardan. La validación base tolera un escenario con suma cero tras eliminar criterios, manteniendo comprobaciones de estructura y referencias; la comparación alternativa pide corregirlo.

## Comandos y resultados

| Comando                     | Resultado                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run check`             | Correcto: ESLint, Prettier, 41 pruebas Vitest y compilación Vite de las dos entradas HTML. |
| `npm run test:smoke`        | Correcto: 4 pruebas de shell y rutas.                                                      |
| `npm run test:e2e`          | Correcto: 87 pruebas Playwright en el estado final, incluidas las regresiones previas.     |
| `npm run capture:scenarios` | Correcto: capturas reales con Chrome en escritorio, móvil y 320 px.                        |

Las pruebas de 10F cubren creación, límite de un escenario, nombre, pesos, cero, vacío, negativos, suma cero, actualización atómica, restablecimiento, eliminación, inmutabilidad de la base, cálculo oficial, cambios de puesto, empates reales, aportes, cambios de criterios, guardado y recarga, fallo de IndexedDB, advertencia al salir, texto seguro, navegación móvil por teclado y ausencia de desbordamiento a 320, 375, 390, 768, 1024 y 1440 px. A 320 px se comprobó además texto ampliado al 200 %.

| Alternativa   |  Base | Alternativo | Posición |
| ------------- | ----: | ----------: | -------- |
| Herramienta A | 67,50 |       60,00 | 1 → 2    |
| Herramienta B | 66,25 |       70,00 | 2 → 1    |
| Herramienta C | 46,25 |       32,50 | 3 → 3    |

Estas cifras son expectativas de prueba del ejemplo oficial; la pantalla consulta el motor.

## Defectos detectados y corregidos

- La validación completa de todos los escenarios bloqueaba los resultados base si el alternativo quedaba con suma cero al eliminar un criterio. Se añadió una validación de preparación base que conserva la revisión estructural y se probó la corrección posterior del escenario.
- La vista global de escenarios era una ilustración estática. Se sustituyó por una selección de proyectos reales y se retiraron estilos sin uso.
- El editor necesitaba conservar un peso temporalmente vacío sin convertirlo en cero ni guardar una configuración inválida. Se separó el borrador visible de la revisión persistible y se añadió advertencia de navegación.
- El tamaño base del texto usaba píxeles fijos. Ahora usa `rem`, manteniendo el tamaño predeterminado y permitiendo ampliación desde el navegador.

## Capturas

- `screenshots/phase-10F-comparison-desktop.png`: base y alternativo, pesos y clasificación.
- `screenshots/phase-10F-editor-desktop.png`: editor y aportes por criterio abiertos.
- `screenshots/phase-10F-rank-change-desktop.png`: cambio de clasificación.
- `screenshots/phase-10F-no-scenario-desktop.png`: estado previo a la creación.
- `screenshots/phase-10F-comparison-mobile.png` y `phase-10F-comparison-mobile-320.png`: página completa.
- `screenshots/phase-10F-comparison-viewport-mobile.png` y `phase-10F-comparison-viewport-mobile-320.png`: lectura de la comparación en viewport móvil.
- `screenshots/phase-10F-invalid-mobile-320.png`: peso vacío y error asociado.

## Límites

El MVP permite un solo escenario alternativo por proyecto. Simula preferencias sobre las mismas respuestas, criterios y rangos; no predice hechos futuros. No incluye importación, exportación, informes ni sincronización. La verificación de controles, foco, texto ampliado y contraste visual no sustituye una auditoría formal de WCAG 2.2 AA.

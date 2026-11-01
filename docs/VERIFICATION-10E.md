# Verificación de la fase 10E

## Estado funcional

El sexto paso `#/project/:id/results` recupera el proyecto vigente, comprueba `validateSetup()` y `evaluationProgress()`, e invoca `evaluateProject()` solo si está completo. La clasificación, los empates, las barras y los aportes proceden de la salida del motor de 10A. Una comparación incompleta muestra errores y enlaces de corrección; nunca una clasificación parcial o antigua. El paso se recupera por URL y `workflowStep` tras recargar.

La ruta global `#/results` lista proyectos guardados y ofrece acceso directo a sus resultados o estado incompleto, sin crear el ejemplo automáticamente. También se puede abrir Resultados desde un proyecto completo en Mis comparaciones o el resumen. La antigua vista de resultados de demostración y el progreso ficticio de evaluación global se retiraron. El ejemplo de escenarios permanece identificado como ilustrativo hasta 10F.

## Comandos y resultados

| Comando                   | Resultado                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run check`           | Correcto: ESLint, Prettier, 35 pruebas Vitest y compilación Vite de `index.html` y `app/index.html`. |
| `npm run test:smoke`      | Correcto: 4 pruebas de shell y rutas.                                                                |
| `npm run test:e2e`        | Correcto: 74 pruebas Playwright, incluidas las regresiones anteriores.                               |
| `npm run capture:results` | Correcto: 11 capturas reales de Chrome.                                                              |

Las pruebas nuevas comprueban un proyecto creado desde cero y completado en móvil, el ejemplo oficial, barras proporcionales, desglose, recarga, URL directa, edición de respuesta/peso/rango/nombre, eliminación de alternativa y criterio, estados incompletos, empates reales y aparentes, ruta global sin creación automática, texto de usuario insertado sin ejecutar HTML, navegación con teclado y texto ampliado al 200 %. Se revisó ausencia de desbordamiento horizontal a 320, 375, 390, 768, 1024 y 1440 px. Las pruebas unitarias cubren transformación de la salida del motor, importancias, aportes, puntuación cero, peso cero y el caso máximo de cinco alternativas y ocho criterios.

El ejemplo oficial produce con el motor: Herramienta A 67,50 (posición 1), B 66,25 (2) y C 46,25 (3). Los aportes de A son 30,00; 12,50; 15,00 y 10,00, que suman 67,50. Esas cifras son expectativas de prueba, no constantes de componentes.

## Errores detectados y corregidos

- El formato `Intl` de `es-PE` en este entorno usó punto decimal; la presentación aprobada usa coma. Se ajustó el formateo de dos decimales sin cambiar el cálculo ni el criterio de empate del motor.
- Con texto ampliado al 200 % en 320 px, la lista de diferencias se desbordaba. Se permitió que sus elementos se envuelvan.
- Un nombre de alternativa muy largo se desbordaba en el párrafo comparativo. Se añadió ajuste de palabras y se comprobó que el texto del usuario no se interpreta como HTML.

## Capturas

- `screenshots/phase-10E-results-desktop.png` y `phase-10E-breakdown-desktop.png`.
- `screenshots/phase-10E-results-tablet.png` y `phase-10E-breakdown-tablet.png`.
- `screenshots/phase-10E-results-mobile.png`, `phase-10E-ranking-mobile.png` y `phase-10E-breakdown-mobile.png` a 390 px.
- `screenshots/phase-10E-results-mobile-320.png`, `phase-10E-ranking-mobile-320.png` y `phase-10E-breakdown-mobile-320.png`.
- `screenshots/phase-10E-incomplete-mobile.png`.

## Límites

Los resultados son relativos a datos, rangos, criterios y pesos introducidos por el usuario. Las cifras mostradas se redondean a dos decimales; el orden usa las puntuaciones completas. La pantalla no edita ni compara escenarios de forma interactiva, no importa/exporta y no genera informes. La comprobación de etiquetas, foco, teclado, contraste visual y ampliación de texto no constituye una auditoría completa de WCAG 2.2 AA.

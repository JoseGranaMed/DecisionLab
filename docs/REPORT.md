# Informe imprimible · fase 10G

Desde los resultados de un proyecto, «Ver informe» abre `/app/#/project/:id/report`. La ruta carga el proyecto actual desde IndexedDB. Si faltan datos para calcular, presenta errores o evaluaciones pendientes y enlaces al paso correspondiente; no muestra una clasificación inventada.

Un proyecto completo muestra nombre, pregunta, descripción opcional, fecha de generación, alternativas, criterios con tipo, rango, unidad, peso e importancia, todas las respuestas utilizadas, clasificación base, barra comparativa y aportes por criterio. Cuando hay un escenario alternativo válido, muestra sus pesos, posiciones, puntuaciones y variaciones de aportes. Si el escenario existe pero es inválido, se explica el problema sin publicar resultados alternativos falsos. Si no hay escenario, se omite esa sección.

`presentation.js` reutiliza `prepareResults()` —que llama al motor `evaluateProject()`—, `normalizeWeights()` y `compareScenarios()`. El informe no implementa otra fórmula ni guarda instantáneas de resultados. Por eso, después de editar respuestas o pesos y abrir de nuevo el informe, refleja los valores actuales. Los números visibles se redondean solo al presentarlos.

El documento usa HTML semántico y CSS de impresión A4 con márgenes, saltos naturales y barras legibles en escala de grises. La navegación, los botones y el shell quedan ocultos en impresión. «Imprimir / Guardar como PDF» invoca `window.print()`: la opción PDF depende del navegador, no de un generador PDF integrado. La muestra en `screenshots/phase-10G-print-example.pdf` procede de la impresión real de Chrome y tiene tres páginas A4.

La vista en pantalla se adapta a móvil. La tabla de criterios puede desplazarse dentro de su región con teclado o tacto cuando no cabe en el ancho disponible; la página completa no se desborda horizontalmente. El texto del usuario se inserta mediante `textContent`.

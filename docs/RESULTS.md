# Resultados dinámicos · decisiones de la fase 10E

## Decisiones previas a la implementación

La ruta `#/project/:id/results` será el sexto paso del asistente. Al abrirla se recuperará el proyecto por el estado y repositorio existentes. Una función pura de presentación comprobará primero `validateSetup()` y las respuestas pendientes con `evaluationProgress()`; solo entonces invocará `evaluateProject()`. Si el motor rechaza el proyecto, se mostrará el error sin conservar una clasificación antigua.

Se reutilizarán `results[].score`, `rank`, `actualTieWithPrevious`, `apparentTieWithPrevious` y `contributions` del motor. La interfaz solo formateará cifras y derivará diferencias entre puntuaciones o entre aportes; no recalculará normalizaciones ni pesos. El orden y los empates proceden del motor, antes del redondeo de presentación. No se guardarán resultados derivados en IndexedDB.

La ruta global `#/results` muestra proyectos guardados para abrir sus resultados, con estados de proyecto incompleto. No crea el ejemplo automáticamente. La antigua vista global ilustrativa de resultados se retiró para evitar confusión. Desde 10F, «Comparar escenarios» abre una vista funcional complementaria; `#/evaluation` dirige a proyectos guardados.

La clasificación usará barras CSS de escala fija 0–100 y números visibles. El desglose se agrupará por alternativa con `details` nativo. Cada criterio mostrará el valor introducido, normalizado, peso, importancia y aporte recibidos del motor, más unidad y sentido favorable tomados de la configuración. El resumen explicará que los resultados dependen de los datos y pesos elegidos; cuando compare las primeras posiciones, las diferencias por criterio se calcularán a partir de los aportes respectivos.

El contenido del usuario se insertará mediante `textContent`, no como HTML. Se conservarán rutas, diseño, IndexedDB y motor actuales, sin dependencias nuevas.

## Lectura de los resultados

El escenario base toma el peso `criterion.weight` de cada criterio. El motor de 10A convierte una valoración de 0–5 a 0–100; para un valor numérico usa el rango y el sentido favorable configurados. Divide cada peso entre la suma positiva de pesos para obtener su **importancia**, multiplica el valor normalizado por esa proporción para obtener el **aporte** y suma los aportes para la puntuación final. Un peso cero da importancia y aporte cero, aunque la respuesta exista. Los límites numéricos son inclusivos.

La clasificación ordena puntuaciones sin redondearlas. Los empates matemáticos comparten posición; una coincidencia visible a dos decimales con puntuaciones distintas mantiene posiciones diferentes y muestra una aclaración. Las barras usan exactamente la puntuación de 0 a 100 como ancho porcentual y mantienen su etiqueta numérica. Los dos decimales son presentación: la suma de aportes mostrados puede diferir en una centésima del total mostrado porque el motor suma valores completos.

Cada desglose muestra la respuesta introducida, su normalización sobre 100, el peso original, la proporción de peso y los puntos aportados. Para criterios numéricos también muestra unidad, rango y sentido favorable. La sección de diferencia entre las primeras posiciones resta los aportes correspondientes de cada criterio; su suma es la diferencia de puntuación completa. Un aporte alto no explica por sí solo la diferencia.

## Estados y límites

Una comparación sin configuración lista muestra los errores de dominio con enlaces al paso correspondiente. Si faltan respuestas, indica cuántas y vuelve a Evaluación. Ninguno de esos estados muestra una clasificación antigua o parcial. Al regresar después de modificar respuestas, pesos, rangos, alternativas, criterios o nombres, se recupera el proyecto actual y se recalcula.

La puntuación expresa la combinación de datos, rangos y preferencias elegidos por la persona. Una valoración puede ser subjetiva; el rango y el peso cambian el significado del resultado. La pantalla describe la mayor puntuación **con la configuración actual**, sin afirmar superioridad objetiva ni causalidad fuera del modelo. La comparación interactiva de escenarios se documenta en `SCENARIOS.md`. Importación, exportación e informes quedan pendientes. No se ha realizado una auditoría WCAG 2.2 AA completa.

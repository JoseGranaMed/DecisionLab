# Verificación · fase 10G

## Alcance

Se revisó la base de 10F antes de editar: repositorio, transacciones IndexedDB, modelo y validación de proyecto, estado, resultados, escenarios, rutas y componentes. La fase añade respaldo JSON, recuperación atómica e informe imprimible sin modificar el motor matemático, `schemaVersion: 1` ni la versión 1 de IndexedDB. No se instalaron dependencias.

## Pruebas ejecutadas

| Comando                                                                             | Resultado                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                     | Aprobado con código 0 tras el último ajuste: lint, Prettier, 47 pruebas Vitest en 11 archivos y compilación de `index.html` y `app/index.html`. |
| `npm run test:smoke`                                                                | 4/4 aprobadas.                                                                                                                                  |
| `npm run test:e2e -- --workers=2 --reporter=line`                                   | 100/100 aprobadas, incluidas 13 nuevas, antes del ajuste de tabla móvil.                                                                        |
| `npm run test:e2e -- tests/e2e/transfer-report.spec.js --workers=1 --reporter=line` | 13/13 aprobadas después del ajuste móvil.                                                                                                       |
| `npm run capture:transfer-report`                                                   | Capturas reales de Chrome a 1440, 390 y 320 px para transferencia, vista previa e informe; vista de impresión y PDF de muestra.                 |

El entorno restringido bloqueó inicialmente el acceso al servidor Vite en `127.0.0.1`; Playwright se ejecutó con acceso local autorizado. Vitest perdió archivos temporales en la carpeta efímera del entorno; con `TEMP` y `TMP` en una carpeta estable se ejecutó correctamente. Estos problemas no requirieron cambios de dependencias ni del motor.

## Cobertura funcional

- Exportación individual y completa: descarga JSON UTF-8, estructura versionada y conservación de configuración, borrador, respuestas y escenario.
- Importación: JSON malformado, versiones incompatibles, campos inesperados, referencias rotas, IDs repetidos, cancelación y contenido HTML tratado como texto. La vista previa precede a la confirmación.
- Conflictos: copia independiente predeterminada o conservación de IDs libres; proyectos existentes intactos.
- Atomicidad: una falla inyectada en el segundo `add()` revierte el lote completo; el reintento funciona.
- Recuperación: importación del respaldo completo en un contexto limpio, con borrador y comparación completa; puntuaciones oficiales 67,50/66,25/46,25 y escenario 60,00/70,00/32,50 calculadas de nuevo.
- Informe: puntuaciones, aportes y escenario desde el motor, actualización tras editar, vista imprimible sin navegación y bloqueo de clasificación cuando faltan datos.
- Responsive: 320, 375, 390, 768, 1024 y 1440 px sin desbordamiento horizontal de página; control del texto al 200 %.

Las 87 pruebas E2E de fases anteriores se ejecutaron dentro de la suite completa y pasaron. Las 47 unitarias incluyen las nuevas pruebas de formato e informe y las de 10A–10F.

## Revisión visual

Se inspeccionaron capturas de transferencia, vista previa e informe móvil y el PDF de impresión real. Se corrigió el exceso de altura en las filas de la tabla de criterios móvil fijando su ancho interno, con desplazamiento horizontal dentro de una región enfocable e indicación visible. La página no se desborda. El PDF de muestra conserva tres páginas A4 legibles, sin sidebar ni botones, con barras grises y desgloses completos.

Archivos principales: `screenshots/phase-10G-transfer-desktop.png`, `phase-10G-transfer-mobile-320.png`, `phase-10G-preview-mobile-320.png`, `phase-10G-report-desktop.png`, `phase-10G-report-mobile-320.png`, `phase-10G-print-preview.png` y `phase-10G-print-example.pdf`.

## Defectos corregidos y límites

- Al fallar la segunda escritura de una importación, la primera podía persistir: `transact()` ahora aborta la transacción ante errores de trabajo.
- Tras una importación correcta, un fallo al refrescar la lista podía dejar la confirmación disponible y provocar copias adicionales: la vista previa se cierra inmediatamente y se indica que se debe recargar.
- A 320 px con texto ampliado, títulos largos podían desbordarse: se habilitó el corte de palabra en los títulos afectados.
- La tabla del informe móvil generaba filas innecesariamente altas: se compactó sin reducir la tipografía.

Límites conocidos: el respaldo es manual, sin nube ni sincronización; IndexedDB puede borrarse por acción del navegador o del usuario. La importación acepta formato 1 y esquema 1, hasta 20 MiB y 500 proyectos. No reemplaza proyectos existentes. «Guardar como PDF» depende de la impresión del navegador; la aplicación no genera PDF directamente.

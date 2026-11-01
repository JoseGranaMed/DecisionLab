# Verificación de la fase 10B

## Ejecutado

| Comando                    | Resultado                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`            | ESLint y Prettier sin errores; 18 pruebas Vitest superadas, incluidas las 16 de la base 10A; Vite compiló las entradas `index.html` y `app/index.html`. |
| `npm run test:smoke`       | 4 pruebas básicas superadas, incluidas las rutas de proyecto, nueva comparación y ejemplo.                                                              |
| `npm run test:e2e`         | 27 pruebas Playwright superadas en Chrome.                                                                                                              |
| `npm run capture:projects` | Capturas reales de landing, dashboard, lista y editor a 1440, 390 y 320 px en `docs/screenshots/`.                                                      |

Las pruebas de navegador ejercitan IndexedDB: creación, recuperación tras recarga, edición, búsqueda, ordenación, duplicación independiente, eliminación, borrador incompleto, copia explícita del ejemplo, ID inexistente, revisión obsoleta, datos inconsistentes, versión incompatible y fallo de guardado con reintento. También comprueban estado vacío, actualización del dashboard, advertencia antes de abandonar cambios no guardados, rutas, teclado, tratamiento seguro de texto del usuario y ausencia de desbordamiento horizontal en lista y editor a 320, 375, 390, 768, 1024 y 1440 px.

Las capturas se inspeccionaron. La landing conserva su composición, hero analítico, secuencia y cierre editorial. El sidebar y la barra móvil mantienen sus posiciones y estados activos. La etiqueta y el botón del proyecto reciente se ajustaron a su contenido sin cambiar el diseño base. Se compararon por SHA-256 los seis módulos de `src/domain/` con la entrega 10A: permanecen idénticos.

## Incidencias y límites

Durante una primera ejecución, dos eventos de navegación procesaban `#/new` y creaban un segundo borrador vacío. Se deduplicó el aviso de ruta; la prueba completa confirma una sola creación. También se detectó una eliminación temporal de archivos de Vitest por el aislamiento del entorno: la verificación final se ejecutó fuera de ese aislamiento y pasó. No se detectan fallos pendientes en las funcionalidades de esta fase.

Los proyectos dependen del almacenamiento del navegador y pueden perderse si se eliminan los datos del sitio. No hay sincronización ni exportación de respaldo todavía. La edición funcional de alternativas, criterios y evaluaciones, los resultados dinámicos y los escenarios interactivos quedan para fases posteriores. No se añadieron dependencias ni se modificó el motor matemático.

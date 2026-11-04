# Verificación de preparación · fase 12

Fecha: 2026-11-04. Revisión del proyecto existente sobre el commit inicial `2249fd0`, con historial conservado en `main`. Repositorio: [JoseGranaMed/DecisionLab](https://github.com/JoseGranaMed/DecisionLab). Aplicación: [GitHub Pages](https://josegranamed.github.io/DecisionLab/).

## Ejecución local

| Comprobación                                             | Resultado                                                                                                                                                                                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` con `package-lock.json`                         | Correcta; 116 paquetes instalados, sin alterar dependencias declaradas.                                                                                                                                                             |
| `npm run check`                                          | Correcta: ESLint, Prettier, 52 pruebas unitarias en 11 archivos y compilación de ambas entradas HTML.                                                                                                                               |
| `npm run test:smoke`                                     | 4 de 4 correctas.                                                                                                                                                                                                                   |
| `npm run test:e2e`                                       | 106 de 106 correctas. Incluye operaciones reales, persistencia, importación/exportación, resultados y anchos de 320, 375, 390, 768, 1024 y 1440 px.                                                                                 |
| Compilación con `DECISIONLAB_BASE=/decisionlab-preview/` | Correcta: `dist/index.html` y `dist/app/index.html`.                                                                                                                                                                                |
| `node scripts/verify-pages.mjs`                          | Correcta: landing y dashboard a 320, 390 y 1440 px sin desbordamiento; menú móvil; ejemplo → evaluación → resultados → escenarios → informe → exportación JSON → recarga. Sin recursos de la subruta fallidos ni errores de página. |
| `npm audit --omit=dev`                                   | 0 vulnerabilidades en dependencias de producción.                                                                                                                                                                                   |

El primer intento de Playwright en el entorno restringido no llegó a iniciar las pruebas por bloqueo del servidor local. La repetición con acceso al servidor local completó las 106 pruebas. El primer intento del verificador de Pages falló por un texto incorrecto en su propio selector; se corrigió y la repetición pasó.

La captura [móvil de 320 px](evidence-12/landing-320.png) y la de [escritorio de 1440 px](evidence-12/landing-1440.png) proceden de la compilación servida bajo la subruta. [Datos medidos](evidence-12/verification.json). Las capturas previas de las otras vistas siguen en `docs/screenshots/` y el README las enlaza.

## Revisión de publicación

`.gitignore` excluye `node_modules`, `dist`, resultados de pruebas, cobertura, archivos `.env*` y `*.local`. El inventario del código no encontró rutas locales absolutas tras renovar el README ni patrones evidentes de credenciales. Las fuentes externas son Inter y Manrope de Google Fonts; la búsqueda de llamadas a `fetch`, `XMLHttpRequest`, `sendBeacon` o `WebSocket` en el código de la aplicación no encontró transmisión de proyectos. El recorrido de producción se completó sin errores de recursos propios. Esto no sustituye la comprobación del sitio real tras publicarlo.

`npm audit` informa cuatro avisos moderados encadenados a `minimatch@10.2.6` dentro de ESLint y `@eslint/js`. Son herramientas de desarrollo, no dependencias del sitio compilado. La corrección automática ofrecida por npm baja ESLint a la rama mayor 9; no se cambió esa herramienta durante la preparación. Conviene revisar la actualización compatible cuando esté disponible.

La [primera ejecución de Actions](https://github.com/JoseGranaMed/DecisionLab/actions/runs/41932243463) pasó 104 de 106 pruebas de navegador y falló por dos esperas frágiles en pruebas. Se corrigieron sin modificar funcionalidades. La [segunda ejecución](https://github.com/JoseGranaMed/DecisionLab/actions/runs/41933322815) pasó las 106 pruebas, la compilación bajo subruta y el despliegue en Pages.

En la URL pública, landing y dashboard no desbordaron a 320, 390 ni 1440 px; el menú móvil funcionó. Se recorrió el ejemplo con tres alternativas y cuatro criterios: evaluación, resultados (A 67,50), escenarios (B 70,00), informe, exportación JSON y recarga con datos persistidos. Las dos entradas HTML respondieron HTTP 200 y no hubo errores de recursos propios. Chrome cargó las fuentes de Google; el antivirus local añadió solicitudes a `gc.kis.v2.scr.kaspersky-labs.com`, ajenas al código de DecisionLab. El titular confirmó «Jose Granados» para la licencia MIT.

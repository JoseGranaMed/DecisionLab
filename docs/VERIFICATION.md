# Verificación de la fase 9A

## Entorno y dependencias

- Node.js 24.11.1 y npm 11.7.0.
- Dependencias de desarrollo instaladas con `npm install --ignore-scripts --no-audit --no-fund` tras autorización expresa. El archivo `package-lock.json` fija el árbol instalado.
- Vite 8.3.5, ESLint 10.14.0, @eslint/js 10.0.1, Prettier 3.9.10, Vitest 5.0.0 y Playwright 1.64.1. No se añadió framework de interfaz.
- Repositorio Git inicializado en la rama `main`, sin commit.

## Comprobaciones ejecutadas

- `npm run check`: ESLint y Prettier sin errores; Vitest: 1 prueba superada; Vite compiló `dist/index.html` y `dist/app/index.html` y sus recursos.
- `npm run test:smoke`: 4 pruebas de rutas y renderizado básico superadas.
- `npm run test:e2e`: 9 pruebas superadas en Chrome sobre el servidor de desarrollo de Vite. Se comprobaron 320, 375, 390, 768, 1024 y 1440 px sin desbordamiento horizontal en landing y dashboard; navegación con mouse, recarga, historial, ruta inexistente y menú móvil con teclado y Escape. También se comprobó la carga de estilos y recursos locales y la ausencia de errores de JavaScript.
- `npm run capture`: capturas reales de landing y dashboard a 1440, 390 y 320 px en `screenshots/`. Las capturas móviles del dashboard incluyen el primer tramo y el contenido inferior.

## Revisión visual

Las capturas de escritorio y móvil se inspeccionaron. Se corrigieron dos enlaces que se partían en móvil: el botón “Ver evaluación” y “Ver todos”. La landing conserva el hero editorial, la vista analítica integrada, la secuencia numerada y el cierre de almacenamiento aprobados. A 320 px los datos principales siguen legibles sin reducir la tipografía para forzarlos en una fila.

## Límites y problemas pendientes

Las vistas de negocio siguen marcadas como demostración. No hay cálculo, guardado, edición, importación, exportación ni informes. No se detectaron bloqueos en compilación o navegación. Las capturas cubren 320, 390 y 1440 px; los otros tres anchos fueron comprobados mediante navegador y pruebas automáticas, sin capturas archivadas.

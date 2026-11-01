# DecisionLab

Aplicación frontend para comparar alternativas mediante criterios y pesos. Permite crear, buscar, editar, duplicar, eliminar y recuperar proyectos mediante IndexedDB. El asistente ya registra alternativas, criterios y pesos en proyectos reales. Las pantallas de evaluación y resultados aún son ilustrativas.

## Tecnologías

HTML5, CSS3, JavaScript ES Modules y Vite. ESLint, Prettier, Vitest y Playwright quedan configurados como herramientas de calidad. No se usa framework de interfaz ni backend.

## Requisitos e instalación

- Node.js 24 o superior y npm.
- Google Chrome instalado para las pruebas de Playwright configuradas con `channel: 'chrome'`.

```powershell
cd C:\Users\user\Documents\Codex\2026-10-31\tmb-te-doy-la-ruta-por-4\outputs\DecisionLab
npm install
npm run dev
```

La landing se abre en la dirección indicada por Vite (normalmente `http://127.0.0.1:5173/`). La aplicación está en `/app/`. Sus vistas usan rutas de fragmento como `/app/#/dashboard`, para permitir recarga y alojamiento estático sin reglas de servidor.

## Compilación y verificaciones

```powershell
npm run build
npm run preview
npm run check
npm run test:e2e
npm run capture
npm run capture:projects
npm run capture:wizard
```

`npm run check` ejecuta ESLint, Prettier, Vitest y la compilación. `npm run test:smoke` comprueba las rutas con Node. Playwright inicia el servidor de Vite y comprueba seis anchos, navegación, recarga, historial y menú móvil. `npm run capture` guarda capturas de escritorio y móvil en `docs/screenshots/`.

## Estructura actual

- `index.html` y `app/index.html`: entradas de landing y aplicación.
- `src/landing`: composición y estilos exclusivos de la landing.
- `src/app`: arranque, rutas, estado de navegación y layout del espacio de trabajo.
- `src/features/dashboard`: primera vista del espacio de trabajo.
- `src/features/demo`: vistas de navegación aún sin funcionalidad de negocio.
- `src/domain`: modelo, validación, normalización, evaluación y escenarios. Consulta `docs/DOMAIN.md`.
- `src/data`: conexión IndexedDB y repositorio de proyectos. Consulta `docs/PERSISTENCE.md`.
- `src/app/project-state.js`: proyecto activo, guardado automático y recuperación de errores.
- `src/features/projects`: lista, búsqueda y editor de datos generales.
- `src/features/wizard`: pasos de alternativas, criterios y pesos, con progreso y navegación.
- `src/shared/components`: marca, iconos y shell reutilizables.
- `src/shared/demo`: datos estáticos del ejemplo aprobado.
- `src/styles`: tokens y reglas compartidas.
- `tests`: comprobaciones de rutas, estado y navegador.
- `docs/ARCHITECTURE.md`: decisiones actuales y estructura objetivo.

## Estado de desarrollo

La fase 10C incorpora los primeros pasos funcionales del asistente; 10C.1 cierra los defectos de confirmación y mensajes detectados en la auditoría. La lista y el dashboard muestran datos almacenados; «Abrir ejemplo» crea una copia editable solo cuando se solicita. Se admiten borradores incompletos. Para estar listo para evaluación se requieren entre dos y cinco alternativas, entre dos y ocho criterios válidos y una suma positiva de pesos. La evaluación individual, los resultados dinámicos, los escenarios interactivos, importación/exportación e informes siguen pendientes. Los proyectos pueden perderse si se borran los datos del navegador; no hay sincronización entre dispositivos. Consulta `docs/VERIFICATION-10C1.md` para las pruebas de cierre.

# DecisionLab

Aplicación frontend para comparar alternativas mediante criterios y pesos. Permite crear, buscar, editar, duplicar y eliminar proyectos locales. El asistente registra alternativas, criterios, pesos y las respuestas de evaluación de un proyecto real. Los resultados dinámicos y escenarios interactivos se desarrollarán en fases posteriores.

## Tecnologías

HTML5, CSS3, JavaScript ES Modules y Vite. ESLint, Prettier, Vitest y Playwright verifican el proyecto. No se usa framework de interfaz ni backend. Los proyectos se guardan en IndexedDB del navegador.

## Requisitos e inicio

- Node.js 24 o superior y npm.
- Google Chrome instalado para las pruebas de Playwright configuradas con `channel: 'chrome'`.

```powershell
cd C:\Users\user\Documents\Codex\2026-10-31\tmb-te-doy-la-ruta-por-4\outputs\DecisionLab
npm install
npm run dev
```

La landing se abre en la dirección indicada por Vite (normalmente `http://127.0.0.1:5173/`). La aplicación está en `/app/`. Usa rutas de fragmento como `/app/#/project/:id/evaluation`, que permiten recarga y alojamiento estático sin reglas de servidor.

## Uso actual

Se puede crear un borrador incompleto y continuar después. El asistente tiene cinco pasos funcionales: definición, alternativas, criterios, pesos y evaluación. El sexto paso, resultados, está reservado para la fase 10E. Para evaluar, el proyecto necesita nombre, pregunta, de dos a cinco alternativas, de dos a ocho criterios bien configurados y pesos con suma positiva. Si falta algo, la pantalla indica qué corregir y enlaza al paso correspondiente.

La evaluación permite una respuesta por par alternativa–criterio. Una valoración acepta enteros de 0 a 5; cero es una respuesta válida y vacío significa pendiente. Un criterio numérico acepta valores dentro de su rango inclusivo y decimales con coma o punto. No admite separadores de miles. El progreso cuenta únicamente respuestas válidas. Los cambios se guardan automáticamente en IndexedDB mediante el estado y repositorio existentes. El ejemplo oficial se copia al proyecto editable solo al solicitarlo y trae sus doce respuestas.

## Verificación

```powershell
npm run check
npm run test:smoke
npm run test:e2e
npm run capture:evaluation
```

`check` ejecuta ESLint, Prettier, Vitest y compila ambas entradas HTML. Playwright cubre operaciones reales, persistencia, navegación y seis anchos de pantalla. Las capturas quedan en `docs/screenshots/`. También se conservan los comandos `capture`, `capture:projects` y `capture:wizard` de las fases anteriores. Consulte `docs/VERIFICATION-10D.md` para evidencia y límites de esta fase.

## Estructura

- `src/domain`: modelo, validación, operaciones puras de configuración y respuestas, normalización, motor de evaluación y escenarios. Ver `docs/DOMAIN.md` y `docs/EVALUATION.md`.
- `src/data`: conexión y repositorio IndexedDB. Ver `docs/PERSISTENCE.md`.
- `src/app`: rutas, estado del proyecto y shell del espacio de trabajo.
- `src/features/projects`, `wizard` y `evaluation`: vistas de proyectos, configuración y captura de respuestas.
- `src/features/dashboard` y `demo`: vistas existentes; las puntuaciones ilustrativas no se presentan como resultados funcionales del proyecto.
- `src/landing`, `src/shared` y `src/styles`: landing, componentes, ejemplo aprobado y estilos.
- `tests`, `scripts` y `docs`: pruebas, captura y documentación. Ver `docs/FILE-TREE.md`.

## Límites

La pantalla de resultados aún no calcula clasificaciones para el usuario. El motor matemático existente sí acepta proyectos completos y se usa en pruebas de integración. Faltan escenarios interactivos, importación, exportación e informes. Los proyectos pertenecen a este navegador y origen: pueden perderse al borrar los datos del sitio y no se sincronizan entre dispositivos.

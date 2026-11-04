# DecisionLab

Aplicación frontend para comparar alternativas mediante criterios y pesos. Permite crear, buscar, editar, duplicar y eliminar proyectos locales. El asistente registra la configuración y las respuestas de un proyecto real, calcula resultados, clasifica alternativas y explica sus puntuaciones. También permite simular un cambio de prioridades, respaldar y recuperar proyectos mediante JSON e imprimir informes.

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

La landing se abre en la dirección indicada por Vite (normalmente `http://127.0.0.1:5173/`). La aplicación está en `/app/`. Usa rutas de fragmento como `/app/#/project/:id/results`, que permiten recarga y alojamiento estático sin reglas de servidor.

## Uso actual

Se puede crear un borrador incompleto y continuar después. El asistente tiene seis pasos: definición, alternativas, criterios, pesos, evaluación y resultados. Para calcular resultados, el proyecto necesita nombre, pregunta, de dos a cinco alternativas, de dos a ocho criterios bien configurados, pesos con suma positiva y todas las respuestas válidas. Si falta algo, la pantalla indica qué corregir y enlaza al paso correspondiente.

La evaluación permite una respuesta por par alternativa–criterio. Una valoración acepta enteros de 0 a 5; cero es una respuesta válida y vacío significa pendiente. Un criterio numérico acepta valores dentro de su rango inclusivo y decimales con coma o punto. No admite separadores de miles. El progreso cuenta únicamente respuestas válidas. Los cambios se guardan automáticamente en IndexedDB mediante el estado y repositorio existentes. El ejemplo oficial se copia al proyecto editable solo al solicitarlo y trae sus doce respuestas.

Resultados usa `evaluateProject()` del dominio: muestra posiciones, barras de 0 a 100 y aportes por criterio. Un empate real comparte posición; si dos puntuaciones se ven iguales a dos decimales pero difieren en precisión completa, la interfaz lo explica. La ruta global `#/results` permite elegir un proyecto guardado y no crea ejemplos. Los resultados dependen de las evaluaciones, rangos y pesos introducidos; no son una recomendación objetiva. Ver `docs/RESULTS.md`.

Desde Resultados se abre «Comparar escenarios». `#/scenarios` permite elegir un proyecto guardado y `#/project/:id/scenarios` muestra su escenario alternativo o permite crearlo. El MVP admite uno por proyecto. Crear copia los pesos base; después se pueden editar nombre y pesos, restablecerlos o eliminar el escenario. Las puntuaciones, posiciones y variaciones de aportes se calculan con `compareScenarios()` y no se guardan. Las ediciones temporalmente inválidas permanecen en el formulario y no sustituyen la última versión válida; se advierte antes de salir. Cambiar prioridades no cambia las respuestas ni significa que una alternativa haya mejorado. Ver `docs/SCENARIOS.md`.

En Configuración (`#/settings`) puedes exportar un proyecto o todos los proyectos a JSON. Cuando el conjunto supera 500 proyectos o 20 MiB, la aplicación prepara archivos separados para descargarlos manualmente; conserva todos los lotes para poder recuperar el conjunto. Selecciona cada archivo para importarlo: se valida y presenta una vista previa antes de confirmar. Los proyectos importados deben respetar el máximo de cinco alternativas y ocho criterios. Por defecto se importan copias independientes; también puedes conservar los identificadores libres y copiar solo los conflictos. Nunca se reemplazan proyectos existentes. Se recuperan borradores, respuestas, pesos, progreso y escenarios, y los resultados se recalculan al abrir. El respaldo es manual, queda en el dispositivo que elijas y no se sincroniza. Ver `docs/TRANSFER.md`.

Desde Resultados, «Ver informe» abre `#/project/:id/report`. El informe incluye configuración, respuestas, clasificación y desglose; añade el escenario alternativo cuando es válido. «Imprimir / Guardar como PDF» abre la impresión del navegador, donde puedes elegir impresora o PDF. El HTML es la vía accesible principal; el PDF generado por Chrome en esta verificación no tiene etiquetas estructurales. Un proyecto incompleto muestra pendientes y no presenta una clasificación definitiva. Ver `docs/REPORT.md`.

## Verificación

```powershell
npm run check
npm run test:smoke
npm run test:e2e
npm run build
node scripts/verify-11b.mjs
npm audit
npm run capture:evaluation
npm run capture:results
npm run capture:scenarios
npm run capture:transfer-report
```

`check` ejecuta ESLint, Prettier, Vitest y compila ambas entradas HTML. Playwright cubre operaciones reales, persistencia, navegación y seis anchos de pantalla. La verificación 11B usa la compilación bajo `/DecisionLab/` y produce capturas y PDF en `docs/evidence-11B/`. Consulta `docs/VERIFICATION-11B.md` para resultados y limitaciones.

## Estructura

- `src/domain`: modelo, validación, operaciones puras de configuración y respuestas, normalización, motor de evaluación y escenarios. Ver `docs/DOMAIN.md` y `docs/EVALUATION.md`.
- `src/data`: conexión, repositorio IndexedDB y formato de respaldo. Ver `docs/PERSISTENCE.md` y `docs/TRANSFER.md`.
- `src/app`: rutas, estado del proyecto y shell del espacio de trabajo.
- `src/features/projects`, `wizard`, `evaluation`, `results`, `scenarios`, `transfer` y `report`: vistas de proyectos, configuración, respuestas, resultados, simulación, respaldos e informe.
- `src/features/dashboard` y `demo`: resumen de proyectos y vista de configuración.
- `src/landing`, `src/shared` y `src/styles`: landing, componentes, ejemplo aprobado y estilos.
- `tests`, `scripts` y `docs`: pruebas, captura y documentación. Ver `docs/FILE-TREE.md`.

## Límites

El MVP limita los escenarios a uno alternativo por proyecto. El modelo multicriterio combina las preferencias aportadas y no demuestra que una opción sea mejor en términos absolutos. Los proyectos pertenecen a este navegador y origen: pueden perderse al borrar los datos del sitio. Los respaldos son manuales y no existe sincronización entre dispositivos. El PDF impreso puede carecer de etiquetas estructurales; usa el informe HTML para lectura accesible. La licencia del futuro repositorio público sigue pendiente para la Fase 12.

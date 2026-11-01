# Proyectos e IndexedDB · fase 10B

## Datos y almacenamiento

DecisionLab guarda proyectos en IndexedDB del mismo origen del navegador. La base `decisionlab` empieza en la versión **1** y contiene un almacén `projects` con clave primaria `id`. Cada registro tiene esta forma:

```js
{ id: 'uuid', revision: 1, project: { id: 'uuid', schemaVersion: 1, name: '', question: '', description: '', createdAt: 'fecha ISO', updatedAt: 'fecha ISO', alternatives: [], criteria: [], evaluations: [], scenarios: [] } }
```

`revision` es metadato del repositorio para detectar escrituras antiguas; no forma parte del modelo matemático. Los identificadores internos de alternativas, criterios y escenarios están delimitados por proyecto. Al duplicar un proyecto se genera un ID de proyecto nuevo y se conservan esos identificadores internos, por lo que las referencias de evaluaciones y pesos siguen siendo válidas. La copia recibe nuevas fechas y el original no se modifica.

No se creó un índice secundario: la lista completa es pequeña en esta fase y se ordena por `updatedAt` después de validar todos los registros. Un índice que omitiera registros dañados podría ocultar errores. Si el volumen de proyectos lo justifica, se podrá añadir un índice durante una migración real.

## Contrato del repositorio

`createProjectRepository()` expone métodos asíncronos:

| Método                                                      | Resultado                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `createProject({ name, question, description, template? })` | Crea un borrador o copia explícita del ejemplo; devuelve `{ id, revision, project }`.                                   |
| `getProject(id)`                                            | Devuelve el registro o `null`.                                                                                          |
| `listProjects()`                                            | Devuelve registros ordenados por actualización descendente.                                                             |
| `updateProject(project, expectedRevision)`                  | Valida el borrador, compara la revisión dentro de una transacción, incrementa la revisión y devuelve el registro nuevo. |
| `deleteProject(id, expectedRevision?)`                      | Elimina en una transacción y devuelve `true`; si no existe, `false`.                                                    |
| `duplicateProject(id)`                                      | Clona el proyecto en una transacción y devuelve la copia.                                                               |

Antes de escribir se ejecuta `validateProject(project, { mode: 'draft' })`. Esto permite nombres, criterios o evaluaciones pendientes, pero rechaza referencias rotas, IDs duplicados, valores mal formados y rangos inconsistentes. La validación completa de la fase 10A sigue siendo la condición para calcular resultados. El repositorio no almacena puntuaciones ni clasificaciones.

Los métodos lanzan `StorageError` con un `code` estable y mensaje. Entre los códigos están `unavailable`, `blocked`, `version-incompatible`, `schema-incompatible`, `quota-exceeded`, `duplicate-id`, `not-found`, `conflict`, `invalid-project` y `corrupt-record`. Los errores no se transforman en un falso éxito. La interfaz muestra fallos de carga o guardado y permite reintentar; los proyectos dañados no se ocultan silenciosamente de la lista.

## Estado y guardado

El flujo es **interfaz → `project-state.js` → repositorio → IndexedDB**. Solo el estado de edición conserva una copia mutable del proyecto activo. El repositorio devuelve copias para que otros componentes no modifiquen sus datos por accidente. Al cambiar nombre, pregunta o descripción, el estado se marca como pendiente y agrupa pulsaciones durante 650 ms. También existe «Guardar ahora».

El estado muestra `dirty`, `saving`, `saved` o `error`. «Guardado» se anuncia solo después de completarse la transacción. Si se edita durante una escritura, la respuesta antigua actualiza la revisión persistida, pero no sustituye la edición reciente; se programa otro guardado. La revisión impide que otra pestaña sobrescriba silenciosamente el proyecto con datos antiguos. Si la escritura falla, el borrador sigue en memoria, aparece una advertencia y el botón permite reintentar. Antes de salir de esa pantalla se intenta guardar y, si vuelve a fallar, se pide decidir si se descartan los cambios. El navegador también advierte antes de cerrar o recargar una pestaña con cambios pendientes.

La aplicación recupera el proyecto por su ID al abrir o recargar `#/project/:id`. `#/new` crea un borrador explícitamente y redirige a esa ruta; `#/example` crea una copia editable del conjunto aprobado solo tras la acción del usuario. Volver a cargar la ruta del proyecto no crea otra copia. La lista y el dashboard derivan sus cantidades y estados de los registros reales.

Desde 10C, el proyecto puede incluir `workflowStep` con `details`, `alternatives`, `criteria` o `weights`; 10D añade `evaluation` y 10E añade `results`. Es opcional para leer registros anteriores; los proyectos nuevos comienzan en `details`. La ruta `#/project/:id` reanuda el paso guardado y las rutas con paso explícito actualizan ese valor mediante el mismo guardado automático. Las respuestas se escriben en el arreglo `evaluations` existente mediante interfaz → estado → repositorio → IndexedDB. Resultados llama al motor en cada apertura y no persiste puntuaciones, posiciones ni aportes. La versión de IndexedDB y `schemaVersion` permanecen en 1 porque estos datos ya estaban previstos en el modelo.

## Versionado y límites

Una futura modificación incompatible incrementará la versión de IndexedDB y aplicará su migración en `onupgradeneeded`; el proyecto conservará además `schemaVersion` para validar la forma de cada registro. Esta fase no inventa migraciones para versiones que aún no existen. Una versión de base más reciente produce un error explícito y no se sobrescribe. Un proyecto con esquema más reciente tampoco se interpreta como versión 1.

El almacenamiento pertenece a este navegador y origen. Puede perderse si se borran los datos del sitio, se usa navegación privada o el navegador libera espacio. No hay cuenta, sincronización entre equipos ni respaldo automático. Exportar e importar copias queda para otra fase. Si falla el guardado, los cambios en memoria se perderán al cerrar la pestaña; la interfaz lo indica y no los presenta como protegidos.

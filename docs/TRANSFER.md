# Respaldos JSON · fase 10G

## Crear y recuperar un respaldo

En Configuración (`/app/#/settings`), «Exportar todos los proyectos» descarga un archivo JSON cuando el conjunto cabe en los límites. Si no cabe, muestra los lotes necesarios con un botón por archivo, el número de lote y su cantidad de proyectos. Hay que descargar **todos** los lotes y guardarlos juntos para disponer de un respaldo completo. Los nombres siguen `decisionlab-respaldo-AAAA-MM-DD.json` para un archivo y `decisionlab-respaldo-lote-01-de-02-AAAA-MM-DD.json` para varios. La lista de Configuración y cada entrada de «Mis comparaciones» permiten exportar uno. No se necesita conexión después de cargar la aplicación. La descarga usa `Blob` y una URL temporal, que se libera.

Para recuperar datos, selecciona cada archivo JSON en Configuración, uno por uno. La aplicación verifica cada archivo completo y muestra nombres, cantidades y conflictos de ID **antes de escribir**. Elige el tratamiento de IDs y confirma; «Cancelar» no modifica IndexedDB. Si falla la transacción, se revierte ese lote y puedes reintentar. Tras una importación correcta, la lista se actualiza. Los resultados se recalculan al abrir el proyecto recuperado.

## Formato y contenido

```json
{
  "application": "DecisionLab",
  "formatVersion": 1,
  "exportedAt": "2026-11-04T00:00:00.000Z",
  "projects": []
}
```

`formatVersion: 1` identifica el contenedor; cada proyecto conserva `schemaVersion: 1`. Solo se aceptan estas versiones existentes. Un archivo más reciente recibe un error explícito; no hay migraciones ficticias. Los proyectos incluyen ID, nombres, pregunta, descripción, fechas, alternativas, criterios, tipos, rangos, unidades, pesos, evaluaciones, escenarios y `workflowStep`. También se conservan borradores incompletos estructuralmente válidos. No se incluyen revisiones de IndexedDB ni puntuaciones, posiciones o aportes derivados.

El límite es 20 MiB y 500 proyectos **por archivo**. La exportación por lotes respeta ambos límites y conserva el orden de los proyectos sin omitirlos. Se comprueban estructura y tipos, claves permitidas, fechas ISO reales, identificadores únicos, referencias, rangos, pesos y escenarios con `validateProject(..., { mode: 'draft' })`. Antes de importar se rechaza un proyecto que supere cinco alternativas u ocho criterios; los borradores con menos elementos siguen admitidos. Los proyectos se reconstruyen con campos permitidos. El texto importado se muestra con `textContent`, nunca como HTML ejecutable.

## Conflictos e integridad

La opción predeterminada, **Importar todos como copias independientes**, asigna IDs nuevos a los proyectos. La otra, **Conservar ID libres y copiar los conflictos**, preserva un ID solo si no existe en el dispositivo; los conflictos reciben un ID nuevo. Los IDs internos de alternativas, criterios y escenarios se conservan, así que sus referencias siguen funcionando. Ninguna opción reemplaza un proyecto existente.

`project-repository.js` añade el conjunto en una única transacción `readwrite`. Si falla cualquier inserción, `indexeddb.js` aborta la transacción. La interfaz no abre la base directamente. El formato, la validación, el plan de IDs, la descarga y la vista están separados en módulos. El proyecto y la base IndexedDB siguen en versión 1.

Si otra pestaña guardó primero el mismo proyecto, la edición local no sustituye esa versión. La pantalla permite descargar los cambios pendientes como un respaldo JSON de un proyecto antes de recargar. Se puede importar ese archivo como copia desde Configuración para revisar ambas versiones.

## Privacidad y límites del almacenamiento

El respaldo es **manual y local**; no constituye copia automática en la nube ni sincronización entre dispositivos. IndexedDB puede desaparecer al borrar datos del sitio, usar navegación privada o por gestión de espacio del navegador. Guarda el JSON en un lugar seguro, revisa su contenido antes de compartirlo y prueba su recuperación. Un archivo exportado puede incluir la descripción y respuestas introducidas por ti.

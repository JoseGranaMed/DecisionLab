# Respaldos JSON · fase 10G

## Crear y recuperar un respaldo

En Configuración (`/app/#/settings`), «Exportar todos los proyectos» descarga un archivo JSON con los proyectos guardados. La lista de esa pantalla y cada entrada de «Mis comparaciones» permiten exportar uno. No se necesita conexión después de cargar la aplicación. La descarga usa `Blob` y una URL temporal, que se libera. El nombre sigue `decisionlab-respaldo-AAAA-MM-DD.json` o `decisionlab-proyecto-AAAA-MM-DD.json`; no expone el nombre de la comparación.

Para recuperar datos, selecciona un archivo JSON en Configuración. La aplicación verifica el archivo completo y muestra nombres, cantidades y conflictos de ID **antes de escribir**. Elige el tratamiento de IDs y confirma; «Cancelar» no modifica IndexedDB. Si falla la transacción, se revierte todo el conjunto y puedes reintentar. Tras una importación correcta, la lista se actualiza. Los resultados se recalculan al abrir el proyecto recuperado.

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

El límite es 20 MiB y 500 proyectos por archivo. Se comprueban estructura y tipos, claves permitidas, fechas, identificadores únicos, referencias, rangos, pesos y escenarios con `validateProject(..., { mode: 'draft' })`. Los proyectos se reconstruyen con campos permitidos. El texto importado se muestra con `textContent`, nunca como HTML ejecutable. Un respaldo mayor que los límites debe dividirse mediante exportaciones individuales.

## Conflictos e integridad

La opción predeterminada, **Importar todos como copias independientes**, asigna IDs nuevos a los proyectos. La otra, **Conservar ID libres y copiar los conflictos**, preserva un ID solo si no existe en el dispositivo; los conflictos reciben un ID nuevo. Los IDs internos de alternativas, criterios y escenarios se conservan, así que sus referencias siguen funcionando. Ninguna opción reemplaza un proyecto existente.

`project-repository.js` añade el conjunto en una única transacción `readwrite`. Si falla cualquier inserción, `indexeddb.js` aborta la transacción. La interfaz no abre la base directamente. El formato, la validación, el plan de IDs, la descarga y la vista están separados en módulos. El proyecto y la base IndexedDB siguen en versión 1.

## Privacidad y límites del almacenamiento

El respaldo es **manual y local**; no constituye copia automática en la nube ni sincronización entre dispositivos. IndexedDB puede desaparecer al borrar datos del sitio, usar navegación privada o por gestión de espacio del navegador. Guarda el JSON en un lugar seguro, revisa su contenido antes de compartirlo y prueba su recuperación. Un archivo exportado puede incluir la descripción y respuestas introducidas por ti.

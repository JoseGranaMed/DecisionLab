# DecisionLab · Auditoría integral del MVP (Fase 11A)

> Registro histórico anterior a las correcciones. El cierre de los hallazgos se documenta en [VERIFICATION-11B.md](VERIFICATION-11B.md); las evidencias originales se conservan aquí.

**Fecha:** 4 de noviembre de 2026. **Base examinada:** commit `89f64d5` (Fase 10G), rama `main`. **Alcance de este documento:** auditoría y evidencias; no se modificó el comportamiento de la aplicación ni sus pruebas existentes.

## 1. Resumen ejecutivo y dictamen

El recorrido principal funciona con datos reales: crear y editar proyectos, configurar alternativas y criterios, evaluar, consultar resultados, comparar un escenario, exportar, importar e imprimir. Las pruebas automatizadas actuales pasan y el sitio compilado funciona bajo `/DecisionLab/`. El modelo reproduce el ejemplo aprobado antes y después de un respaldo.

**Dictamen: aún no publicar como versión final del portafolio.** No se demostró pérdida automática de proyectos, corrupción, XSS ni un error matemático del motor. Sí hay fallos verificables de recuperación masiva, mensajes ante conflicto, navegación por teclado, paginación del informe y accesibilidad, además de inconsistencias de validación y contenido. Conviene resolver los hallazgos de prioridad 11B antes de presentar el MVP como producto terminado. No se encontraron hallazgos críticos; los hallazgos de esta auditoría son de severidad media o baja.

## 2. Estado real y pruebas ejecutadas

| Comprobación                                      | Resultado verificable                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git inicial                                       | Árbol limpio, `HEAD 89f64d5`; historial 10D–10G presente.                                                                                                                                                                                                                                               |
| `npm run check`                                   | Código 0: ESLint, Prettier, 47 pruebas unitarias en 11 archivos y compilación de las dos entradas HTML.                                                                                                                                                                                                 |
| `npm run test:smoke`                              | 4/4 aprobadas.                                                                                                                                                                                                                                                                                          |
| `npm run test:e2e -- --workers=2 --reporter=line` | 100/100 aprobadas **sobre el estado actual**, incluida 10G.                                                                                                                                                                                                                                             |
| `npm run preview -- --port 4189 --strictPort`     | Servidor iniciado; `/` y `/app/` respondieron 200 con recursos compilados relativos.                                                                                                                                                                                                                    |
| Producción bajo `/DecisionLab/`                   | Servidor estático temporal con `dist/` montado en esa subruta: landing → app, recarga de dashboard y resultados, 72 combinaciones de 12 vistas × seis anchos, cero peticiones locales fallidas y cero desbordamientos de página. [Datos](audit-11A/exploration.json) y [script](audit-11A/explore.mjs). |
| Exploración matemática y de archivos              | [Resultados](audit-11A/probes.json) y [script](audit-11A/probes.mjs): ejemplo, escenario, respaldo de ida y vuelta, límites y entradas adversariales.                                                                                                                                                   |
| Informe máximo                                    | Proyecto válido de cinco alternativas, ocho criterios y 40 respuestas; HTML muestra cinco evaluaciones, cinco resultados y ocho criterios. PDF A4 de seis páginas: [muestra](audit-11A/report-max.pdf).                                                                                                 |
| Dependencias                                      | `npm audit --json`: siete avisos moderados en herramientas de desarrollo. `npm audit --omit=dev --json`: cero avisos en dependencias de producción. [Informe completo](audit-11A/npm-audit.json) y [producción](audit-11A/npm-audit-production.json).                                                   |

No se ejecutó una auditoría automática de WCAG con lector de pantalla ni pruebas en Safari/Firefox, tabletas o teléfonos físicos. Tampoco se forzó una cuota real de IndexedDB ni se publicó en GitHub Pages. Esos límites impiden declarar conformidad WCAG completa o compatibilidad universal.

## 3. Hallazgos priorizados

| ID  | Severidad | Prioridad 11B | Hallazgo                                                                                          | Ubicación principal                                                       |
| --- | --------- | ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A01 | Media     | P1            | Un conflicto entre pestañas sugiere reintentar una escritura que no puede prosperar sin recargar. | `src/features/projects/projects.js:144`                                   |
| A02 | Media     | P1            | «Exportar todos» falla si hay más de 500 proyectos, aunque la aplicación permite tenerlos.        | `src/data/backup-format.js:6,122`; `src/features/transfer/transfer.js:11` |
| A03 | Media     | P1            | El menú móvil abierto no recibe el siguiente foco de teclado.                                     | `src/shared/components/app-shell.js:63,77`                                |
| A04 | Media     | P1            | El PDF 5×8 deja un encabezado solo y divide la lista de pesos entre páginas.                      | `src/features/report/report.css:277`                                      |
| A05 | Media     | P1            | La landing dirige dos enlaces del ejemplo a pantallas vacías en un navegador nuevo.               | `src/landing/main.js:30,61`                                               |
| A06 | Media     | P2            | La validación acepta una fecha calendárica imposible y la muestra normalizada de otra forma.      | `src/domain/validation.js:55`; `src/data/backup-format.js:15`             |
| A07 | Media     | P2            | Una importación acepta seis alternativas y nueve criterios; luego el asistente impide evaluarlas. | `src/data/backup-format.js:109`; `src/domain/setup.js:29-43`              |
| A08 | Media     | P2            | El texto pequeño del contexto superior tiene contraste calculado de 4,03:1.                       | `src/app/shell.css:123-125`                                               |
| A09 | Media     | P2            | El PDF de muestra y el PDF máximo no tienen etiquetas estructurales.                              | `src/features/report/report.js:267`; salida del navegador                 |
| A10 | Media     | P2            | El árbol de desarrollo contiene siete avisos moderados de seguridad.                              | `package.json:26-31`; `package-lock.json`                                 |
| A11 | Baja      | P2            | El nombre largo del archivo seleccionado se trunca a 320 px.                                      | `src/features/transfer/transfer.js:11`; `transfer.css:44-47`              |
| A12 | Baja      | P2            | La landing anuncia exportación «más adelante», pese a estar implementada.                         | `src/landing/main.js:76`                                                  |
| A13 | Baja      | P2            | El árbol principal de archivos sigue describiendo 10F.                                            | `docs/FILE-TREE.md:11-55`                                                 |

### A01 · Conflicto entre pestañas con instrucción incorrecta

**Causa:** el repositorio detecta correctamente la revisión antigua, pero el mensaje genérico de error de guardado añade «Pulsa Guardar ahora para reintentar» a cualquier error. **Reproducción:** abrir el mismo proyecto en dos pestañas; guardar «Primera pestaña» en una y editar «Segunda pestaña» en la otra. **Observado:** la primera edición persiste y la segunda recibe «Recarga antes de guardar. Pulsa Guardar ahora para reintentar». Reintentar conserva la revisión antigua y repite el conflicto. **Esperado:** explicar que la segunda edición no está guardada, permitir copiarla o resolver el conflicto antes de recargar. **Impacto:** riesgo de perder manualmente la segunda edición al seguir una indicación inviable. **Evidencia:** `crossTab` en [exploration.json](audit-11A/exploration.json). **11B:** distinguir `conflict` de errores recuperables y diseñar una salida clara sin sobrescribir la primera pestaña.

### A02 · El respaldo completo deja de funcionar tras superar 500 proyectos

**Causa:** el formato limita cada archivo a 500 proyectos; ni la creación ni una importación controlan el total del repositorio. **Reproducción:** en un navegador aislado, conservar dos proyectos e importar un respaldo válido de 500 borradores; pulsar «Exportar todos». **Observado:** 502 proyectos guardados y error «El respaldo admite hasta 500 proyectos». La vista previa tardó 74 ms y la importación 150 ms en esta ejecución local. **Esperado:** que «todos» produzca un respaldo recuperable, o que la interfaz ofrezca particiones explícitas y no prometa un único archivo imposible. **Impacto:** falta de respaldo completo en ese caso límite. **Evidencia:** `bulk` en [exploration.json](audit-11A/exploration.json) y [captura](audit-11A/export-all-502.png). **11B:** definir política de múltiples archivos o límite global coherente; probar ida y vuelta por lotes.

### A03 · Foco del menú móvil

**Causa:** el menú se muestra al final del DOM, después del contenido y la barra inferior; `setMenu()` no lleva el foco a su primer enlace. **Reproducción:** a 320 px, enfocar «Abrir más opciones», pulsar Enter y luego Tab. **Observado:** el foco pasa a «Continuar proyecto», no a una opción del menú abierto. **Esperado:** entrar al menú o seguir un orden perceptible. Escape y cierre con foco de retorno sí funcionan. **Impacto:** navegación por teclado confusa. **Evidencia:** `menuFocus` en [exploration.json](audit-11A/exploration.json), [captura](audit-11A/menu-focus-320.png). **11B:** mover el foco al menú al abrir o ajustar su orden semántico, y probar Tab/Shift+Tab/Escape con teclado y lector de pantalla.

### A04 · Paginación del informe grande

**Causa probable:** `break-inside: avoid` mantiene artículos extensos íntegros, pero no vincula cada encabezado de sección con su primer artículo ni mantiene la lista de pesos del escenario. **Reproducción:** abrir e imprimir el proyecto de cinco alternativas y ocho criterios de [explore.mjs](audit-11A/explore.mjs). **Observado:** en [página 1](audit-11A/report-max-page-1.png) queda «Evaluaciones utilizadas» sin datos; [página 2](audit-11A/report-max-page-2.png) empieza directamente con una alternativa. La lista de pesos empieza en [página 4](audit-11A/report-max-page-4.png) y su último elemento pasa a [página 5](audit-11A/report-max-page-5.png). **Esperado:** encabezados unidos al contenido y cortes que mantengan contexto. **Impacto:** documento menos claro para compartir. **11B:** ajustar reglas de fragmentación y volver a inspeccionar PDF mínimo y máximo.

### A05 · Enlaces del ejemplo que no muestran el ejemplo

**Causa:** los enlaces apuntan a rutas globales que seleccionan proyectos guardados; no crean ni abren el ejemplo. **Reproducción:** con almacenamiento limpio, pulsar «Ver cómo se evalúa» o «Revisar el resultado» en la landing. **Observado:** el primero dice que se abra una comparación guardada; el segundo muestra que aún no hay comparaciones. **Esperado:** mostrar la etapa o resultado prometido del ejemplo, o describir con precisión el destino. **Impacto:** los recorridos de descubrimiento terminan en un estado vacío. **Evidencia:** `routes.landingEvaluation` y `routes.landingResult` en [exploration.json](audit-11A/exploration.json). **11B:** corregir destinos o etiquetas sin rediseñar la landing.

### A06 · Fecha imposible admitida

**Causa:** la comprobación usa una expresión parcial y `Date.parse`, que normaliza algunos días imposibles. **Reproducción:** exportar/importar un proyecto con `createdAt: "2026-02-31T00:00:00.000Z"` y `updatedAt: "2026-03-04T00:00:00.000Z"`. **Observado:** el archivo se acepta, aunque `Date` interpreta la creación como 3 de marzo. **Esperado:** rechazar la fecha inválida o documentar una transformación explícita. **Impacto:** inconsistencia cronológica en metadatos recuperados. **Evidencia:** `invalidCalendarDate` en [probes.json](audit-11A/probes.json). **11B:** validar ISO y día real sin migrar esquemas.

### A07 · Límites de importación distintos de los del asistente

**Causa:** `validateProject(..., { mode: 'draft' })` permite cualquier cantidad estructuralmente válida; los límites 5/8 se aplican en `validateSetup()`. **Reproducción:** importar un proyecto con seis alternativas y nueve criterios válidos. **Observado:** el respaldo se acepta y luego aparecen `too-many-alternatives` y `too-many-criteria`; no se puede evaluar hasta eliminar elementos. **Esperado:** avisar del límite antes de confirmar o definir explícitamente cómo recuperar proyectos más grandes. **Impacto:** recuperación aparentemente exitosa que no permite completar el flujo. **Evidencia:** `beyondMvp` en [probes.json](audit-11A/probes.json). **11B:** alinear validación, vista previa y mensaje de importación; conservar la recuperación de borradores genuinos.

### A08 · Contraste del contexto superior

**Causa:** `#777f8d` sobre blanco en un texto de `0.72rem`. **Reproducción:** inspeccionar «Espacio de trabajo /» en escritorio y calcular contraste relativo sRGB. **Observado:** 4,03:1, bajo 4,5:1 para texto normal en WCAG 2.2 AA. **Esperado:** al menos 4,5:1. **Impacto:** menor legibilidad del contexto de navegación. **Evidencia:** `src/app/shell.css:119-125` y cálculo registrado durante la auditoría. **11B:** ajustar solo ese token/color y verificar contraste real en el navegador.

### A09 · PDF sin estructura etiquetada

**Causa:** la acción usa `window.print()` y deja la producción de PDF al navegador; la muestra generada por Chrome no incorpora etiquetas PDF. **Reproducción:** `pdfinfo` sobre [muestra 10G](screenshots/phase-10G-print-example.pdf) y [muestra 5×8](audit-11A/report-max.pdf). **Observado:** `Tagged: no` en ambas. **Esperado para un PDF que deba ser accesible:** encabezados, tabla y orden de lectura etiquetados. **Impacto:** la navegación estructural en lectores de PDF puede perderse; el informe HTML sigue disponible como alternativa. **11B:** conservar HTML semántico, revisar su orden de lectura y decidir si el PDF etiquetado será requisito de publicación. CSS por sí solo no garantiza etiquetas en la salida del navegador.

### A10 · Avisos en dependencias de desarrollo

**Causa:** versiones fijadas de ESLint/Vitest y dependencias transitivas. **Reproducción:** `npm audit --json`. **Observado:** siete avisos moderados y ninguno alto o crítico; `npm audit --omit=dev` devuelve cero avisos de producción. Entre los avisos están [GHSA-qxg6-89mg-rqv8](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8), [GHSA-xp26-3454-mjgp](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp) y [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). **Impacto:** afecta herramientas y entorno de desarrollo; no se demostró vulnerabilidad en el bundle público. **11B:** revisar actualizaciones compatibles y repetir pruebas; no ejecutar correcciones automáticas a ciegas. **Evidencia:** [auditoría npm](audit-11A/npm-audit.json).

### A11 · Selector de archivo recortado en 320 px

**Causa:** control nativo de archivo de 292 px sin una presentación separada del nombre completo. **Reproducción:** seleccionar `decisionlab-respaldo-proyecto-de-prueba-con-un-nombre-muy-largo-2026.json` a 320 px. **Observado:** el DOM conserva el nombre, pero la etiqueta visible lo abrevia a `decisionl...026.json`. La vista previa identifica el proyecto y la importación funciona. **Esperado:** poder comprobar qué archivo se eligió sin depender de un nombre truncado. **Evidencia:** [captura](audit-11A/file-selected-320.png), `filePicker` en [exploration.json](audit-11A/exploration.json). **11B:** mostrar el nombre completo en una línea que pueda envolver o en texto de ayuda accesible.

### A12 · Texto obsoleto de la landing

**Causa:** el cierre editorial quedó en el estado previo a 10G. **Reproducción:** abrir la sección «Tus datos». **Observado:** promete exportación «más adelante», aunque Configuración ya la ofrece. **Esperado:** explicar el respaldo manual actual. **Impacto:** información falsa para quien evalúa el producto. **Evidencia:** `src/landing/main.js:76` y [captura](audit-11A/landing-320.png). **11B:** actualizar solo el texto.

### A13 · Árbol documental desactualizado

**Causa:** se añadió una nota de 10G sin actualizar el árbol de 10F. **Reproducción:** leer `docs/FILE-TREE.md`. **Observado:** el árbol principal termina en `capture-scenarios.mjs` y no muestra `transfer/` ni `report/`. **Esperado:** árbol fiel al estado del commit. **Impacto:** dificulta la revisión pública del código. **11B:** regenerar o mantener un árbol resumido actual, sin duplicar listados históricos.

## 4. Revisión transversal

### Arquitectura y mantenibilidad

La separación principal se mantiene: dominio puro (`src/domain`), repositorio/transacciones (`src/data`), estado de edición (`src/app/project-state.js`) y vistas (`src/features`). Resultados e informe reutilizan `evaluateProject()`; escenarios reutiliza `compareScenarios()`. No se encontró un segundo motor de cálculo ni una segunda base de datos. `main.js` centraliza rutas y acciones; `wizard.js` concentra el asistente. Son archivos extensos, pero en esta auditoría no se verificó una duplicación que justifique reescribirlos. Los pequeños constructores DOM repetidos podrían unificarse solo si una corrección concreta lo requiere.

### Funcionalidad, matemáticas y persistencia

Las 100 pruebas E2E cubren CRUD, reordenación, guardado/recarga, borradores, historial, proyecto inexistente, revisión IndexedDB, evaluación, resultados, escenario, importación, reversión atómica y PDF. La prueba exploratoria de dos pestañas confirmó que una revisión vieja no pisa datos recientes. Un archivo inválido o una cancelación no deben escribir; los recorridos existentes de 10G lo comprueban. No se simuló cuota agotada real.

El ejemplo base recalculó **A 67,50; B 66,25; C 46,25** y el alternativo **B 70,00; A 60,00; C 32,50**, también tras serializar e interpretar JSON. Los extremos 0/200 de un criterio descendente produjeron 100/0; peso cero produjo proporción y aporte cero; se distinguieron empate exacto y empate aparente por redondeo. Las pruebas unitarias cubren valores no finitos, rangos inválidos y comparaciones incompletas. No se halló resultado matemático incorrecto en los casos ejecutados.

### Seguridad y privacidad

Las plantillas que usan `innerHTML` contienen texto fijo; los nombres y valores importados se colocan con `textContent`. El formato de respaldo reconstruye campos permitidos, rechaza propiedades sobrantes y referencias inválidas; la prueba con `__proto__` no contaminó `Object.prototype`. No se hallaron secretos en archivos rastreados ni uso de `eval`. No hay servidor propio, autenticación ni API privada a proteger. Los proyectos y respaldos son locales; los enlaces a Google Fonts sí realizan solicitudes externas cuando hay red. Esto no demostró filtración de proyectos, pero conviene describir la dependencia de fuentes en la política de privacidad del portafolio.

### Responsive, UX y accesibilidad

La exploración de 72 vistas a 320, 375, 390, 768, 1024 y 1440 px no detectó desbordamiento horizontal de página. Se inspeccionaron capturas de landing, alternativas, criterios, evaluación, transferencia e informe en móvil, y dashboard, transferencia e informe en escritorio. Las tablas de evaluación e informe desplazan su contenido internamente. La suite E2E comprueba varios recorridos con texto al 200 %. El selector truncado, el foco del menú y el contraste se detallan arriba. El foco visible global, las etiquetas de formularios, mensajes `role="alert"`/`status`, botones nativos y texto no dependiente solo del color funcionan en las rutas inspeccionadas. No se declara conformidad WCAG 2.2 AA completa sin lector de pantalla y dispositivos reales.

Los botones de reordenar en criterios midieron 21,69 px de alto a 320 px, con separación horizontal de 9 px. Son pequeños para tacto; la separación puede satisfacer la excepción de espaciado de WCAG 2.5.8, por lo que no se etiqueta como incumplimiento confirmado. Conviene revisarlos en móvil físico durante 11B.

### Informe y rendimiento

El informe de ejemplo 10G tiene tres páginas A4; el caso 5×8 tiene seis. Puntuaciones, aportes y unidades son legibles, las barras funcionan en grises y la navegación no aparece en impresión. Los defectos observados son la paginación y ausencia de etiquetas PDF. El HTML del informe sigue siendo una ruta separada de la opción «Guardar como PDF» del navegador.

La compilación reportó `app` JS 93,25 kB (27,91 kB gzip) y CSS 33,13 kB (6,48 kB gzip); landing JS 4,77 kB y CSS 6,31 kB. En un ensayo local, la vista previa de 500 borradores tardó 74 ms y la importación, incluyendo esa vista previa, 150 ms. Son mediciones de una sola máquina, no objetivos de rendimiento generales. No se observó un bloqueo medible con 502 filas, pero el volumen excedió el límite de respaldo. No se justifica una optimización de renderizado sin un perfil más amplio.

### Preparación de publicación

`npm run build`, `npm run preview` y la prueba estática bajo `/DecisionLab/` fueron satisfactorios. Los recursos y enlaces internos relativos, fragmentos, recarga y acceso directo a resultados funcionaron. Esto **no equivale** a un despliegue real en GitHub Pages, que permanece sin probar. `.gitignore` excluye `node_modules`, `dist`, cobertura y archivos locales. No hay licencia raíz ni documento de atribución; el titular debe decidir condiciones de reutilización del código y documentar fuentes externas antes de publicar. No se configuró remoto ni se publicó nada.

## 5. Riesgos, decisiones y plan para 11B

**Primero:** resolver A01–A05 porque afectan recuperación, orientación, teclado o documentos compartibles. Mantener las pruebas existentes y agregar solo regresiones que demuestren cada defecto. **Después:** corregir validación A06–A07, contraste A08, revisar el requisito de PDF accesible A09 y actualizar herramientas A10 con pruebas completas. **Finalmente:** ajustar selector y textos A11–A13, y repetir auditoría responsive, `npm audit`, `check`, smoke, E2E y prueba de producción bajo subruta.

Se requieren decisiones del usuario sobre: (1) si «Exportar todos» debe particionar archivos o limitar el total de proyectos; (2) si un PDF etiquetado es requisito del entregable o si el informe HTML accesible será la vía principal; (3) qué licencia tendrá el repositorio público y cómo documentar fuentes externas. Son decisiones de 11B; no se anticipó ninguna implementación aquí.

**Estado final de 11A:** únicamente `docs/AUDIT-11A.md` y los archivos de evidencia en `docs/audit-11A/` son nuevos. El código de producción, las pruebas previas, el motor, el esquema y la arquitectura permanecen intactos. No se inició 11B ni se publicó el sitio.

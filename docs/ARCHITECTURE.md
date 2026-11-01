# Arquitectura frontend · fases 9A–10C

## Decisiones aplicadas

1. **Dos entradas HTML.** Vite procesa `index.html` y `app/index.html`. La landing puede cargarse sin el código del espacio de trabajo. La opción `base: './'` mantiene rutas relativas en un despliegue estático bajo una subcarpeta.
2. **Rutas dentro de la aplicación.** Se usa `#/ruta` en `app/index.html`. Esta decisión evita depender de reglas de reescritura del servidor para recarga, enlaces directos y atrás/adelante. Una ruta desconocida muestra una vista explícita de error.
3. **Separación por responsabilidad.** `app` contiene inicialización y navegación; `features` contiene vistas; `shared/components` contiene piezas reutilizables; `styles` contiene tokens y reglas comunes. Los datos aprobados del ejemplo están en `shared/demo` y no se calculan en esta fase.
4. **Diseño aprobado.** Se trasladaron la paleta, tipografía, marca, hero analítico, cierre editorial, sidebar y navegación móvil. Los estilos están divididos entre base, landing, shell y vistas, sin copiar la hoja completa del prototipo.
5. **Estado transitorio.** El sidebar y el menú móvil viven solo en memoria. No se crea almacenamiento para simular una función aún inexistente.
6. **Recursos.** Los iconos y el símbolo de marca se generan como SVG en componentes de `src`, para que Vite los incluya en el código importado. `public/` se reservará para archivos estáticos que deban conservar su URL sin importación; no se creó una carpeta vacía.
7. **Dominio aislado.** `src/domain` contiene modelo, validación, operaciones de configuración, normalización, evaluación y escenarios. Sus funciones son puras respecto del proyecto recibido y devuelven resultados o errores estructurados. El asistente usa las reglas de configuración y normalización; aún no calcula resultados en pantalla.
8. **Persistencia local.** `src/data` contiene la conexión IndexedDB y el repositorio. `src/app/project-state.js` coordina el proyecto activo, la revisión y el guardado automático; la interfaz no abre transacciones. Las vistas de proyectos y dashboard usan registros reales. La ruta por fragmento `#/project/:id` conserva recarga y enlaces directos.
9. **Asistente.** `src/features/wizard` implementa cuatro pasos mediante el router existente: datos generales, alternativas, criterios y pesos. Las rutas `#/project/:id/:step` guardan `workflowStep` en el proyecto. La ruta sin paso reanuda el último paso guardado. Se mantiene el indicador de seis pasos del recorrido aprobado; evaluación y resultados quedan para otras fases.
10. **Integridad.** `src/domain/setup.js` aplica límites del MVP, conserva IDs al editar o reordenar y limpia evaluaciones y pesos de escenarios al eliminar referencias. La interfaz confirma pérdidas asociadas. Los valores inválidos permanecen en el formulario hasta corregirse y no se escriben al repositorio.

## Estructura objetivo a incorporar por fases

`src/domain` y `src/data` incorporan el modelo, motor de evaluación y repositorio IndexedDB. La configuración de alternativas, criterios y pesos ya tiene interfaz. Las fases siguientes incorporarán evaluación, resultados, escenarios interactivos e intercambio de archivos.

## Contratos previstos

- Las vistas usan `project-state.js`; no acceden directamente a IndexedDB.
- Los módulos de dominio recibirán datos planos y devolverán resultados o errores explícitos, sin depender del DOM.
- La capa de datos conserva el contrato de repositorio de la fase 10B.
- Un borrador podrá guardarse aunque no esté completo; calcular resultados requerirá validación completa.
- El contenido proveniente del usuario se insertará mediante APIs seguras del DOM, no mediante plantillas HTML sin escape. Las plantillas actuales contienen únicamente cadenas estáticas del proyecto.

## Verificación de esta iteración

Los resultados de la preparación visual y técnica están en `VERIFICATION.md` y `screenshots/`. Las fórmulas y pruebas del dominio se documentan en `DOMAIN.md` y `VERIFICATION-10A.md`. La persistencia se describe en `PERSISTENCE.md`. La configuración y sus pruebas se documentan en `WIZARD.md` y `VERIFICATION-10C.md`.

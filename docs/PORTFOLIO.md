# DecisionLab · texto para portafolio

**CV (dos líneas).** Desarrollé DecisionLab, una aplicación frontend para comparar alternativas con criterios ponderados, explicar resultados y simular cambios de prioridades. Implementé lógica de dominio, persistencia IndexedDB, respaldos JSON, interfaz responsive y pruebas automatizadas con Vitest y Playwright.

**LinkedIn / GitHub.** DecisionLab convierte una decisión con varias opciones en un proceso verificable: define alternativas, criterios y pesos; registra valoraciones; muestra el aporte de cada criterio y permite comprobar qué cambia cuando varían las prioridades. Construí el producto con HTML, CSS y JavaScript modular, sin backend ni framework de interfaz. La lógica de evaluación está separada de las vistas y los resultados se recalculan a partir de los datos guardados localmente. La importación y exportación JSON resuelven el respaldo manual entre dispositivos. El desarrollo incluyó diseño responsive, navegación accesible, pruebas de operaciones reales y revisión del sitio compilado para alojamiento estático.

**Tecnologías.** HTML5, CSS3, JavaScript ES Modules, Vite, IndexedDB, Vitest y Playwright.

**Funciones destacadas.** Comparaciones ponderadas, desglose de puntuaciones, simulación de un escenario alternativo, respaldo JSON e informe imprimible.

**Aprendizajes técnicos.** El proyecto exigió distinguir borradores de evaluaciones completas, conservar la integridad de las referencias entre entidades, explicar diferencias entre empate calculado y redondeo visible, y diseñar una recuperación de datos honesta para almacenamiento por origen. El despliegue estático conserva rutas directas mediante fragmentos y usa una ruta base ajustada al repositorio.

**Enlaces.** Repositorio y aplicación: pendientes hasta la publicación autorizada. Las [capturas](../README.md#capturas) muestran la interfaz y el [modelo](DOMAIN.md) documenta el cálculo.

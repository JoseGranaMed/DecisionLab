# Publicación en GitHub Pages

El repositorio público es [JoseGranaMed/DecisionLab](https://github.com/JoseGranaMed/DecisionLab) y la aplicación está en [GitHub Pages](https://josegranamed.github.io/DecisionLab/). El flujo `.github/workflows/verify-and-publish.yml` comprueba código, pruebas de navegador y una compilación servida bajo una subruta; solo tras superarlas construye `dist/` y lo publica al recibir un `push` a `main` o una ejecución manual. En solicitudes de cambio solo ejecuta verificaciones.

## Configuración aplicada y mantenimiento

1. La rama `main` del proyecto Git original se subió con su historial. `node_modules`, `dist`, datos personales y respaldos reales quedan fuera del repositorio.
2. Pages se habilitó con **Source: GitHub Actions**. El token predeterminado de `configure-pages` consulta la configuración, pero no habilita Pages por sí solo.
3. `configure-pages` proporciona la ruta base real (`/DecisionLab/`) y Vite construye ambas entradas HTML con ella. La navegación interna usa fragmentos y no requiere reglas de reescritura.
4. Tras futuros cambios, comprobar el [flujo de Actions](https://github.com/JoseGranaMed/DecisionLab/actions) y abrir la landing y `/app/`. Probar un enlace directo a un proyecto, resultados, escenarios, informe, exportación JSON y navegación móvil.

La publicación crea un **origen nuevo** para IndexedDB. Los proyectos del entorno local no aparecerán allí automáticamente; pueden trasladarse mediante un respaldo JSON. Borrar datos del sitio puede eliminar los proyectos de ese origen. Google Fonts genera solicitudes externas y la aplicación no se presenta como completamente disponible sin conexión. Según la configuración de la cuenta, un sitio de Pages puede quedar públicamente accesible incluso cuando el repositorio sea privado: comprobar la visibilidad antes de confirmar el despliegue.

Referencias: [flujos personalizados de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [configurar la fuente de publicación](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

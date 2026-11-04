# Preparación para GitHub Pages

El repositorio no se ha creado ni publicado. El flujo `.github/workflows/verify-and-publish.yml` comprueba código, pruebas de navegador y una compilación servida bajo una subruta; solo tras superarlas construye `dist/` y lo publica en GitHub Pages al recibir un `push` a `main` o una ejecución manual. En solicitudes de cambio solo ejecuta verificaciones.

## Configuración tras la autorización

1. Crear el repositorio en la cuenta y con el nombre, visibilidad y licencia expresamente aprobados. Subir únicamente el proyecto preparado. No subir `node_modules`, `dist`, datos personales ni respaldos reales.
2. En **Settings → Pages → Build and deployment**, elegir **Source: GitHub Actions**. El token predeterminado de `configure-pages` consulta la configuración, pero no habilita Pages por sí solo.
3. Ejecutar o esperar el flujo de Actions. `configure-pages` proporciona la ruta base real (`/nombre-del-repositorio` o vacía para un sitio de usuario) y Vite construye ambas entradas HTML con ella. La navegación interna usa fragmentos y no requiere reglas de reescritura.
4. Abrir la landing y `/app/` en la URL publicada. Probar un enlace directo a un proyecto, el ejemplo, resultados, escenarios, informe, exportación JSON y navegación móvil. Confirmar que no hay recursos fallidos ni desbordamiento horizontal.

La publicación crea un **origen nuevo** para IndexedDB. Los proyectos del entorno local no aparecerán allí automáticamente; pueden trasladarse mediante un respaldo JSON. Borrar datos del sitio puede eliminar los proyectos de ese origen. Google Fonts genera solicitudes externas y la aplicación no se presenta como completamente disponible sin conexión. Según la configuración de la cuenta, un sitio de Pages puede quedar públicamente accesible incluso cuando el repositorio sea privado: comprobar la visibilidad antes de confirmar el despliegue.

Referencias: [flujos personalizados de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [configurar la fuente de publicación](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

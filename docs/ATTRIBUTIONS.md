# Licencia y atribuciones

## Decisión pendiente

Se recomienda **MIT** para el código de DecisionLab si sus titulares desean permitir uso, modificación y redistribución con conservación del aviso de derechos. Antes de crear `LICENSE` hacen falta la elección explícita y el nombre del titular de los derechos. La publicación del repositorio, incluso si fuera privado, no cambia por sí sola la titularidad ni otorga una licencia de reutilización. El `private: true` de `package.json` impide publicar el paquete en npm por accidente; no determina la visibilidad del repositorio.

## Recursos de terceros

- La interfaz carga **Inter** y **Manrope** desde Google Fonts. Sus archivos en el catálogo de Google Fonts declaran la [SIL Open Font License 1.1 para Inter](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt) y la [SIL Open Font License 1.1 para Manrope](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt). No se distribuyen archivos de fuentes dentro del repositorio.
- Vite, ESLint, Prettier, Vitest y Playwright se instalan como dependencias de desarrollo según `package-lock.json`; no se copian sus fuentes en el repositorio.
- El símbolo de DecisionLab y los iconos de interfaz son SVG definidos en `src/shared/components/brand.js` e `icons.js`. Las capturas muestran el ejemplo ilustrativo incluido en el proyecto. No se detectaron imágenes generadas por IA ni archivos multimedia de terceros en el código de producción.

La elección de licencia para el código no sustituye las licencias de los recursos de terceros. Revisar de nuevo las atribuciones si se incorporan nuevos recursos antes de publicar.

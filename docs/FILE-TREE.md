# Estructura del proyecto · cierre del MVP

```text
DecisionLab/
├── index.html                 Landing independiente
├── app/index.html             Espacio de trabajo
├── package.json               Comandos y herramientas de calidad
├── vite.config.js             Compilación estática
├── playwright.config.js       Pruebas en navegador
├── src/
│   ├── app/                   Router, estado de edición, shell
│   ├── data/                  IndexedDB, repositorio y respaldo JSON
│   ├── domain/                Modelo, fechas, validación, cálculo y escenarios
│   ├── features/
│   │   ├── dashboard/          Resumen
│   │   ├── projects/           Proyectos y edición
│   │   ├── wizard/             Pasos de configuración
│   │   ├── evaluation/         Respuestas
│   │   ├── results/            Clasificación y aportes
│   │   ├── scenarios/          Simulación de prioridades
│   │   ├── transfer/           Exportación e importación
│   │   └── report/             Informe HTML e impresión
│   ├── landing/               Hero y secciones editoriales
│   ├── shared/                Componentes, iconos y ejemplo oficial
│   └── styles/                Tokens y estilos base
├── tests/
│   ├── unit/                  Dominio, respaldo, estado e informe
│   ├── smoke/                 Entradas y rutas básicas
│   └── e2e/                   Operaciones, persistencia y responsive
├── scripts/                   Capturas y verificación del sitio compilado
└── docs/                      Arquitectura, uso, auditoría y evidencias
```

`docs/AUDIT-11A.md` conserva el diagnóstico previo. `docs/VERIFICATION-11B.md` relaciona cada hallazgo con su corrección y prueba. `docs/evidence-11B/` contiene las nuevas capturas, medidas responsive y muestras de impresión. `node_modules/` y `dist/` son generados y no forman parte del ZIP de entrega.

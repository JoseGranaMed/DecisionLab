# Árbol de archivos · fase 10C

```text
DecisionLab/
├── README.md
├── index.html, app/index.html
├── package.json, package-lock.json
├── vite.config.js, playwright.config.js, eslint.config.js
├── scripts/
│   ├── capture.mjs
│   ├── capture-projects.mjs
│   └── capture-wizard.mjs                      [10C]
├── src/
│   ├── app/
│   │   ├── main.js, router.js                 [actualizados 10C]
│   │   ├── navigation-state.js
│   │   ├── project-state.js
│   │   └── shell.css
│   ├── data/
│   │   └── indexeddb.js, project-repository.js
│   ├── domain/
│   │   ├── setup.js                           [10C]
│   │   ├── model.js, validation.js, index.js  [actualizados 10C]
│   │   └── evaluation.js, normalization.js, scenarios.js
│   ├── features/
│   │   ├── wizard/wizard.js, wizard.css        [10C]
│   │   ├── projects/projects.js, projects.css
│   │   ├── dashboard/dashboard.js, dashboard.css
│   │   └── demo/demo-views.js, demo.css
│   ├── landing/main.js, landing.css
│   ├── shared/components/, shared/demo/
│   └── styles/base.css, tokens.css
├── tests/
│   ├── e2e/navigation.spec.js, projects.spec.js, wizard.spec.js
│   ├── smoke/render.test.js, router.test.js
│   ├── unit/domain-*.test.js, navigation-state.test.js,
│   │   project-state.test.js, setup.test.js
│   └── fixtures/official-example.js
└── docs/
    ├── ARCHITECTURE.md, DOMAIN.md, PERSISTENCE.md
    ├── WIZARD.md, FILE-TREE.md
    ├── VERIFICATION.md, VERIFICATION-10A.md,
    │   VERIFICATION-10B.md, VERIFICATION-10C.md,
    │   VERIFICATION-10C1.md
    └── screenshots/ (capturas de las fases 9A, 10B, 10C y 10C.1)
```

El ZIP incluye código, configuración, pruebas, documentación y capturas. Excluye `.git/`, `node_modules/`, `dist/` y resultados temporales de pruebas.

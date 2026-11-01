# Árbol de archivos · fase 10D

```text
DecisionLab/
├── README.md
├── index.html, app/index.html
├── package.json, package-lock.json
├── vite.config.js, playwright.config.js, eslint.config.js
├── scripts/
│   ├── capture.mjs, capture-projects.mjs, capture-wizard.mjs
│   └── capture-evaluation.mjs                  [10D]
├── src/
│   ├── app/
│   │   ├── main.js, router.js                  [actualizados 10D]
│   │   ├── navigation-state.js, project-state.js
│   │   └── shell.css
│   ├── data/indexeddb.js, project-repository.js
│   ├── domain/
│   │   ├── answers.js                          [10D]
│   │   ├── setup.js
│   │   ├── model.js, validation.js, index.js   [actualizados 10D]
│   │   └── evaluation.js, normalization.js, scenarios.js
│   ├── features/
│   │   ├── evaluation/evaluation.js, evaluation.css [10D]
│   │   ├── wizard/wizard.js, wizard.css         [actualizados 10D]
│   │   ├── projects/projects.js, projects.css
│   │   ├── dashboard/dashboard.js, dashboard.css
│   │   └── demo/demo-views.js, demo.css
│   ├── landing/main.js, landing.css
│   ├── shared/components/, shared/demo/
│   └── styles/base.css, tokens.css
├── tests/
│   ├── e2e/navigation.spec.js, projects.spec.js,
│   │   wizard.spec.js, evaluation.spec.js      [10D]
│   ├── smoke/render.test.js, router.test.js    [router actualizado 10D]
│   ├── unit/domain-*.test.js, navigation-state.test.js,
│   │   project-state.test.js, setup.test.js, answers.test.js [10D]
│   └── fixtures/official-example.js
└── docs/
    ├── ARCHITECTURE.md, DOMAIN.md, PERSISTENCE.md
    ├── WIZARD.md, EVALUATION.md, FILE-TREE.md
    ├── VERIFICATION.md, VERIFICATION-10A.md,
    │   VERIFICATION-10B.md, VERIFICATION-10C.md,
    │   VERIFICATION-10C1.md, VERIFICATION-10D.md [10D]
    └── screenshots/ (capturas históricas y seis capturas 10D)
```

El ZIP incluye código, configuración, pruebas, documentación y capturas. Excluye `.git/`, `node_modules/`, `dist/` y resultados temporales.

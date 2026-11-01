# Árbol de archivos · fase 10E

```text
DecisionLab/
├── README.md
├── index.html, app/index.html
├── package.json, package-lock.json
├── vite.config.js, playwright.config.js, eslint.config.js
├── scripts/
│   ├── capture.mjs, capture-projects.mjs, capture-wizard.mjs
│   ├── capture-evaluation.mjs                  [10D]
│   └── capture-results.mjs                     [10E]
├── src/
│   ├── app/
│   │   ├── main.js, router.js                  [actualizados 10E]
│   │   ├── navigation-state.js, project-state.js
│   │   └── shell.css
│   ├── data/indexeddb.js, project-repository.js
│   ├── domain/
│   │   ├── answers.js                          [10D]
│   │   ├── setup.js
│   │   ├── model.js, validation.js, index.js   [model/validation actualizados 10E]
│   │   └── evaluation.js, normalization.js, scenarios.js
│   ├── features/
│   │   ├── evaluation/evaluation.js, evaluation.css [10D]
│   │   ├── results/presentation.js, results.js, results.css [10E]
│   │   ├── wizard/wizard.js, wizard.css         [wizard.js actualizado 10E]
│   │   ├── projects/projects.js, projects.css  [projects.js actualizado 10E]
│   │   ├── dashboard/dashboard.js, dashboard.css [dashboard.js actualizado 10E]
│   │   └── demo/demo-views.js, demo.css         [demo-views.js actualizado 10E]
│   ├── landing/main.js, landing.css
│   ├── shared/components/, shared/demo/        [app-shell.js actualizado 10E]
│   └── styles/base.css, tokens.css
├── tests/
│   ├── e2e/navigation.spec.js, projects.spec.js,
│   │   wizard.spec.js, evaluation.spec.js,
│   │   results.spec.js                          [10E]
│   ├── smoke/render.test.js, router.test.js    [router actualizado 10E]
│   ├── unit/domain-*.test.js, navigation-state.test.js,
│   │   project-state.test.js, setup.test.js, answers.test.js,
│   │   results.test.js                          [10E]
│   └── fixtures/official-example.js
└── docs/
    ├── ARCHITECTURE.md, DOMAIN.md, PERSISTENCE.md
    ├── WIZARD.md, EVALUATION.md, RESULTS.md, FILE-TREE.md
    ├── VERIFICATION.md, VERIFICATION-10A.md,
    │   VERIFICATION-10B.md, VERIFICATION-10C.md,
    │   VERIFICATION-10C1.md, VERIFICATION-10D.md,
    │   VERIFICATION-10E.md                     [10E]
    └── screenshots/ (capturas históricas y once capturas 10E)
```

El ZIP incluye código, configuración, pruebas, documentación y capturas. Excluye `.git/`, `node_modules/`, `dist/` y resultados temporales.

# Árbol de archivos · fase 10F

```text
DecisionLab/
├── README.md
├── index.html, app/index.html
├── package.json, package-lock.json
├── vite.config.js, playwright.config.js, eslint.config.js
├── scripts/
│   ├── capture.mjs, capture-projects.mjs, capture-wizard.mjs
│   ├── capture-evaluation.mjs                  [10D]
│   ├── capture-results.mjs                     [10E]
│   └── capture-scenarios.mjs                   [10F]
├── src/
│   ├── app/
│   │   ├── main.js, router.js                  [actualizados 10F]
│   │   ├── navigation-state.js, project-state.js
│   │   └── shell.css
│   ├── data/indexeddb.js, project-repository.js
│   ├── domain/
│   │   ├── answers.js                          [10D]
│   │   ├── setup.js
│   │   ├── model.js, validation.js, index.js   [validation/index actualizados 10F]
│   │   ├── scenario-operations.js              [10F]
│   │   └── evaluation.js, normalization.js, scenarios.js
│   ├── features/
│   │   ├── evaluation/evaluation.js, evaluation.css [10D]
│   │   ├── results/presentation.js, results.js, results.css [10E]
│   │   ├── scenarios/scenarios.js, scenarios.css [10F]
│   │   ├── wizard/wizard.js, wizard.css         [wizard.js actualizado 10E]
│   │   ├── projects/projects.js, projects.css  [projects.js actualizado 10F]
│   │   ├── dashboard/dashboard.js, dashboard.css [dashboard.js actualizado 10F]
│   │   └── demo/demo-views.js, demo.css         [demo-views.js actualizado 10F]
│   ├── landing/main.js, landing.css
│   ├── shared/components/, shared/demo/, shared/numbers.js [10F]
│   └── styles/base.css, tokens.css            [base.css actualizado 10F]
├── tests/
│   ├── e2e/navigation.spec.js, projects.spec.js,
│   │   wizard.spec.js, evaluation.spec.js,
│   │   results.spec.js, scenarios.spec.js      [10F]
│   ├── smoke/render.test.js, router.test.js    [router actualizado 10E]
│   ├── unit/domain-*.test.js, navigation-state.test.js,
│   │   project-state.test.js, setup.test.js, answers.test.js,
│   │   results.test.js, scenarios.test.js      [10F]
│   └── fixtures/official-example.js
└── docs/
    ├── ARCHITECTURE.md, DOMAIN.md, PERSISTENCE.md
    ├── WIZARD.md, EVALUATION.md, RESULTS.md, SCENARIOS.md, FILE-TREE.md
    ├── VERIFICATION.md, VERIFICATION-10A.md,
    │   VERIFICATION-10B.md, VERIFICATION-10C.md,
    │   VERIFICATION-10C1.md, VERIFICATION-10D.md,
    │   VERIFICATION-10E.md, VERIFICATION-10F.md [10F]
    └── screenshots/ (capturas históricas y capturas 10F)
```

El ZIP incluye código, configuración, pruebas, documentación y capturas. Excluye `.git/`, `node_modules/`, `dist/` y resultados temporales.

import '../styles/base.css';
import './shell.css';
import '../features/dashboard/dashboard.css';
import '../features/demo/demo.css';
import '../features/projects/projects.css';
import '../features/wizard/wizard.css';
import '../features/evaluation/evaluation.css';
import '../features/results/results.css';
import '../features/scenarios/scenarios.css';
import '../features/transfer/transfer.css';
import '../features/report/report.css';
import { createRouter, routeNames } from './router.js';
import { createNavigationState } from './navigation-state.js';
import { createProjectState } from './project-state.js';
import { createProjectRepository } from '../data/project-repository.js';
import { appShell, bindShell, syncActiveNavigation } from '../shared/components/app-shell.js';
import { renderDashboard, mountDashboard } from '../features/dashboard/dashboard.js';
import { renderDemoView } from '../features/demo/demo-views.js';
import {
  renderComparisons,
  mountComparisons,
  renderProjectEditor,
  mountProjectEditor,
  updateSaveState,
} from '../features/projects/projects.js';
import { officialExampleProject } from '../shared/demo/official-project.js';
import { renderEvaluationPage, mountEvaluation } from '../features/evaluation/evaluation.js';
import {
  renderResultsPage,
  mountResultsPage,
  renderResultsIndex,
  mountResultsIndex,
} from '../features/results/results.js';
import {
  renderScenariosPage,
  mountScenariosPage,
  renderScenariosIndex,
  mountScenariosIndex,
} from '../features/scenarios/scenarios.js';
import { createTransferService } from '../features/transfer/transfer-service.js';
import { renderTransferPage, mountTransferPage } from '../features/transfer/transfer.js';
import { renderReportPage, mountReportPage } from '../features/report/report.js';
import {
  stepFromHash,
  wizardPath,
  renderWizardChrome,
  renderWizardStep,
  renderWizardFooter,
  mountWizardNavigation,
  mountWizardStep,
} from '../features/wizard/wizard.js';

const root = document.querySelector('#app-root');
root.innerHTML = appShell();
const navigation = createNavigationState(window.matchMedia('(max-width: 1000px)').matches);
const shell = bindShell(root, navigation);
const main = root.querySelector('#main-content');
const repository = createProjectRepository();
const projects = createProjectState(repository);
const transfer = createTransferService(repository);
let currentHash = window.location.hash || '#/dashboard';
let renderId = 0;
let validateEditor = null;
let wizardHasInvalid = () => false;

function setPage(route) {
  const name = routeNames[route] ?? 'Página no encontrada';
  root.querySelector('#route-title').textContent = name;
  document.title = `${name} — DecisionLab`;
  syncActiveNavigation(
    root,
    route === 'project' || route === 'project-report'
      ? 'comparisons'
      : route === 'project-scenarios'
        ? 'scenarios'
        : route,
  );
  shell.closeMenu();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function showError(heading, message) {
  main.innerHTML =
    '<div class="page-title"><div><h1></h1></div></div><div class="demo-panel"><p></p><button class="btn btn--outline" type="button" data-action="retry-route">Reintentar</button> <a class="btn btn--primary" href="#/comparisons">Mis comparaciones</a></div>';
  main.querySelector('h1').textContent = heading;
  main.querySelector('.demo-panel p').textContent = message;
}

function selectedProjectId() {
  try {
    return decodeURIComponent(window.location.hash.slice('#/project/'.length).split('/')[0]);
  } catch {
    return '';
  }
}

async function renderRoute(route) {
  const requestId = ++renderId;
  const nextHash = window.location.hash;
  if (
    nextHash !== currentHash &&
    wizardHasInvalid() &&
    !window.confirm(
      'Hay un valor inválido que no pudo guardarse. ¿Salir de este paso y descartarlo?',
    )
  ) {
    window.history.replaceState(null, '', currentHash);
    router.resetCurrentHash();
    return;
  }
  if (nextHash !== currentHash && projects.snapshot().dirty) {
    const saved = await projects.saveNow();
    if (!saved && !window.confirm('No se pudieron guardar los cambios. ¿Salir y descartarlos?')) {
      window.history.replaceState(null, '', currentHash);
      router.resetCurrentHash();
      return;
    }
    if (!saved) projects.discard();
  }
  currentHash = nextHash;
  validateEditor = null;
  wizardHasInvalid = () => false;
  try {
    if (route === 'new' || route === 'example') {
      const record = await projects.create(
        route === 'example' ? { template: officialExampleProject() } : {},
      );
      if (requestId === renderId)
        window.location.hash = `#/project/${encodeURIComponent(record.id)}`;
      return;
    }
    if (route === 'project' || route === 'project-scenarios' || route === 'project-report') {
      const record = await projects.open(selectedProjectId(), () => requestId === renderId);
      if (requestId !== renderId) return;
      if (!record) {
        showError('Proyecto no encontrado', 'El proyecto solicitado no existe en este navegador.');
      } else if (route === 'project-scenarios') {
        main.innerHTML = renderScenariosPage();
        mountScenariosPage(main, projects, record.id);
        wizardHasInvalid = () => main.dataset.scenarioInvalid === 'true';
        updateSaveState(main, projects.snapshot());
      } else if (route === 'project-report') {
        main.innerHTML = renderReportPage();
        mountReportPage(main, record.project, record.id);
      } else {
        const id = record.id;
        const step = stepFromHash(nextHash);
        if (
          /^#\/project\/[^/]+$/.test(nextHash) &&
          record.project.workflowStep &&
          record.project.workflowStep !== 'details'
        ) {
          window.location.hash = wizardPath(id, record.project.workflowStep);
          return;
        }
        if (record.project.workflowStep !== step) projects.edit({ workflowStep: step });
        main.innerHTML =
          renderWizardChrome(step) +
          (step === 'details'
            ? renderProjectEditor()
            : step === 'evaluation'
              ? renderEvaluationPage()
              : step === 'results'
                ? renderResultsPage()
                : renderWizardStep(step)) +
          renderWizardFooter(step);
        mountWizardNavigation(main, id, step);
        if (step === 'details')
          validateEditor = mountProjectEditor(main, record.project, (fields) =>
            projects.edit(fields),
          );
        else if (step === 'results') mountResultsPage(main, projects.snapshot().active, id);
        else
          wizardHasInvalid =
            step === 'evaluation'
              ? mountEvaluation(main, projects, id).hasInvalid
              : mountWizardStep(main, projects, step).hasInvalid;
        updateSaveState(main, projects.snapshot());
      }
    } else if (
      route === 'dashboard' ||
      route === 'comparisons' ||
      route === 'results' ||
      route === 'scenarios' ||
      route === 'settings'
    ) {
      const records = await projects.refresh();
      if (requestId !== renderId) return;
      main.innerHTML =
        route === 'dashboard'
          ? renderDashboard()
          : route === 'results'
            ? renderResultsIndex()
            : route === 'scenarios'
              ? renderScenariosIndex()
              : route === 'settings'
                ? renderTransferPage()
                : renderComparisons();
      if (route === 'dashboard') mountDashboard(main, records);
      else if (route === 'results') mountResultsIndex(main, records);
      else if (route === 'scenarios') mountScenariosIndex(main, records);
      else if (route === 'settings')
        mountTransferPage(main, transfer, records, () => projects.refresh());
      else mountComparisons(main, records);
    } else main.innerHTML = renderDemoView(route);
  } catch (error) {
    if (requestId !== renderId) return;
    showError(
      'No se pudieron cargar tus proyectos',
      error.message || 'Comprueba el almacenamiento del navegador y vuelve a intentarlo.',
    );
  }
  setPage(route);
}

projects.subscribe((state) => updateSaveState(main, state));

main.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === 'open') window.location.hash = `#/project/${encodeURIComponent(id)}`;
    if (action === 'retry-route') await renderRoute(createRouterRoute());
    if (action === 'save') {
      validateEditor?.();
      await projects.saveNow();
    }
    if (action === 'export') {
      const status = main.querySelector('#projects-transfer-status');
      try {
        const filename = await transfer.exportOne(id);
        if (status) status.textContent = `Descargando ${filename}.`;
      } catch (cause) {
        if (status) status.textContent = cause.message || 'No se pudo exportar el proyecto.';
      }
    }
    if (action === 'duplicate') {
      const copy = await projects.duplicate(id);
      window.location.hash = `#/project/${encodeURIComponent(copy.id)}`;
    }
    if (action === 'delete') {
      const record = projects.snapshot().records.find((item) => item.id === id);
      if (
        record &&
        window.confirm(
          `¿Eliminar «${record.project.name || 'Sin título'}»? Esta acción no se puede deshacer.`,
        )
      ) {
        await projects.remove(id, record.revision);
        await renderRoute('comparisons');
      }
    }
  } catch (error) {
    showError('No se pudo completar la operación', error.message || 'Vuelve a intentarlo.');
  }
});

window.addEventListener('beforeunload', (event) => {
  if (projects.snapshot().dirty || wizardHasInvalid()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

function createRouterRoute() {
  return window.location.hash.startsWith('#/project/')
    ? window.location.hash.endsWith('/scenarios')
      ? 'project-scenarios'
      : window.location.hash.endsWith('/report')
        ? 'project-report'
        : 'project'
    : window.location.hash.slice(2) || 'dashboard';
}

const router = createRouter(window, (route) => {
  void renderRoute(route);
});
router.start();

import '../styles/base.css';
import './shell.css';
import '../features/dashboard/dashboard.css';
import '../features/demo/demo.css';
import '../features/projects/projects.css';
import '../features/wizard/wizard.css';
import '../features/evaluation/evaluation.css';
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
const projects = createProjectState(createProjectRepository());
let currentHash = window.location.hash || '#/dashboard';
let renderId = 0;
let validateEditor = null;
let wizardHasInvalid = () => false;

function setPage(route) {
  const name = routeNames[route] ?? 'Página no encontrada';
  root.querySelector('#route-title').textContent = name;
  document.title = `${name} — DecisionLab`;
  syncActiveNavigation(root, route === 'project' ? 'comparisons' : route);
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
    if (route === 'project') {
      const record = await projects.open(selectedProjectId(), () => requestId === renderId);
      if (requestId !== renderId) return;
      if (!record) {
        showError('Proyecto no encontrado', 'El proyecto solicitado no existe en este navegador.');
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
              : renderWizardStep(step)) +
          renderWizardFooter(step);
        mountWizardNavigation(main, id, step);
        if (step === 'details')
          validateEditor = mountProjectEditor(main, record.project, (fields) =>
            projects.edit(fields),
          );
        else
          wizardHasInvalid =
            step === 'evaluation'
              ? mountEvaluation(main, projects, id).hasInvalid
              : mountWizardStep(main, projects, step).hasInvalid;
        updateSaveState(main, projects.snapshot());
      }
    } else if (route === 'dashboard' || route === 'comparisons') {
      const records = await projects.refresh();
      if (requestId !== renderId) return;
      main.innerHTML = route === 'dashboard' ? renderDashboard() : renderComparisons();
      if (route === 'dashboard') mountDashboard(main, records);
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
    ? 'project'
    : window.location.hash.slice(2) || 'dashboard';
}

const router = createRouter(window, (route) => {
  void renderRoute(route);
});
router.start();

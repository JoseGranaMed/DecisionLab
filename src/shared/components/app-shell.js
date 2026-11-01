import { brand } from './brand.js';
import { icon } from './icons.js';

const mainItems = [
  { route: 'dashboard', label: 'Resumen', icon: 'overview' },
  { route: 'comparisons', label: 'Mis comparaciones', icon: 'list' },
  { route: 'new', label: 'Nueva comparación', icon: 'plus', prominent: true },
];

function navLink(item, extraClass = '') {
  return `<a class="nav-link ${item.prominent ? 'nav-link--create' : ''} ${extraClass}" href="#/${item.route}" data-route="${item.route}" aria-label="${item.label}">
    ${icon(item.icon)}<span class="nav-label">${item.label}</span></a>`;
}

export function appShell() {
  return `
    <div class="prototype-ribbon">Tus proyectos se guardan en este navegador · Sin sincronización</div>
    <div class="app-shell" id="app-shell">
      <aside class="sidebar" id="sidebar" aria-label="Navegación principal">
        <div class="sidebar-head">${brand({ href: '#/dashboard' })}
          <button class="icon-button collapse-button" id="collapse-button" type="button" aria-label="Contraer menú" title="Contraer menú">${icon('chevron')}</button></div>
        <div class="sidebar-main">${mainItems.map((item) => navLink(item)).join('')}</div>
        <div class="sidebar-bottom">
          <a class="nav-link" href="#/settings" data-route="settings">${icon('settings')}<span class="nav-label">Configuración</span></a>
          <a class="nav-link" href="../">${icon('arrow')}<span class="nav-label">Inicio</span></a>
        </div>
      </aside>
      <div class="app-frame">
        <header class="app-header">
          <div class="header-location"><span class="header-location-prefix">Espacio de trabajo / </span><span id="route-title">Resumen</span></div>
          <a class="mobile-brand" href="#/dashboard">Decision<span>Lab</span></a>
          <button class="menu-button" id="menu-button" type="button" aria-label="Abrir más opciones" aria-controls="mobile-menu" aria-expanded="false">${icon('menu')}</button>
        </header>
        <main id="main-content" tabindex="-1"></main>
      </div>
      <nav class="bottom-nav" aria-label="Navegación móvil">
        <a href="#/dashboard" data-route="dashboard">${icon('overview')}<span>Resumen</span></a>
        <a href="#/comparisons" data-route="comparisons">${icon('list')}<span>Proyectos</span></a>
        <a href="#/new" data-route="new">${icon('plus')}<span>Nueva</span></a>
      </nav>
      <div class="mobile-menu" id="mobile-menu" hidden>
        <div class="mobile-menu-title"><b>Más opciones</b><button class="icon-button" id="menu-close" type="button" aria-label="Cerrar menú">×</button></div>
        <a href="#/results" data-route="results">Resultados</a>
        <a href="#/scenarios" data-route="scenarios">Escenarios</a>
        <a href="#/settings" data-route="settings">Configuración</a>
        <a href="../">Inicio</a>
      </div>
    </div>`;
}

export function bindShell(root, state) {
  const shell = root.querySelector('#app-shell');
  const collapse = root.querySelector('#collapse-button');
  const menuButton = root.querySelector('#menu-button');
  const menu = root.querySelector('#mobile-menu');

  function syncSidebar() {
    shell.classList.toggle('is-collapsed', state.collapsed);
    collapse.setAttribute('aria-label', state.collapsed ? 'Expandir menú' : 'Contraer menú');
    collapse.title = state.collapsed ? 'Expandir menú' : 'Contraer menú';
  }
  function setMenu(open) {
    state.setMenuOpen(open);
    menu.hidden = !state.menuOpen;
    menuButton.setAttribute('aria-expanded', String(state.menuOpen));
    menuButton.setAttribute(
      'aria-label',
      state.menuOpen ? 'Cerrar más opciones' : 'Abrir más opciones',
    );
  }
  syncSidebar();
  collapse.addEventListener('click', () => {
    state.toggleSidebar();
    syncSidebar();
  });
  menuButton.addEventListener('click', () => setMenu(!state.menuOpen));
  root.querySelector('#menu-close').addEventListener('click', () => {
    setMenu(false);
    menuButton.focus();
  });
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.menuOpen) {
      setMenu(false);
      menuButton.focus();
    }
  });
  return { closeMenu: () => setMenu(false) };
}

export function syncActiveNavigation(root, route) {
  root.querySelectorAll('[data-route]').forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

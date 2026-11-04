import '../styles/base.css';
import './landing.css';
import { brand } from '../shared/components/brand.js';
import { icon } from '../shared/components/icons.js';
import { example } from '../shared/demo/example.js';

const app = './app/#';
const [first, second] = example.alternatives;

document.querySelector('#landing-root').innerHTML = `
  <div class="prototype-ribbon">Proyectos guardados en este navegador · Ejemplo ilustrativo</div>
  <header class="landing-header wrap">
    ${brand({ href: './' })}
    <nav class="landing-links" aria-label="Secciones de la página">
      <a href="#how">Cómo funciona</a><a href="#privacy">Tus datos</a>
    </nav>
    <a class="btn btn--quiet landing-open" href="${app}/dashboard">
      <span class="landing-open-full">Abrir espacio de trabajo</span>
      <span class="landing-open-short">Abrir app</span>${icon('arrow')}
    </a>
  </header>
  <main>
    <section class="hero wrap" aria-labelledby="landing-title">
      <div class="hero-copy">
        <p class="eyebrow">Herramienta de comparación multicriterio</p>
        <h1 id="landing-title">Compara opciones según <em>lo que más te importa.</em></h1>
        <p>Registra alternativas y criterios, asigna pesos y revisa cómo cambia la clasificación cuando ajustas tus prioridades.</p>
        <div class="hero-actions">
          <a class="btn btn--primary" href="${app}/example">Abrir un ejemplo <span aria-hidden="true">→</span></a>
          <a class="btn btn--outline" href="${app}/example/evaluation">Ver cómo se evalúa</a>
        </div>
      </div>
      <figure class="decision-preview" aria-label="Resumen de la comparación de ejemplo">
        <figcaption class="preview-heading">
          <span class="preview-context">Ejemplo de comparación · datos ilustrativos</span>
          <h2>${example.title}</h2>
          <p>3 alternativas · 4 criterios</p>
        </figcaption>
        <div class="preview-weights" aria-label="Pesos del escenario base">
          ${example.weights.map(({ label, base }) => `<div><span>${label}</span><strong>${base}</strong></div>`).join('')}
        </div>
        <div class="preview-ranking">
          <span class="preview-ranking-note">Dos primeras posiciones · puntos / 100</span>
          ${[first, second]
            .map(
              ({ name, base, percent }, index) => `
            <div class="preview-row">
              <div class="preview-name"><small>0${index + 1}</small><span>${name}</span></div>
              <div class="preview-track" aria-hidden="true"><span style="width:${percent}"></span></div>
              <strong>${base}</strong>
            </div>`,
            )
            .join('')}
        </div>
        <div class="preview-variation">
          <div><span class="preview-context">Al cambiar los pesos</span>
            <p>Si el costo pasa a ser prioritario, <strong>la herramienta B queda primera.</strong></p></div>
          <div class="preview-scores"><strong>B 70</strong><small>A · 60</small></div>
        </div>
        <div class="preview-foot"><span>Resumen ilustrativo, sin cálculo activo</span>
          <a class="preview-link" href="${app}/example/results">Revisar el resultado ${icon('arrow')}</a></div>
      </figure>
    </section>
    <section class="how wrap" id="how" aria-labelledby="how-title">
      <div class="section-intro"><h2 id="how-title">Así funciona una comparación</h2>
        <p>Define las opciones, registra valores comparables y revisa el resultado.</p></div>
      <div class="how-steps">
        <div class="how-step"><span>01</span><h3>Define</h3><p>Escribe la decisión, las alternativas y los criterios que importan.</p></div>
        <div class="how-step"><span>02</span><h3>Evalúa</h3><p>Introduce valores y pesos con escalas y rangos explícitos.</p></div>
        <div class="how-step"><span>03</span><h3>Explora</h3><p>Consulta aportes, cambia pesos y compara dos escenarios.</p></div>
      </div>
    </section>
    <section class="data-note wrap" id="privacy" aria-labelledby="privacy-title">
      <div><span class="data-note-label">Almacenamiento local</span>
        <h2 id="privacy-title">Tus comparaciones quedan en este navegador.</h2></div>
      <div><p>Puedes guardar proyectos en este dispositivo y descargar copias JSON desde Configuración para recuperarlos después.</p>
        <p class="data-note-fine">Sin cuenta ni sincronización entre equipos. Los proyectos pueden perderse si se borran los datos del navegador.</p></div>
    </section>
  </main>
  <footer class="landing-footer wrap">${brand({ small: true })}<span>DecisionLab · versión inicial</span></footer>
`;

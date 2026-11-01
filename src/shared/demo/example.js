// Datos fijos del ejemplo aprobado. Ningún resultado se calcula en esta iteración.
export const example = Object.freeze({
  title: 'Herramientas para el equipo',
  alternatives: Object.freeze([
    { name: 'Herramienta A', base: '67,50', alternate: '60,00', percent: '67.5%' },
    { name: 'Herramienta B', base: '66,25', alternate: '70,00', percent: '66.25%' },
    { name: 'Herramienta C', base: '46,25', alternate: '32,50', percent: '46.25%' },
  ]),
  weights: Object.freeze([
    { label: 'Facilidad de uso', base: '37,5 %', alternate: '12,5 %' },
    { label: 'Costo mensual', base: '25 %', alternate: '50 %' },
    { label: 'Integraciones + soporte', base: '37,5 %', alternate: '37,5 %' },
  ]),
});

# Cierre de la fase 10C · corrección 10C.1

La auditoría `DecisionLab-auditoria-fase-10C.md` reprodujo dos defectos en la interfaz del asistente. Se corrigieron sin cambiar el modelo matemático, el repositorio IndexedDB, la arquitectura ni el diseño visual. La fase 10D no se inició.

## Correcciones

1. **Cambio de tipo.** El manejador consultaba el objeto `item` capturado al renderizar la tarjeta. Las ediciones posteriores estaban en `project-state.js`, por lo que el aviso podía omitirse. Ahora busca el criterio vigente por ID, detecta evaluaciones, unidad, límites y sentido favorable personalizado, y enumera solo los datos que desaparecerán. Cancelar restaura el selector y conserva el criterio completo; aceptar llama a `setCriterionType()` del dominio y deja que el estado existente guarde el resultado. Los valores predeterminados vacíos no disparan avisos innecesarios.
2. **Resumen de pesos.** La interfaz interpretaba todo fallo de `normalizeWeights()` como suma cero. Ahora distingue peso incompleto, suma cero, ausencia de criterios y valor inválido mediante los errores estructurados del dominio. Los errores locales se muestran junto al control y en el resumen; las proporciones se ocultan mientras haya un valor inválido o incompleto. Se conserva el texto escrito y la posibilidad de guardar borradores con pesos pendientes.

No se modificaron `src/domain/normalization.js`, `evaluation.js` ni `scenarios.js`. La proporción normalizada conserva la fórmula de 10A.

## Pruebas de regresión añadidas

Se añadieron **9 pruebas Playwright** a `tests/e2e/wizard.spec.js` respecto a la entrega 10C inicial: cancelación y aceptación con unidad/rango guardados, cancelación y aceptación con evaluaciones asociadas, sentido favorable personalizado, cambio sin datos relevantes, cuatro estados de pesos con lectura de IndexedDB, y mensajes sin desbordamiento a 320, 390, 768 y 1440 px. Las pruebas anteriores permanecen.

## Verificación final

| Comando              | Resultado                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `npm run check`      | Correcto: ESLint, Prettier, 23 pruebas Vitest y compilación Vite de landing y aplicación. |
| `npm run test:smoke` | 4 pruebas superadas.                                                                      |
| `npm run test:e2e`   | 47 pruebas Playwright superadas en Chrome; se conservaron las de 9A, 10A, 10B y 10C.      |

Las capturas `phase-10C1-weights-incomplete-{320,390,768,1440}.png` en `docs/screenshots/` muestran el mensaje corregido con guardado confirmado. No se observó desbordamiento horizontal en esas anchuras.

## Git y paquete

La identidad de autor de Git está configurada. Se revisaron los archivos incluidos y se creó un commit local de cierre. No se configuró remoto ni se publicó el repositorio. El ZIP final excluye `.git/`, `node_modules/`, `dist/` y resultados temporales.

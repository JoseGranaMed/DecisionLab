# Verificación de la fase 10A

## Resultados ejecutados

| Comando              | Resultado                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`      | ESLint y Prettier sin errores; 16 pruebas de Vitest superadas; Vite compiló `dist/index.html` y `dist/app/index.html`.                                             |
| `npm run test:smoke` | 4 pruebas de rutas y shell superadas.                                                                                                                              |
| `npm run test:e2e`   | 9 pruebas en Chrome superadas: 320, 375, 390, 768, 1024 y 1440 px, navegación, historial, recarga, teclado, estilos, recursos y ausencia de errores de JavaScript. |

No se instalaron dependencias nuevas. Se compararon por SHA-256 los 18 archivos de interfaz y HTML con el ZIP entregado en la fase 9A: los 18 son idénticos. El paquete de producción de Vite conserva sus dos entradas; el dominio todavía no se importa desde las pantallas y, por eso, no se incorpora al bundle visual de esta fase.

## Comprobaciones matemáticas

- El ejemplo aprobado produce base `67,50 / 66,25 / 46,25` para A, B y C, y escenario alternativo `60,00 / 70,00 / 32,50`.
- Los aportes base de A son `30 + 12,5 + 15 + 10 = 67,5`; la ventaja sobre B es `1,25`.
- El cambio de pesos hace subir a B del puesto 2 al 1 y bajar a A del 1 al 2, sin mutar el proyecto original.
- Las pruebas cubren límites exactos, ambos sentidos numéricos, valores externos, pesos cero o inválidos, borradores incompletos, IDs y referencias, respuestas faltantes, escenarios inconsistentes, empates reales e igualdades aparentes por redondeo.

## Problemas y decisiones pendientes

No se detectaron regresiones ni bloqueos. La escala de conveniencia queda fijada en enteros de 0 a 5 para el MVP; los controles futuros deberán reflejar ese paso. El motor usa `Number` y no redondea resultados; `DOMAIN.md` describe el límite de precisión binaria y cuándo tendría sentido considerar aritmética decimal exacta. Las pantallas seguirán mostrando datos estáticos hasta una fase de integración autorizada.

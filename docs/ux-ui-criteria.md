# Criterios de UX/UI — Pantalla de Diseño (OrbitaLab · Blueprint / MDL)

Criterios de usabilidad e interfaz aplicados a la pantalla principal de Diseño Colaborativo.

## Usabilidad

1. **Objetivo claro en el primer viewport**: la misión activa (p. ej. *Observación Climática LEO*) debe leerse en el header.
2. **Acción primaria visible**: el CTA *Simular lanzamiento* debe estar siempre accesible y con foco visible.
3. **Estados de equipo explícitos**: cada rol (Nave, Ciencia, Órbita, Recursos) debe mostrar *Listo* / *En revisión* con el mismo criterio.
4. **Contexto de flujo**: la selección de rol pertenece al inicio del flujo de misión (elegir misión → elegir rol → diseñar).

## Interacción

5. Tabs con `aria-selected` y navegación por teclado (flechas / Home / End).
6. Feedback inmediato ante cambios de diseño (toasts de estado, recálculo en vivo).
7. Propuestas con votación y margen mantenido antes de aplicar cambios.

## Consistencia visual

8. Tokens de color: superficie `#0B101B`, containers `#131A29` / `#1C2538`, borde `#334155`, primario `#38BDF8`, acento `#F59E0B`.
9. Tipografía: *Space Grotesk* (títulos/etiquetas), *Ubuntu* (cuerpo), *Space Mono* (métricas tabulares).
10. Espaciado basado en tokens de *gutter*; radios y elevaciones de consola.
11. Contraste mínimo 4.5:1 para texto; 3:1 para texto sobre fondo decorativo.

## Accesibilidad y movimiento

12. Focus visible de 2px con offset, respetando `prefers-reduced-motion`.
13. Barras de progreso con `role="progressbar"` y valores ARIA.
14. Estados vacíos y errores con texto legible (no solo color).

## Responsive

15. Breakpoint móvil: apilamiento de una sola columna sin pérdida de información crítica.
16. Paneles lateralizados a una sola columna cuando el viewport es estrecho.

## Alcance de la pantalla

17. Diseño: header + catálogo por tabs + blueprint SVG + tradeoffs + telemetría.
18. Colaboración: panel de roles + mesa de negociación (vista tipo tab).

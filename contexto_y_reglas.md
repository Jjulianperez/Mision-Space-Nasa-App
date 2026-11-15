# Contexto Maestro y Reglas de Desarrollo para Asistentes IA (LLM)
**Proyecto:** OrbitaLab: MDL Edition  
**Equipo:** Pacha Team (NASA Space Apps Challenge 2026)  
**Propósito de este documento:** Proveer a cualquier modelo de lenguaje (Cursor, Copilot, Claude, ChatGPT, Gemini) el contexto técnico, las reglas de negocio, los contratos de datos y las restricciones de alcance (*guardrails*) para asistir en el desarrollo rápido y coherente del MVP durante el hackatón.

---

## 1. Resumen Ejecutivo del Proyecto

**OrbitaLab: MDL Edition** es un juego web educativo y simulador táctico de ingeniería espacial para **1 a 4 jugadores** (cooperativo o solitario). Los jugadores asumen los **4 Segmentos de una Misión NASA** para diseñar una nave sobre planos técnicos (*blueprints*), negociar presupuestos y masa mediante votaciones, operar un vuelo acelerado de 3 actos con **información asimétrica entre roles** y analizar un **Informe de Auditoría Post-Misión** comparado con misiones reales de la NASA.

### Niveles de Dificultad
1. **`APPRENTICE` (Principiante / Juvenil):** Incluye mini-tutorial interactivo, alertas preventivas claras y recomendaciones de margen.
2. **`ENGINEER` (Intermedio):** Presupuestos ajustados, métricas técnicas completas y mayor probabilidad de anomalías en vuelo.

---

## 2. Reglas Estrictas para el LLM (Guardrails de Hackatón)

Cuando generes código, componentes o lógica para este proyecto, **DEBES cumplir estas 7 reglas sin excepción**:

1. **Visualizaciones Espaciales (3D permitido para diseño y lanzamiento del cohete):** Se prohíben motores 3D pesados tipo juego y mapas 2D caminables (*Among Us*). Las visualizaciones espaciales (plano de nave y trayectoria orbital) deben hacerse preferentemente con **SVG limpio, HTML/CSS o Canvas 2D ligero**; sin embargo, se **permite** el uso de animaciones 3D ligeras (WebGL/Three.js/React Three Fiber) **exclusivamente para la visualización del cohete en la fase de Diseño y para la secuencia de lanzamiento**, siempre que no bloqueen el flujo principal ni degraden el rendimiento en dispositivos de gama baja. El fallback 2D (SVG) debe mantenerse disponible como alternativa.
2. **Prohibido Hardcodear Datos de Dominio:** Nunca escribas precios, pesos, consumo eléctrico ($\text{kW}$), descripciones de piezas ni textos de crisis directamente dentro de componentes React o controladores del backend. Todo debe importarse desde archivos JSON estructurados en `/data`.
3. **Asimetría Obligatoria en Fase de Vuelo:** El servidor es la única autoridad del estado de vuelo. Al emitir el estado durante la fase `FLIGHT`, el backend **debe filtrar el payload según el rol** de cada socket:
   * Solo `COMMS` recibe el mapa de trayectoria, amenazas entrantes y ventanas de descarga.
   * `PROPULSION` recibe telemetría interna (combustible, temperatura, integridad) y dispara mini-puzzles de reparación.
   * `SCIENCE` recibe estado de sensores y dispara mini-puzzles de calibración.
   * `DIRECTOR` recibe métricas globales de objetivos científicos y botones de decisión ejecutiva ante crisis.
4. **Lanzamiento Permitido Bajo Riesgo:** Si la masa supera el $90\%$ del límite o la energía está justa, la UI muestra advertencias claras, pero **NO bloquea el lanzamiento** (solo se bloquea si el presupuesto restante es $< 0$ o si la masa supera el $100\%$ absoluto del lanzador).
5. **Soporte Nativo para Modo 1 Jugador:** Si una sala inicia con `1` solo jugador, el sistema debe permitirle alternar entre los 4 catálogos de rol y simular propuestas/alertas automáticas de asesores virtuales para que la experiencia funcione igual sin compañeros humanos.
6. **Prioridad al Flujo Completo (End-to-End):** Prioriza código limpio, funcional y tipado en TypeScript que conecte las 4 pantallas principales (`LOBBY` -> `DESIGN` -> `FLIGHT` -> `REPORT`) antes que optimizaciones prematuras.
7. **Consistencia de Equipo:** Respeta la separación de carpetas para evitar conflictos de *merge* entre los 4 programadores (Julian, Thiago, Angel y Alvaro) y el editor de datos (Axel).

---

## 3. Arquitectura Técnica (Opción 1: Full-Stack TS + Socket.io)

### Stack Tecnológico
* **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Zustand + Lucide Icons + SVG/Canvas 2D (y animaciones 3D ligeras solo para cohete/lazamiento).
* **Backend:** Node.js + Express + TypeScript + Socket.io (estado de salas en memoria).
* **Persistencia Ligera:** JSON estáticos (`/data`) + SQLite (o archivo JSON persistente) para ranking y presets.

### Estructura de Carpetas Recomendada
```text
orbitalab/
├── data/                         # [Territorio de Axel] Archivos JSON editables
│   ├── missions.json             # 3 escenarios (LEO, Lunar, Espacio Profundo)
│   ├── modules.json              # Catálogos EST, SCI y COM
│   └── flight_events.json        # Crisis al 40% y comparativas NASA reales
├── server/                       # [Territorio de Thiago y Angel]
│   └── src/
│       ├── engine/               # [Thiago] Fórmulas matemáticas, auditoría y tests
│       ├── sockets/              # [Angel] Salas 1-4 jug., votaciones y filtrado asimétrico
│       ├── flight/               # [Angel] Bucle de vuelo de 90s en 3 actos y reporte
│       └── index.ts              # Servidor Express + Socket.io
└── client/                       # [Territorio de Julian y Alvaro]
    └── src/
        ├── store/                # [Julian] Zustand store sincronizado con Socket.io
        ├── components/
        │   ├── lobby/            # [Alvaro] Inicio, selector Aprendiz/Ingeniero, Tutorial
        │   ├── design/           # [Julian] Mesa MDL 3 columnas, 6 barras, Votaciones
        │   ├── flight/           # [Alvaro] Consola asimétrica, Mission Viz 2D, Mini-puzzles
        │   └── report/           # [Alvaro] Auditoría Post-Misión y comparativa NASA
        └── App.tsx
```

---

## 4. Contratos de Datos (TypeScript Interfaces Oficiales)

Todo código generado para frontend o backend debe adherirse a estas interfaces:

```typescript
export type RoleType = 'DIRECTOR' | 'PROPULSION' | 'SCIENCE' | 'COMMS';
export type DifficultyMode = 'APPRENTICE' | 'ENGINEER';
export type GamePhase = 'LOBBY' | 'DESIGN' | 'FLIGHT' | 'REPORT';
export type ModuleCategory = 'EST' | 'SCI' | 'COM';

export interface Player {
  id: string;
  name: string;
  role: RoleType | null;
  ready: boolean;
}

export interface ModuleItem {
  id: string;                     // Ej: "EST-01", "SCI-05", "COM-02"
  name: string;
  category: ModuleCategory;
  allowedRole: RoleType;
  costMillions: number;           // Costo en millones USD
  massKg: number;                 // Masa en kg
  powerKw: number;                // Consumo (+) o generación (-) en kW
  dataGenMbps: number;            // Datos generados por instrumentos
  dataDownlinkMbps: number;       // Capacidad de bajada de antenas
  sciencePoints: number;          // Aporte al objetivo científico
  riskModifier: number;           // Incremento o reducción de riesgo (%)
  slotsRequired?: number;         // Por defecto 1 (ej. Telescopio SCI-05 ocupa 2)
  requiresModuleId?: string;      // Ej: Sismómetro requiere aterrizador EST-13
  apprenticeTip: string;          // Explicación simple para modo Aprendiz
}

export interface MissionConfig {
  id: string;
  title: string;
  orbitType: 'LEO' | 'SSO' | 'LUNAR' | 'DEEP_SPACE';
  budgetMillions: number;         // Calibrado entre $1,500M y $4,500M
  maxLauncherMassKg: number;
  targetSciencePoints: number;
  requiredDownlinkRatio: number;  // Ej: 0.75 (75% de datos bajados a Tierra)
  realNasaReference: {
    missionName: string;          // Ej: "PUNCH", "Dawn", "BioNutrients-2"
    summary: string;
    engineeringLesson: string;
  };
}

export interface TelemetryMetrics {
  budgetSpent: number;
  budgetRemaining: number;
  totalMassKg: number;
  massPercentage: number;
  powerGeneratedKw: number;
  powerConsumedKw: number;
  propulsiveEfficiency: number;   // 0 a 100%
  totalDataGenerated: number;
  totalDownlinkCapacity: number;
  structuralRisk: number;         // 0 a 100%
  projectedSciencePoints: number;
  warnings: string[];             // Alertas activas (ej. ">90% masa")
}

export interface ActiveVote {
  voteId: string;
  proposedBy: RoleType;
  module: ModuleItem;
  action: 'ADD' | 'REMOVE';
  approvals: string[];            // Player IDs que aprobaron
  rejections: string[];           // Player IDs que rechazaron
  expiresAt: number;
}

export interface RoomState {
  roomId: string;
  difficulty: DifficultyMode;
  phase: GamePhase;
  mission: MissionConfig;
  players: Player[];
  selectedModules: ModuleItem[];
  telemetry: TelemetryMetrics;
  activeVote: ActiveVote | null;
}
```

---

## 5. Motor Matemático (Reglas Exactas para Backend)

El módulo `server/src/engine/calculator.ts` debe implementar estas ecuaciones:

1. **Presupuesto Restante:**
   $$Presupuesto\_Restante = Presupuesto\_Inicial - \sum Costo\_Modulo_i$$
   *(Bloquear propuesta si* $Presupuesto\_Restante < 0$*).*
2. **Masa Total y Porcentaje:**
   $$Masa\_Total = \sum Masa\_Modulo_i \quad;\quad Porcentaje\_Masa = \left(\frac{Masa\_Total}{Masa\_Maxima\_Lanzador}\right) \times 100$$
   * Si $Porcentaje\_Masa > 90\%$: sumar $+12\%$ a `structuralRisk` y emitir alerta *"Estrés estructural en Max-Q"*.
   * Si $Porcentaje\_Masa > 95\%$: sumar $+5\%$ adicional a `structuralRisk`.
3. **Balance Energético ($\text{kW}$):**
   $$Consumo\_Total = 15.0 + \sum_{powerKw > 0} powerKw_i \quad;\quad Generacion\_Total = 30.0 + \sum_{powerKw < 0} |powerKw_i|$$
   *(Si* $Consumo\_Total > Generacion\_Total$*, habilitar lanzamiento pero forzar caída de tensión en el Acto 2 del vuelo).*
4. **Eficiencia Propulsiva ($\Delta v$):**
   $$Eficiencia\_Propulsiva = 100 - \left(\frac{Masa\_Total}{Masa\_Maxima\_Lanzador} \times 25\right)$$
5. **Límite de Bahía Científica:**
   * Máximo `3` slots de instrumentos `SCI` (el módulo `SCI-05` consume `2` slots).

---

## 6. Protocolo de Eventos Socket.io

### Eventos Cliente -> Servidor
* `room:create` / `room:join`: `{ roomId, playerName, difficulty }`
* `role:select`: `{ roomId, role: RoleType }`
* `design:propose_module`: `{ roomId, moduleId, action: 'ADD' | 'REMOVE' }` (En modo 1 jugador aplica directo; en multijugador abre `ActiveVote`).
* `design:vote`: `{ roomId, voteId, approve: boolean }`
* `mission:launch`: `{ roomId }` (Valida bloqueos duros e inicia el bucle de vuelo).
* `flight:action`: `{ roomId, actionType: 'SOLVE_PUZZLE' | 'TOGGLE_SENSOR' | 'EXEC_DECISION', payload }`

### Eventos Servidor -> Cliente
* `room:state_update`: `RoomState` (Sincroniza la mesa de diseño y votaciones).
* `flight:tick_asym`: Payload filtrado estrictamente por el `RoleType` del socket receptor (avanza progreso de `0%` a `100%` en `75` segundos reales).
* `flight:crisis_alert`: Dispara la crisis principal al `40%` del viaje según las debilidades detectadas en `TelemetryMetrics`.
* `mission:report_ready`: Envía el diagnóstico de causa raíz, puntaje final y comparativa con la misión real de la NASA.

---

## 7. Guía de Estilo UI/UX (Consola Aeroespacial)

* **Paleta de colores:** Fondo principal `#0B0F19`, tarjetas/paneles `#131B2E`, bordes sutiles `#1E293B`, acento primario cian `#38BDF8`, estado óptimo esmeralda `#10B981`, advertencia ámbar `#F59E0B`, alerta crítica rojo `#EF4444`.
* **Layout de Fase `DESIGN`:** Grid de 3 columnas (`28%` catálogo filtrado por rol | `44%` plano SVG interactivo de la nave + tarjeta de votación activa | `28%` las 6 barras de telemetría en vivo + botón de lanzamiento).
* **Feedback en Tiempo Real:** Cada barra de telemetría debe cambiar de color dinámicamente (verde $< 75\%$, ámbar $75\%\text{--}90\%$, rojo $> 90\%$) y mostrar tooltips explicativos cuando `difficulty === 'APPRENTICE'`.
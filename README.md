# OrbitaLab: MDL Edition — Base del proyecto

Scaffold del monorepo para el NASA Space Apps Challenge 2026 (Pacha Team).
**Las dependencias ya están instaladas y los archivos de cada territorio están vacíos a propósito.**

La visión del producto está en [`REEDME.md`](./REEDME.md) y las reglas técnicas/contratos en
[`contexto_y_reglas.md`](./contexto_y_reglas.md).

## Stack instalado

| Capa | Tecnologías |
| :--- | :--- |
| Frontend (`client/`) | React 18 · Vite 6 · TypeScript · Tailwind CSS 3 · Zustand · Socket.io Client · Lucide |
| Backend (`server/`) | Node.js · Express 4 · TypeScript · Socket.io · Vitest · tsx |
| Datos (`data/`) | JSON editables (misiones, módulos, eventos de vuelo) |
| Contratos (`shared/`) | Tipos TypeScript compartidos (una sola fuente de verdad) |

## Requisitos

- Node.js **>= 20.19** (probado con 22.17)
- npm 10+

## Puesta en marcha

```bash
npm install      # ya ejecutado; vuelve a correrlo si cambias dependencias
npm run dev      # servidor (4000) + cliente (5173) en paralelo
```

Scripts disponibles:

```bash
npm run dev:server   # solo backend (http://localhost:4000)
npm run dev:client   # solo frontend (http://localhost:5173)
npm run build        # build de produccion (server + client)
npm run typecheck    # TypeScript en ambos workspaces
npm test             # tests del backend (Vitest)
```

Variables de entorno: copia `.env.example` a `.env` si necesitas cambiar puertos u orígenes.

## Backend API y recursos NASA

El backend entrega los catálogos locales por HTTP:

- `GET /health`
- `GET /api/catalogs`
- `GET /api/missions` y `GET /api/missions/:missionId`
- `GET /api/modules?category=EST|SCI|COM`
- `GET /api/ground-stations`
- `GET /api/nasa/resources`
- `GET /api/flight/config`

La sincronización de partidas usa Socket.io: `room:create`, `room:join`, `room:start`,
`role:select`, `design:propose_module`, `design:vote`, `mission:launch` y `flight:action`.
Durante el vuelo, `flight:tick_asym` se emite individualmente según el rol del jugador.

La página de recursos del [desafío Space Mission Design Game de NASA](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources)
ofrece documentación, herramientas y visualizadores (como GMAT, Mission Viz y el Mission
Design Lab); no publica un endpoint de API de NASA para estos catálogos. Por eso el juego
sirve sus escenarios y módulos desde `data/*.json` y muestra los recursos oficiales en
`/api/nasa/resources`. Los costos, masas, potencias y capacidades son valores didácticos
de balance, no especificaciones certificadas por NASA. Las rutas 2D del vuelo son
trayectorias esquemáticas del juego, no efemérides ni telemetría real; no deben presentarse
como datos de ingeniería de NASA.

## Estructura y responsables

```text
orbitalab/
├── data/                              # [Axel] JSON editables
│   ├── missions.json
│   ├── modules.json
│   └── flight_events.json
├── shared/
│   └── types.ts                       # Contratos oficiales (acordar cambios en equipo)
├── server/                            # [Thiago + Angel]
│   └── src/
│       ├── engine/                    # [Thiago] fórmulas, auditoría y tests
│       ├── sockets/                   # [Angel] salas, votaciones y filtrado asimétrico
│       ├── flight/                    # [Angel] bucle de vuelo y reporte
│       └── index.ts                   # Express + Socket.io
└── client/                            # [Julian + Alvaro]
    └── src/
        ├── store/                     # [Julian] Zustand + Socket.io
        ├── components/
        │   ├── lobby/                 # [Alvaro] inicio, dificultad, tutorial
        │   ├── design/                # [Julian] mesa MDL, barras y votación
        │   ├── flight/                # [Alvaro] consola asimétrica y puzzles
        │   └── report/                # [Alvaro] auditoría post-misión
        ├── App.tsx
        └── main.tsx
```

Archivos de configuración ya listos: `package.json` (raíz y workspaces), `tsconfig`, `vite.config.ts`,
`tailwind.config.js`, `postcss.config.js` y `index.html`.

## Flujo de trabajo con Git

```bash
git switch -c feat/mi-territorio
# ... trabajar solo en tus archivos ...
git add .
git commit -m "feat(scope): descripcion"
git push -u origin feat/mi-territorio
```

> No commitees `node_modules/`, `dist/` ni archivos `.env`.

## Notas

- Los archivos `.ts` / `.tsx` están vacíos: cada responsable implementa su parte.
- `data/*.json` contiene `{}` para mantener JSON válido; Axel los llena con el contenido real.
- Los contratos de datos (interfaces y eventos Socket.io) deben vivir en `shared/types.ts`.

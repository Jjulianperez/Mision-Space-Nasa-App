import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import catalogMetadata from '../../data/catalog_metadata.json' with { type: 'json' };
import nasaResources from '../../data/nasa_resources.json' with { type: 'json' };
import type { ModuleCategory } from '../../shared/types.js';
import {
  listGroundStations,
  listMissions,
  listModules,
  flightConfig,
} from './catalog.js';

const moduleCategories: ModuleCategory[] = ['EST', 'SCI', 'COM'];

function isModuleCategory(value: string): value is ModuleCategory {
  return moduleCategories.some((category) => category === value);
}

export function createHttpApp(): Express {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'orbitalab-backend' });
  });

  app.get('/api/catalogs', (_request, response) => {
    response.json({
      metadata: catalogMetadata,
      missions: listMissions(),
      modules: listModules(),
      groundStations: listGroundStations(),
    });
  });

  app.get('/api/missions', (_request, response) => {
    response.json(listMissions());
  });
  app.get('/api/missions/:missionId', (request: Request, response: Response) => {
    const mission = listMissions().find((item) => item.id === request.params.missionId);
    if (!mission) {
      response.status(404).json({
        error: { code: 'MISSION_NOT_FOUND', message: 'No se encontró el escenario solicitado.' },
      });
      return;
    }
    response.json(mission);
  });

  app.get('/api/modules', (request, response) => {
    const category = request.query.category;
    if (category !== undefined) {
      if (typeof category !== 'string' || !isModuleCategory(category)) {
        response.status(400).json({
          error: {
            code: 'INVALID_MODULE_CATEGORY',
            message: 'La categoría debe ser EST, SCI o COM.',
          },
        });
        return;
      }
      response.json(listModules(category));
      return;
    }
    response.json(listModules());
  });

  app.get('/api/ground-stations', (_request, response) => {
    response.json(listGroundStations());
  });
  app.get('/api/nasa/resources', (_request, response) => {
    response.json(nasaResources);
  });
  app.get('/api/flight/config', (_request, response) => {
    response.json({
      durationSeconds: flightConfig.durationSeconds,
      tickIntervalMs: flightConfig.tickIntervalMs,
      crisisProgressPercent: flightConfig.crisisProgressPercent,
      crisisActEndPercent: flightConfig.crisisActEndPercent,
      modelNote: flightConfig.modelNote,
    });
  });

  return app;
}

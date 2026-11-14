import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHttpApp } from './http.js';

describe('HTTP catalog API', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = createServer(createHttpApp());
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('No se pudo determinar el puerto de prueba.');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('serves missions, modules and official NASA resource links', async () => {
    const [missionsResponse, modulesResponse, resourcesResponse, flightConfigResponse] =
      await Promise.all([
      fetch(`${baseUrl}/api/missions`),
      fetch(`${baseUrl}/api/modules?category=SCI`),
      fetch(`${baseUrl}/api/nasa/resources`),
      fetch(`${baseUrl}/api/flight/config`),
    ]);

    expect(missionsResponse.status).toBe(200);
    expect(await missionsResponse.json()).toHaveLength(3);
    expect(modulesResponse.status).toBe(200);
    expect(await modulesResponse.json()).toHaveLength(5);
    expect(resourcesResponse.status).toBe(200);
    expect(await resourcesResponse.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'mission-design-lab' })]),
    );
    const publicFlightConfig = await flightConfigResponse.json();
    expect(publicFlightConfig).not.toHaveProperty('trajectoryByOrbit');
  });

  it('rejects invalid module categories and unknown mission IDs', async () => {
    const [categoryResponse, missionResponse] = await Promise.all([
      fetch(`${baseUrl}/api/modules?category=UNKNOWN`),
      fetch(`${baseUrl}/api/missions/not-a-mission`),
    ]);

    expect(categoryResponse.status).toBe(400);
    expect(missionResponse.status).toBe(404);
  });
});

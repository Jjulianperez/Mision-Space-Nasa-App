import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types.js';
import { createHttpApp } from './http.js';
import { registerRoomHandlers } from './sockets/rooms.js';

export function createBackend() {
  const app = createHttpApp();
  const httpServer = createHttpServer(app);
  const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: allowedOrigins },
  });
  const rooms = registerRoomHandlers(io);

  return {
    app,
    httpServer,
    io,
    close: () =>
      new Promise<void>((resolveClose) => {
        rooms.stop();
        io.close(() => resolveClose());
      }),
  };
}

function startServer(): void {
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  const backend = createBackend();
  backend.httpServer.listen(port, () => {
    console.log(`OrbitaLab backend listening on http://localhost:${port}`);
  });
  const shutdown = (): void => {
    void backend.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  startServer();
}
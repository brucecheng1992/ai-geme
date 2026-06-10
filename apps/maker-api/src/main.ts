import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

const API_PORT = 3000;
const WORKBENCH_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://localhost:5173', 'http://localhost:5174']);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use((request: CorsRequest, response: CorsResponse, next: () => void) => {
    const origin = request.headers.origin;
    const path = request.url ?? '';
    const method = request.method ?? 'GET';
    const workbenchAllowed = origin !== undefined && WORKBENCH_ORIGINS.has(origin);
    const sandboxPreviewAllowed = origin === 'null' && path.startsWith('/preview/') && (method === 'GET' || method === 'OPTIONS');

    if (origin && (workbenchAllowed || sandboxPreviewAllowed)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', sandboxPreviewAllowed ? 'GET,OPTIONS' : 'GET,POST,OPTIONS');
    }

    if (request.method === 'OPTIONS') {
      response.statusCode = workbenchAllowed || sandboxPreviewAllowed ? 204 : 403;
      response.end();
      return;
    }

    next();
  });
  await app.listen(API_PORT);
  console.log(`maker-api listening on http://localhost:${API_PORT}`);
}

await bootstrap();

type CorsRequest = {
  headers: { origin?: string };
  method?: string;
  url?: string;
};

type CorsResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(): void;
};

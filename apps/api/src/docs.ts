import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/** OpenAPI generated from the route schemas, browsable on /docs. Registered before the routes. */
export async function registerDocs(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: { title: 'Widoo API', version: 'v1' },
      components: {
        securitySchemes: {
          firebaseIdToken: { type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
}

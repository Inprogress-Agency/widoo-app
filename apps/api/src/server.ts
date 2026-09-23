import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig(process.env);
const app = await buildApp(config);

// Cloud Run sends SIGTERM before stopping an instance: finish in-flight requests, close the pool.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: config.host, port: config.port });

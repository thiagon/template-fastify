import { buildApp } from './app.ts';
import { startTelemetry } from './telemetry.ts';

const telemetry = startTelemetry();
const app = buildApp();

app.addHook('onClose', telemetry);

try {
  await app.ready();
  await app.listen({ port: app.env.PORT, host: app.env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

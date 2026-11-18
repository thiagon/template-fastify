# fastify-template

[![CI](https://github.com/thiagon/template-fastify/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/thiagon/template-fastify/actions/workflows/ci.yml)

Base template for Fastify APIs: autoloaded plugins and modules, Zod-typed env, OpenAPI docs with Scalar, Prometheus metrics, OpenTelemetry traces, health probes, Docker and tests. Clone it, rename it, start writing modules.

## Stack

- Node 24+ (LTS), pure ESM, no transpiler in dev — Node strips the types itself
- Fastify 5 + `@fastify/autoload`
- Zod (env + request/response schemas via `fastify-type-provider-zod`)
- TypeScript strict, `NodeNext`
- Vitest, Biome (lint + format)

## Layout

```
.
├── src/
│   ├── server.ts              # telemetry + buildApp() + listen
│   ├── telemetry.ts           # OpenTelemetry SDK, started by server.ts
│   ├── app.ts                 # Fastify + autoload of plugins/ and modules/
│   ├── env.ts                 # Zod schema for the environment
│   ├── plugins/               # infrastructure, loaded first, always wrapped in fp()
│   │   ├── config.ts          # validates process.env → typed app.env
│   │   ├── error-handler.ts   # single error/notFound shape for every route
│   │   ├── cors.ts
│   │   ├── helmet.ts
│   │   ├── swagger.ts         # OpenAPI + Scalar at /docs
│   │   ├── metrics.ts         # Prometheus at /metrics
│   │   ├── rate-limit.ts
│   │   ├── readiness.ts       # app.readiness.add(name, check)
│   │   ├── under-pressure.ts  # event loop sampling → `pressure` readiness check
│   │   └── close-with-grace.ts
│   └── modules/               # features, one directory each
│       ├── health/            # /health/live and /health/ready
│       └── todos/             # reference module — delete it in a real project
├── test/                      # each level mirrors the path of the file under test
│   ├── unit/                  # logic and branches, no I/O
│   │   ├── test.ts            # fixtures: app, createApp
│   │   ├── app.test.ts
│   │   ├── env.test.ts
│   │   ├── telemetry.test.ts
│   │   ├── plugins/{close-with-grace,config,error-handler,metrics,rate-limit,swagger,under-pressure}.test.ts
│   │   └── modules/{health/index,todos/{service,schema,routes}}.test.ts
│   ├── integration/           # real dependencies (db, external apis)
│   └── e2e/                   # the compose stack over real http
│       ├── test.ts            # fixture: baseUrl
│       ├── global-setup.ts    # compose up/down
│       └── modules/{todos/routes,health/index}.test.ts
├── observability/             # local LGTM stack config used by compose
├── Dockerfile
└── docker-compose.yaml
```

## Setup

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:3000  •  docs at /docs
```

Scripts: `dev`, `build`, `start`, `test`, `test:unit`, `test:integration`, `test:e2e`, `test:watch`, `test:coverage`,
`typecheck`, `lint`, `lint:fix`, `format`.

Docker, for local development only — hot reload through a bind mount:

```bash
docker compose up
```

Only `src`, `test` and the config files are mounted; `node_modules` comes from the image. Run `make watch` (`docker compose watch`) and the image is rebuilt on its own whenever `package-lock.json` changes; with plain `up`, rebuild it with `docker compose up --build` after adding or removing a dependency, otherwise the reloaded app fails with `ERR_MODULE_NOT_FOUND`.

Compose also starts [grafana/otel-lgtm](https://github.com/grafana/docker-otel-lgtm) (collector, Tempo, Loki, Prometheus and Grafana in one container) and wires the app to it: traces and logs over OTLP, and `/metrics` scraped by the collector ([observability/otelcol.yaml](observability/otelcol.yaml)). Open Grafana at http://localhost:3001 and use the Drilldown apps — Traces, Logs and Metrics — or open the **Fastify service overview** dashboard, provisioned from [observability/grafana-dashboard.json](observability/grafana-dashboard.json) (importable into any Grafana via Dashboards → New → Import), for a single service view: traffic, errors and latency per endpoint, Node runtime, recent and slow traces, logs. Port `4318` is published too, so `npm run dev` on the host can export with `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`.

The `prod` stage in the [Dockerfile](Dockerfile) is what ships; CI builds it on every push and pull request so a broken image fails before deploy (it is not published anywhere yet), and scans it with [Grype](https://github.com/anchore/grype), failing on any high or critical vulnerability that already has a fix. Pull requests also run GitHub's dependency review, which blocks new dependencies with known high-severity advisories. Compose never runs it. It starts Node with `--enable-source-maps`, so stack traces point at `src/*.ts` instead of `dist/*.js`.

## Config (env)

Every new variable goes into [src/env.ts](src/env.ts). The [config.ts](src/plugins/config.ts) plugin validates `process.env` at boot and kills the process (exit 1) when something is missing or invalid, so no `process.env.X!` ends up scattered across the code.

```ts
// src/env.ts
export const envSchema = z.object({
  // ...
  DATABASE_URL: z.url(),
  API_TOKEN: z.string().min(1),
});
```

From then on it is `app.env.DATABASE_URL`, typed, anywhere. Document the variable in `.env.example`.

Built-in variables beyond the basics:

| variable                      | default    | effect                                                                 |
| ----------------------------- | ---------- | ---------------------------------------------------------------------- |
| `TRUST_PROXY`                 | `false`    | trust `x-forwarded-*` for `req.ip`; turn on behind a load balancer     |
| `CORS_ORIGIN`                 | `*`        | `*` or a comma-separated list of allowed origins                       |
| `RATE_LIMIT_MAX`              | `100`      | requests per window, per client ip                                     |
| `RATE_LIMIT_WINDOW`           | `1 minute` | window length                                                          |
| `DOCS_ENABLED`                | `true`     | serve `/docs`; turn off where the API is public                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | —          | OTLP collector url; traces are only exported when it is set            |
| `OTEL_EXPORTER_OTLP_TIMEOUT`  | `10000`    | ms per export, retries included; set ~`2000` in production (see below) |
| `OTEL_LOGS_EXPORTER`          | `none`     | `otlp` also ships logs over OTLP                                       |

`LOG_LEVEL` and `TRUST_PROXY` are read from `process.env` when the Fastify instance is created, before the config plugin runs; they are still declared in the schema so they are validated and documented in one place.

### `.env` is local-only

There is no `dotenv` here, not even as a dependency. The `.env` file is loaded by Node's native flag, and only in the `dev` script:

```jsonc
"dev": "node --watch --env-file-if-exists=.env src/server.ts",
"start": "node dist/server.js",
```

In production the variables come from the orchestrator (compose `env_file`/`environment`, k8s secrets, PaaS dashboard) and the code never reads a file. `if-exists` keeps local boots working when there is no `.env` — the schema defaults take over.

## Plugins

Everything under `src/plugins/` is autoloaded before the modules. This is where infrastructure lives: decorators, global hooks, connections.

```ts
// src/plugins/db.ts
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

async function dbPlugin(fastify: FastifyInstance) {
  const db = await connect(fastify.env.DATABASE_URL);
  fastify.decorate('db', db);
  fastify.addHook('onClose', () => db.close());
  fastify.readiness.add('db', () => db.ping());
}

export default fp(dbPlugin, { name: 'db', dependencies: ['env', 'readiness'] });
```

Two details make this work: `fastify-plugin` (`fp`) opts out of encapsulation, so the decorator is visible to the whole app; and `dependencies` pins the load order (the env plugin is named `env`).

## Modules

A module is a directory under `src/modules/` whose `index.ts` default-exports a Fastify plugin. Autoload picks it up — `app.ts` and `server.ts` never change.

[src/modules/todos/](src/modules/todos/) is the reference implementation. Read it before writing a new module, then delete it:

```
src/modules/todos/
├── index.ts      # composition: build dependencies, register routes, declare plugin deps
├── routes.ts     # HTTP layer: schemas, status codes, error translation
├── service.ts    # business logic, knows nothing about Fastify
└── schema.ts     # Zod schemas + inferred types
```

The split is the point:

- **schema.ts** is the single source of truth. Request validation, response serialization and `/docs` all come from it, and the TypeScript types are inferred from the schemas — never write both by hand. A field missing from a response schema is silently dropped from the payload.
- **service.ts** returns `null`/`boolean` instead of throwing HTTP errors. It stays testable on its own and swapping the in-memory `Map` for Postgres does not change a single signature.
- **routes.ts** is thin: validate (via schema), call the service, translate to HTTP. `createError.NotFound()` (from `http-errors`) is thrown here and the error-handler plugin formats it.
- **index.ts** builds the module's dependencies from the already-validated `app.env` and declares `dependencies` so the plugins it uses are loaded first.

A one-file module is fine too — see [src/modules/health/index.ts](src/modules/health/index.ts). Grow into the four-file shape when the module earns it.

Modules do not import from each other. Anything shared becomes a plugin.

## Health

| route           | answers                                                                     | use it as       |
| --------------- | --------------------------------------------------------------------------- | --------------- |
| `/health/live`  | always 200 while the process runs                                           | liveness probe  |
| `/health/ready` | 200, or 503 when any readiness check fails, under pressure or shutting down | readiness probe |

A readiness check is any function registered with `app.readiness.add(name, check)`; it fails by throwing. [under-pressure.ts](src/plugins/under-pressure.ts) registers the `pressure` check, and every plugin that owns a connection should register its own (see the `db` example above). The response lists each check as `ok` or `fail`.

Each probe route opts out of route metrics, tracing and rate limiting with `config: { disableMetrics: true, otel: false, rateLimit: false }` and only logs at `warn` — a probe answering 429 would take the instance out of rotation. Any route can do the same — there is no central list to keep in sync.

## Observability

- **Request id**: every response carries `x-request-id`. An incoming `x-request-id` is kept, so ids flow across services; otherwise a uuid is generated. It is the `reqId` on every log line.
- **Logs**: pino JSON on stdout, one `request completed` line per request (method, url, status, response time), emitted on response so it carries the trace id. Fastify's own `incoming request` line is disabled: it fires before the span exists. `authorization` and `cookie` are redacted.
- **Metrics**: [metrics.ts](src/plugins/metrics.ts) exposes Prometheus metrics at `/metrics`: default Node metrics plus an `http_request_duration_seconds` histogram labelled by route template, method and status. The endpoint is unauthenticated and hidden from `/docs`; keep it off the public ingress.
- **Traces**: [telemetry.ts](src/telemetry.ts) starts the OpenTelemetry SDK only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. It instruments Fastify (request and handler spans, no per-hook spans, `traceparent` honoured) and outgoing `http`/`fetch`, and adds `trace_id`/`span_id` to log lines. Everything else is the standard `OTEL_*` configuration — set `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG` to control volume.
- **OTel logs** are optional: set `OTEL_LOGS_EXPORTER=otlp` to also ship pino logs over OTLP. OTel metrics stay off; Prometheus covers them.

`server.ts` starts the SDK before `buildApp()`, and `app.ts` never imports it, so tests never load it: Fastify, pino and `fetch` are instrumented through diagnostics channels at instance creation, and plugins are only imported by autoload during `ready()`. Keep drivers out of `app.ts` imports so they load after the SDK. The SDK is registered as an `onClose` hook, so pending spans are flushed when [close-with-grace.ts](src/plugins/close-with-grace.ts) closes the app. With the collector down, that flush keeps retrying until `OTEL_EXPORTER_OTLP_TIMEOUT`: the 10s default matches close-with-grace's own 10s delay, so a slow `app.close()` gets the process killed with the spans lost anyway — `2000` caps the flush at about a second.

## Errors

[error-handler.ts](src/plugins/error-handler.ts) gives every route the same response shape:

| case                        | status | body                                                                |
| --------------------------- | ------ | ------------------------------------------------------------------- |
| Zod validation failure      | 400    | `{ error: 'ValidationError', message, details: [{path, message}] }` |
| `createError.*`             | any    | `{ error, message }` (5xx ones are logged)                          |
| unknown route               | 404    | `{ error: 'NotFoundError', message }`                               |
| rate limit exceeded         | 429    | `{ error: 'TooManyRequestsError', message }` + `retry-after`        |
| unknown / response mismatch | 500    | `{ error: 'InternalServerError', message }`, logged with the stack  |

Remember to declare the error shape in the route's `response` map (`[status.BAD_REQUEST]: errorResponse`), otherwise serialization strips the fields.

Status codes are never written as bare numbers: use the named constants from [`http-status`](https://github.com/adaltas/node-http-status) (`status.CREATED`, `status.NOT_FOUND`) for codes and response maps, and throw `createError.*` from [`http-errors`](https://github.com/jshttp/http-errors) to fail a request — it works from any layer, no Fastify instance needed.

## Tests

Vitest, split into three projects (`vitest.config.ts`), each one with its own script:

| Project     | Scope                                                              | I/O                        |
| ----------- | ------------------------------------------------------------------ | -------------------------- |
| unit        | every branch: services, schemas, route handlers, the error handler | none — `app.inject()` only |
| integration | real dependencies: database, queue, external api                   | needs them running         |
| e2e         | the compose stack over http, happy path plus one error per module  | needs `docker compose up`  |

Inside each project the file path mirrors the file under test: `src/modules/todos/service.ts` is
covered by `test/unit/modules/todos/service.test.ts`.

Branch coverage lives in `unit` and nowhere else, and it is enforced: `vitest.config.ts` sets a 100% threshold
on every metric, so `test:coverage` (and CI) fails when a branch goes untested. `src/server.ts` is excluded —
it is the entrypoint, covered by `e2e`. `e2e` proves the wiring, so keep it thin —
[test/e2e/modules/todos/routes.test.ts](test/e2e/modules/todos/routes.test.ts) is a full
create → patch → list → delete lifecycle plus a single 400. `integration` ships empty on purpose (see
[test/integration/README.md](test/integration/README.md)); it runs with `--passWithNoTests` until a
module talks to something real.

Fixtures, in the pytest sense: [test/unit/test.ts](test/unit/test.ts) exports a `test` extended with `app`
(a ready app, closed after the test) and `createApp(extend?)` (a factory for tests that register extra
routes; every app it made is closed after the test). [test/e2e/test.ts](test/e2e/test.ts) provides
`baseUrl`, and [test/e2e/global-setup.ts](test/e2e/global-setup.ts) runs `docker compose up -d --build --wait app`
once before the e2e files and `docker compose down --volumes` after them. Set `SERVICE_URL` to point
at an app that is already running and skip compose. Each level keeps its own fixtures; nothing is
shared through a `helpers/` folder until two levels need the same thing.

```bash
npm test                  # unit only
npm run test:unit
npm run test:integration
npm run test:e2e          # brings the compose stack up and down
npm run test:watch
npm run test:coverage    # v8 coverage of src/, report in coverage/
```

`npm run typecheck` runs `tsc` over `src` + `test`; `build` compiles `src` only.

## Imports end in `.ts`

Relative imports are written with the real extension of the file on disk:

```ts
import { buildApp } from './app.ts';
```

That is what lets `npm run dev` be plain `node src/server.ts`: Node's native type stripping resolves `./app.ts`, but it will **not** map a `./app.js` specifier onto an `app.ts` file. On build, `rewriteRelativeImportExtensions` makes `tsc` emit `./app.js` into `dist/`, so the published output is ordinary ESM.

The trade-off is `erasableSyntaxOnly`: no `enum`, no value `namespace`, no parameter properties, no experimental decorators — anything that needs real transpilation instead of type erasure. Use `const` objects and explicit assignments instead. Type-only `declare module` is fine, which is how `app.env` is augmented in [src/plugins/config.ts](src/plugins/config.ts).

Node does not typecheck while stripping. `npm run typecheck` is what catches type errors — keep it in CI.

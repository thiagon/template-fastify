# fastify-template

Base template for Fastify APIs: autoloaded plugins and modules, Zod-typed env, Swagger, Docker and tests. Clone it, rename it, start writing modules.

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
│   ├── server.ts              # buildApp() + listen
│   ├── app.ts                 # Fastify + autoload of plugins/ and modules/
│   ├── env.ts                 # Zod schema for the environment
│   ├── plugins/               # infrastructure, loaded first, always wrapped in fp()
│   │   ├── config.ts          # validates process.env → typed app.env
│   │   ├── error-handler.ts   # single error/notFound shape for every route
│   │   ├── cors.ts
│   │   ├── helmet.ts
│   │   ├── sensible.ts
│   │   ├── swagger.ts         # /docs
│   │   └── close-with-grace.ts
│   └── modules/               # features, one directory each
│       ├── health/            # smallest possible module
│       └── todos/             # reference module — delete it in a real project
├── test/                      # each level mirrors the path of the file under test
│   ├── unit/                  # logic and branches, no I/O
│   │   ├── env.test.ts
│   │   ├── plugins/error-handler.test.ts
│   │   └── modules/todos/{service,schema,routes}.test.ts
│   ├── integration/           # real dependencies (db, external apis)
│   ├── e2e/                   # the app over a real socket
│   │   └── modules/{todos/routes,health/index}.test.ts
│   └── helpers/               # app and server builders
├── Dockerfile
└── docker-compose.yaml
```

## Setup

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:3000  •  docs at /docs
```

Scripts: `dev`, `build`, `start`, `test`, `test:unit`, `test:integration`, `test:e2e`, `test:watch`,
`typecheck`, `lint`, `lint:fix`, `format`.

Docker, for local development only — hot reload through a bind mount:

```bash
docker compose up
```

The `prod` stage in the [Dockerfile](Dockerfile) is what CI builds and ships; compose never runs it.

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
}

export default fp(dbPlugin, { name: 'db', dependencies: ['env'] });
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
- **routes.ts** is thin: validate (via schema), call the service, translate to HTTP. `app.httpErrors.notFound()` (from `@fastify/sensible`) is thrown here and the error-handler plugin formats it.
- **index.ts** builds the module's dependencies from the already-validated `app.env` and declares `dependencies` so the plugins it uses are loaded first.

A one-file module is fine too — see [src/modules/health/index.ts](src/modules/health/index.ts). Grow into the four-file shape when the module earns it.

Modules do not import from each other. Anything shared becomes a plugin.

## Errors

[error-handler.ts](src/plugins/error-handler.ts) gives every route the same response shape:

| case                        | status | body                                                                |
| --------------------------- | ------ | ------------------------------------------------------------------- |
| Zod validation failure      | 400    | `{ error: 'ValidationError', message, details: [{path, message}] }` |
| `app.httpErrors.*`          | 4xx    | `{ error, message }`                                                |
| unknown / response mismatch | 500    | `{ error: 'InternalServerError', message }`, logged with the stack  |

Remember to declare the error shape in the route's `response` map (`400: errorResponse`), otherwise serialization strips the fields.

## Tests

Vitest, split into three projects (`vitest.config.ts`), each one with its own script:

| Project     | Scope                                                                | I/O                        |
| ----------- | -------------------------------------------------------------------- | -------------------------- |
| unit        | every branch: services, schemas, route handlers, the error handler    | none — `app.inject()` only |
| integration | real dependencies: database, queue, external api                      | needs them running         |
| e2e         | the app over a real socket, happy path plus one error per module      | real http                  |

Inside each project the file path mirrors the file under test: `src/modules/todos/service.ts` is
covered by `test/unit/modules/todos/service.test.ts`.

Branch coverage lives in `unit` and nowhere else. `e2e` proves the wiring, so keep it thin —
[test/e2e/modules/todos/routes.test.ts](test/e2e/modules/todos/routes.test.ts) is a full
create → patch → list → delete lifecycle plus a single 400. `integration` ships empty on purpose (see
[test/integration/README.md](test/integration/README.md)); it runs with `--passWithNoTests` until a
module talks to something real.

Helpers: `createTestApp()` boots the app in memory for `inject`, `startTestServer()` binds it to a
random port and returns a `baseUrl` for `fetch`.

```bash
npm test                  # all three
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:watch
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

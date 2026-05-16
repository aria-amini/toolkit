# @aamini/config

Shared configuration and test fixtures for aamini apps.

## Features

- **`createAppConfig(root)`** — full Vite+ app config with React, Tailwind,
  SVGR, TanStack Start, Nitro
- **`baseConfigFor(import.meta.url)`** — one-liner for app `vite.config.ts`
- **Test fixtures** (`test/server`, `test/browser`, `test/db`) — Vitest fixtures
  with auto-detected MSW handlers
- **`test/db`** — PostgreSQL testcontainer + drizzle + MSW integration fixture
- **Playwright config** — shared Playwright configuration
- **`msw.ts`** — re-exports to ensure singleton MSW instances

## Usage

```ts
// vite.config.ts
import { baseConfigFor } from '@aamini/config'
export default baseConfigFor(import.meta.url)
```

```ts
// app.test.ts
import { test } from '@aamini/config/test/server'
test('handles API', async ({ server }) => { ... })
```

Handler files are auto-discovered from the consuming app's working directory:
`__mocks__/handlers.ts` → `__mocks__/handlers.js` → `src/mocks/handlers.ts` →
`src/mocks/handlers.js`

# projects

Monorepo for shared packages used across aamini apps.

## Packages

| Package                               | npm                                                                                                     | Description                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`@aamini/config`](./packages/config) | [![npm](https://img.shields.io/npm/v/%40aamini%2Fconfig)](https://www.npmjs.com/package/@aamini/config) | Shared Vite/Vitest/Playwright config, MSW test fixtures |
| [`@aamini/lib`](./packages/lib)       | [![npm](https://img.shields.io/npm/v/%40aamini%2Flib)](https://www.npmjs.com/package/@aamini/lib)       | Runtime utilities (env, posthog)                        |

## Prerequisites

- [Vite+](https://viteplus.dev) — unified toolchain (`vp` CLI)

## Development

```sh
vp install
vp check
vp test
```

## Publishing

See [AGENTS.md](./AGENTS.md#publishing).

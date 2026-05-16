# @aamini/lib

Runtime utilities for aamini apps.

## Modules

| Import                      | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `@aamini/lib/env`           | Zod-validated environment variables from `dotenv` |
| `@aamini/lib/posthog-proxy` | PostHog proxy endpoint builder                    |

## Usage

```ts
import { env } from '@aamini/lib/env'
// validates process.env against your schema
```

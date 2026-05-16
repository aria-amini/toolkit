import { defineConfig } from 'vite-plus'

export default defineConfig({
	pack: {
		entry: ['src/env.ts', 'src/posthog-proxy.ts'],
		dts: true,
		format: ['esm'],
		sourcemap: true,
		deps: {
			skipNodeModulesBundle: true,
			neverBundle: ['dotenv', 'zod'],
		},
	},
})

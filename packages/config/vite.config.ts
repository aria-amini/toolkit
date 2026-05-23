import { defineConfig } from 'vite-plus'

export default defineConfig({
	pack: {
		entry: ['src/**/*.ts', '!src/workspace.ts', '!src/plugins/**/*.ts'],
		dts: true,
		format: ['esm'],
		sourcemap: true,
	},
})

import { defineConfig } from 'vite-plus'

export default defineConfig({
	pack: {
		entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/plugins/**/*.ts'],
		deps: {
			neverBundle: ['@test/handlers', '@test/styles'],
		},
		dts: true,
		format: ['esm'],
		sourcemap: true,
	},
})

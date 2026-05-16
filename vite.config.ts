import { workspaceConfig } from './src/config/vite.shared.ts'

export default {
	...workspaceConfig,
	test: {
		passWithNoTests: true,
		projects: ['src/*'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.output/**',
			'**/.vercel/**',
			'**/e2e/**',
		],
	},
}

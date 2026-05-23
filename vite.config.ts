import { workspaceConfig } from './src/config/src/workspace.ts'

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

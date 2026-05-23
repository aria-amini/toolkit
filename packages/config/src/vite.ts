import { nitro } from 'nitro/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import svgr from 'vite-plugin-svgr'
import { resolve } from 'node:path'
import { mergeConfig, type TestProjectConfiguration } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import {
	createMswHandlersPlugin,
	createStylesPlugin,
} from './plugins/virtual-modules.ts'
import { workspaceConfig } from './workspace.ts'

const stylesSetup = '@aamini/config/setup/styles'

interface ProjectOverrides {
	server?: TestProjectConfiguration
	browser?: TestProjectConfiguration
}

export interface AppConfigOptions {
	root?: string
	projectOverrides?: ProjectOverrides
}

export const createAppConfig = ({
	root = process.cwd(),
	projectOverrides,
}: AppConfigOptions = {}): Record<string, unknown> => ({
	root,
	resolve: {
		tsconfigPaths: true,
		dedupe: ['react', 'react-dom'],
		alias: [
			{ find: '@/mocks', replacement: resolve(root, '__mocks__') },
			{ find: '@', replacement: resolve(root, 'src') },
			{ find: '@tests', replacement: resolve(root, 'tests') },
		],
	},
	plugins: [
		tanstackStart(),
		...(process.env.VITEST === 'true'
			? []
			: [devtools({ injectSource: { enabled: false } }), nitro()]),
		tailwindcss(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
		svgr({
			include: '**/*.svg',
			svgrOptions: { exportType: 'default' },
		}),
	],
	fmt: workspaceConfig.fmt,
	lint: workspaceConfig.lint,
	staged: workspaceConfig.staged,
	test: {
		passWithNoTests: true,
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['src/**/*.test.unit.ts'],
				},
			},
			mergeConfig(
				{
					extends: true,
					plugins: [createMswHandlersPlugin()],
					test: {
						name: 'server',
						include: ['src/**/*.test.ts'],
						testTimeout: 30_000,
						fileParallelism: false,
					},
				} satisfies TestProjectConfiguration as Record<string, unknown>,
				(projectOverrides?.server ?? {}) as Record<string, unknown>,
			),
			mergeConfig(
				{
					extends: true,
					plugins: [createMswHandlersPlugin(), createStylesPlugin()],
					test: {
						name: 'browser',
						include: ['src/**/*.test.tsx', 'tests/**/*.test.tsx'],
						setupFiles: [stylesSetup],
						browser: {
							instances: [{ browser: 'chromium' }],
							provider: playwright(),
							enabled: true,
							headless: true,
						},
					},
				} satisfies TestProjectConfiguration as Record<string, unknown>,
				(projectOverrides?.browser ?? {}) as Record<string, unknown>,
			),
		],
	},
})

export const viteConfig: typeof createAppConfig = createAppConfig
export { workspaceConfig } from './workspace.ts'

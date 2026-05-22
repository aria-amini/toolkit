import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import svgr from 'vite-plugin-svgr'
import { playwright } from 'vite-plus/test/browser-playwright'
import {
	defineConfig,
	mergeConfig,
	type TestProjectConfiguration,
	type TestProjectInlineConfiguration,
} from 'vite-plus/test/config'
import {
	createMswHandlersPlugin,
	createStylesPlugin,
} from './plugins/virtual-modules.ts'

const stylesSetup = '@aamini/config/setup/styles'

function mergeProjectConfig(
	base: TestProjectConfiguration,
	overrides: TestProjectConfiguration = {},
): TestProjectConfiguration {
	// Vite's mergeConfig expects Record<string, any> and returns Record<string, any>.
	// TestProjectConfiguration uses stricter types, so casts are required.
	return mergeConfig(
		base as Record<string, any>,
		overrides as Record<string, any>,
	) as TestProjectConfiguration
}

interface ProjectOverrides {
	server?: TestProjectConfiguration
	browser?: TestProjectConfiguration
}

function createBaseConfig(
	root: string,
	overrides: TestProjectInlineConfiguration = {},
	projectOverrides: ProjectOverrides = {},
) {
	const localSetup = resolve(root, 'vitest.setup.ts')
	const hasLocalSetup = existsSync(localSetup)

	return mergeConfig(
		defineConfig({
			resolve: {
				tsconfigPaths: true,
			},
			plugins: [
				tailwindcss(),
				viteReact({
					// @vitejs/plugin-react only exposes `babel` via optional types,
					// but the option is accepted at runtime when @rolldown/plugin-babel is present.
					babel: {
						plugins: ['babel-plugin-react-compiler'],
					},
				} as Parameters<typeof viteReact>[0]),
				svgr({
					include: '**/*.svg',
					svgrOptions: { exportType: 'default' },
				}),
			],
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
					mergeProjectConfig(
						{
							extends: true,
							plugins: [createMswHandlersPlugin(root)],
							test: {
								name: 'server',
								include: ['src/**/*.test.ts'],
								testTimeout: 30_000,
								fileParallelism: false,
								setupFiles: hasLocalSetup ? [localSetup] : [],
							},
						} satisfies TestProjectConfiguration,
						projectOverrides.server ?? {},
					),
					mergeProjectConfig(
						{
							extends: true,
							plugins: [
								createMswHandlersPlugin(root),
								createStylesPlugin(root),
							],
							test: {
								name: 'browser',
								include: ['src/**/*.test.tsx', 'tests/**/*.test.tsx'],
								setupFiles: [stylesSetup],
								browser: {
									instances: [
										{
											browser: 'chromium',
										},
									],
									provider: playwright(),
									enabled: true,
									headless: true,
								},
							},
						} satisfies TestProjectConfiguration,
						projectOverrides.browser ?? {},
					),
				],
			},
		}),
		overrides,
	)
}

export function createBaseConfigWithRoot(
	root: string,
	overrides: TestProjectInlineConfiguration = {},
	projectOverrides: ProjectOverrides = {},
) {
	return createBaseConfig(root, overrides, projectOverrides)
}

export const baseConfig = createBaseConfig(process.cwd())

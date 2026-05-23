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

interface ProjectOverrides {
	server?: TestProjectConfiguration
	browser?: TestProjectConfiguration
}

export const testConfig = (projectOverrides?: ProjectOverrides) =>
	defineConfig({
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
					} satisfies TestProjectConfiguration,
					projectOverrides?.server ?? {},
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
					projectOverrides?.browser ?? {},
				),
			],
		},
	})

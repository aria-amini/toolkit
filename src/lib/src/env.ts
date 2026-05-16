import { config } from 'dotenv'
import { z } from 'zod'

export function createEnv<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
	const raw =
		process.env.RAILWAY_ENVIRONMENT_NAME ??
		(process.env.NODE_ENV === 'production' ? 'production' : 'development')
	const environmentName = /(?:^|-)pr-\d+$/.test(raw) ? 'staging' : raw
	const fileEnvironment: NodeJS.ProcessEnv = {}

	config({
		path: [
			'.env',
			'.env.local',
			`.env.${environmentName}`,
			`.env.${environmentName}.local`,
		],
		quiet: true,
		override: true,
		processEnv: fileEnvironment,
	})

	for (const [key, value] of Object.entries(fileEnvironment)) {
		process.env[key] ??= value
	}

	return schema.parse(process.env)
}

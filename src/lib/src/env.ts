import { config } from 'dotenv'

type EnvSchema<T> = {
	parse(input: unknown): T
}

export function createEnv<T>(schema: EnvSchema<T>): T {
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

	const env: NodeJS.ProcessEnv = { ...fileEnvironment }

	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) env[key] = value
	}

	return schema.parse(env)
}

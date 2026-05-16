import { config } from 'dotenv'

type EnvSchema<T extends object> = {
	parse(input: unknown): T
}

export function createEnv<T extends object>(schema: EnvSchema<T>): T {
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

	let parsed: T | undefined

	function parseEnv() {
		if (parsed !== undefined) return parsed

		const env: NodeJS.ProcessEnv = { ...fileEnvironment }

		for (const [key, value] of Object.entries(process.env)) {
			if (value !== undefined) env[key] = value
		}

		parsed = schema.parse(env)
		return parsed
	}

	return new Proxy({} as Record<PropertyKey, unknown>, {
		get(_target, property, receiver) {
			return Reflect.get(parseEnv() as object, property, receiver)
		},
		has(_target, property) {
			return property in (parseEnv() as object)
		},
		ownKeys() {
			return Reflect.ownKeys(parseEnv() as object)
		},
		getOwnPropertyDescriptor(_target, property) {
			return Object.getOwnPropertyDescriptor(parseEnv() as object, property)
		},
	}) as T
}

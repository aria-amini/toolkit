import { createFileRoute } from '@tanstack/react-router'

// Railway's healthcheck needs a 2xx and does not follow redirects, so it
// probes this route instead of a page, which may redirect or read the session.
export const Route = createFileRoute('/api/health')({
	server: {
		handlers: {
			GET: () =>
				new Response('ok', { headers: { 'cache-control': 'no-store' } }),
		},
	},
})

// Re-export msw to ensure all packages use the same instance
export { http, HttpResponse, graphql } from 'msw'
export { setupWorker } from 'msw/browser'
export type { RequestHandler } from 'msw'
export type { SetupWorker } from 'msw/browser'

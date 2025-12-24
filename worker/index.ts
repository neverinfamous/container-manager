import { type Env } from './types/env'

/**
 * Cloudflare Container Manager Worker
 * 
 * This worker serves the frontend SPA and handles API requests for managing
 * Cloudflare Containers.
 */
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url)

        // Handle API routes
        if (url.pathname.startsWith('/api/')) {
            return handleApiRequest(request, env, ctx)
        }

        // Serve static assets (SPA)
        return env.ASSETS.fetch(request)
    },

    scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
        console.log(`Scheduled event triggered: ${event.cron}`)
        // TODO: Implement scheduled action processing
        ctx.waitUntil(processScheduledActions(env))
    },
}

/**
 * Handle API requests
 */
async function handleApiRequest(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        // Health check
        if (path === '/api/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, corsHeaders)
        }

        // Placeholder routes - to be implemented in subsequent phases
        if (path === '/api/containers') {
            return jsonResponse({
                containers: [],
                message: 'Phase 1 complete - Container routes pending Phase 2 implementation',
            }, corsHeaders)
        }

        if (path === '/api/jobs') {
            const result = await env.METADATA.prepare(
                'SELECT * FROM jobs ORDER BY started_at DESC LIMIT 50'
            ).all()
            return jsonResponse({ jobs: result.results }, corsHeaders)
        }

        if (path === '/api/webhooks') {
            const result = await env.METADATA.prepare(
                'SELECT * FROM webhooks ORDER BY created_at DESC'
            ).all()
            return jsonResponse({ webhooks: result.results }, corsHeaders)
        }

        if (path === '/api/migrations/status') {
            const result = await env.METADATA.prepare(
                'SELECT * FROM migrations ORDER BY applied_at'
            ).all()
            return jsonResponse({ migrations: result.results }, corsHeaders)
        }

        // 404 for unknown routes
        return jsonResponse(
            { error: 'Not found', path },
            corsHeaders,
            404
        )
    } catch (error) {
        console.error('API error:', error)
        return jsonResponse(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            corsHeaders,
            500
        )
    }
}

/**
 * Process scheduled actions
 */
async function processScheduledActions(env: Env): Promise<void> {
    const now = new Date().toISOString()

    // Find due scheduled actions
    const result = await env.METADATA.prepare(`
    SELECT * FROM scheduled_actions 
    WHERE enabled = 1 
    AND (next_run_at IS NULL OR next_run_at <= ?)
  `).bind(now).all()

    console.log(`Found ${result.results.length} due scheduled actions`)

    // TODO: Process each action
    for (const action of result.results) {
        console.log(`Processing scheduled action: ${JSON.stringify(action)}`)
    }
}

/**
 * Create a JSON response
 */
function jsonResponse(
    data: unknown,
    headers: Record<string, string>,
    status = 200
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    })
}

/**
 * Durable Object for async snapshot operations
 */
export class SnapshotDO implements DurableObject {
    private state: DurableObjectState

    constructor(state: DurableObjectState, _env: Env) {
        this.state = state
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === '/status') {
            const status = await this.state.storage.get('status') ?? 'idle'
            const progress = await this.state.storage.get('progress') ?? 0
            return new Response(JSON.stringify({ status, progress }), {
                headers: { 'Content-Type': 'application/json' },
            })
        }

        return new Response('Not found', { status: 404 })
    }
}

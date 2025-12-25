import { type Env } from './types/env'

/**
 * Cloudflare Container Manager Worker
 *
 * This worker serves the frontend SPA and handles API requests for managing
 * Cloudflare Containers. Protected by Cloudflare Zero Trust Access.
 */
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url)

        // Health check endpoint - no auth required
        if (url.pathname === '/api/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() })
        }

        // Validate Zero Trust JWT for all other requests
        const authResult = await validateAccessJWT(request, env)
        if (!authResult.valid) {
            return new Response(JSON.stringify({ error: 'Unauthorized', message: authResult.error }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Handle API routes
        if (url.pathname.startsWith('/api/')) {
            return handleApiRequest(request, env, ctx)
        }

        // Serve static assets (SPA)
        return env.ASSETS.fetch(request)
    },

    scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
        console.log(`Scheduled event triggered: ${event.cron}`)
        ctx.waitUntil(processScheduledActions(env))
    },
}

/**
 * Zero Trust Access JWT Validation
 */
interface JWTValidationResult {
    valid: boolean
    error?: string
    email?: string
}

interface JWTHeader {
    alg: string
    kid: string
}

interface JWTPayload {
    aud: string[]
    email: string
    exp: number
    iat: number
    iss: string
    sub: string
    type: string
}

interface CloudflareAccessKey {
    kid: string
    kty: string
    alg: string
    use: string
    e: string
    n: string
}

interface CloudflareAccessKeysResponse {
    keys: CloudflareAccessKey[]
    public_cert: { kid: string; cert: string }
    public_certs: { kid: string; cert: string }[]
}

// Cache for Access public keys
let accessKeysCache: CloudflareAccessKeysResponse | null = null
let accessKeysCacheTime = 0
const ACCESS_KEYS_CACHE_TTL = 300000 // 5 minutes

async function validateAccessJWT(request: Request, env: Env): Promise<JWTValidationResult> {
    // Skip auth in development mode (check for localhost or missing env vars)
    if (!env.TEAM_DOMAIN || !env.POLICY_AUD) {
        return { valid: true, email: 'dev@localhost' }
    }

    // Get JWT from cookie or header
    const cookie = request.headers.get('Cookie') ?? ''
    const cookieMatch = /CF_Authorization=([^;]+)/.exec(cookie)
    const jwtToken = cookieMatch?.[1] ?? request.headers.get('Cf-Access-Jwt-Assertion')

    if (!jwtToken) {
        return { valid: false, error: 'No Access token found' }
    }

    try {
        // Decode JWT parts
        const parts = jwtToken.split('.')
        if (parts.length !== 3) {
            return { valid: false, error: 'Invalid JWT format' }
        }

        // We've verified length is 3, so these are safe
        const [headerB64, payloadB64, signatureB64] = parts as [string, string, string]

        const header = JSON.parse(atob(headerB64)) as JWTHeader
        const payload = JSON.parse(atob(payloadB64)) as JWTPayload

        // Verify audience
        if (!payload.aud.includes(env.POLICY_AUD)) {
            return { valid: false, error: 'Invalid audience' }
        }

        // Verify expiration
        if (Date.now() / 1000 > payload.exp) {
            return { valid: false, error: 'Token expired' }
        }

        // Fetch Access public keys (with caching)
        if (!accessKeysCache || Date.now() - accessKeysCacheTime > ACCESS_KEYS_CACHE_TTL) {
            const certsUrl = `https://${env.TEAM_DOMAIN}/cdn-cgi/access/certs`
            const certsResponse = await fetch(certsUrl)
            if (!certsResponse.ok) {
                return { valid: false, error: 'Failed to fetch Access public keys' }
            }
            accessKeysCache = await certsResponse.json() as CloudflareAccessKeysResponse
            accessKeysCacheTime = Date.now()
        }

        // Find matching key
        const key = accessKeysCache.keys.find((k: CloudflareAccessKey) => k.kid === header.kid)
        if (!key) {
            return { valid: false, error: 'Public key not found' }
        }

        // Import the public key
        const cryptoKey = await crypto.subtle.importKey(
            'jwk',
            {
                kty: key.kty,
                n: key.n,
                e: key.e,
                alg: key.alg,
                use: key.use,
            },
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['verify']
        )

        // Verify signature
        const signatureArray = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
        const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`)

        const isValid = await crypto.subtle.verify(
            'RSASSA-PKCS1-v1_5',
            cryptoKey,
            signatureArray,
            dataToVerify
        )

        if (!isValid) {
            return { valid: false, error: 'Invalid signature' }
        }

        return { valid: true, email: payload.email }
    } catch (err) {
        return { valid: false, error: `JWT validation error: ${err instanceof Error ? err.message : 'Unknown'}` }
    }
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        // Health check
        if (path === '/api/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() })
        }

        // Container routes
        if (path === '/api/containers' && request.method === 'GET') {
            return await handleListContainers(env)
        }

        const containerMatch = /^\/api\/containers\/([^/]+)$/.exec(path)
        if (containerMatch?.[1] !== undefined) {
            const name = decodeURIComponent(containerMatch[1])
            if (request.method === 'GET') {
                return await handleGetContainer(name, env)
            }
        }

        const instancesMatch = /^\/api\/containers\/([^/]+)\/instances$/.exec(path)
        if (instancesMatch?.[1] !== undefined && request.method === 'GET') {
            const name = decodeURIComponent(instancesMatch[1])
            return await handleListInstances(name, env)
        }

        const restartMatch = /^\/api\/containers\/([^/]+)\/restart$/.exec(path)
        if (restartMatch?.[1] !== undefined && request.method === 'POST') {
            const name = decodeURIComponent(restartMatch[1])
            return await handleContainerAction(name, 'restart', env)
        }

        const stopMatch = /^\/api\/containers\/([^/]+)\/stop$/.exec(path)
        if (stopMatch?.[1] !== undefined && request.method === 'POST') {
            const name = decodeURIComponent(stopMatch[1])
            return await handleContainerAction(name, 'stop', env)
        }

        const colorMatch = /^\/api\/containers\/([^/]+)\/color$/.exec(path)
        if (colorMatch?.[1] !== undefined && request.method === 'PUT') {
            const name = decodeURIComponent(colorMatch[1])
            const body = await request.json() as { color?: string | null }
            return await handleUpdateColor(name, body.color ?? null, env)
        }

        const instanceStopMatch = /^\/api\/containers\/([^/]+)\/instances\/([^/]+)$/.exec(path)
        if (instanceStopMatch?.[1] !== undefined && instanceStopMatch[2] !== undefined && request.method === 'DELETE') {
            const containerName = decodeURIComponent(instanceStopMatch[1])
            const instanceId = decodeURIComponent(instanceStopMatch[2])
            return await handleStopInstance(containerName, instanceId, env)
        }

        // Configuration routes
        const configMatch = /^\/api\/containers\/([^/]+)\/config$/.exec(path)
        if (configMatch?.[1] !== undefined) {
            const name = decodeURIComponent(configMatch[1])
            if (request.method === 'GET') {
                return handleGetConfig(name)
            }
            if (request.method === 'PUT') {
                const body = await request.json() as Record<string, unknown>
                return await handleUpdateConfig(name, body, env)
            }
        }

        const configValidateMatch = /^\/api\/containers\/([^/]+)\/config\/validate$/.exec(path)
        if (configValidateMatch?.[1] !== undefined && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return handleValidateConfig(body)
        }


        const configDiffMatch = /^\/api\/containers\/([^/]+)\/config\/diff$/.exec(path)
        if (configDiffMatch?.[1] !== undefined && request.method === 'POST') {
            const name = decodeURIComponent(configDiffMatch[1])
            const body = await request.json() as Record<string, unknown>
            return await handleConfigDiff(name, body)
        }

        // Logs routes
        const logsMatch = /^\/api\/containers\/([^/]+)\/logs$/.exec(path)
        if (logsMatch?.[1] !== undefined) {
            const name = decodeURIComponent(logsMatch[1])
            if (request.method === 'GET') {
                return handleGetLogs(name)
            }
            if (request.method === 'DELETE') {
                return handleClearLogs(name)
            }
        }

        const logsDownloadMatch = /^\/api\/containers\/([^/]+)\/logs\/download$/.exec(path)
        if (logsDownloadMatch?.[1] !== undefined && request.method === 'GET') {
            const name = decodeURIComponent(logsDownloadMatch[1])
            return handleDownloadLogs(name)
        }

        const httpTestMatch = /^\/api\/containers\/([^/]+)\/http-test$/.exec(path)
        if (httpTestMatch?.[1] !== undefined && request.method === 'POST') {
            const name = decodeURIComponent(httpTestMatch[1])
            const body = await request.json() as Record<string, unknown>
            return await handleHttpTest(name, body)
        }

        // Topology routes
        if (path === '/api/topology' && request.method === 'GET') {
            return handleGetTopology()
        }

        if (path === '/api/topology/orphans' && request.method === 'GET') {
            return handleDetectOrphans()
        }

        if (path === '/api/topology/positions' && request.method === 'PUT') {
            const body = await request.json() as Record<string, { x: number; y: number }>
            return await handleSavePositions(body, env)
        }

        // Metrics routes
        if (path === '/api/metrics/dashboard' && request.method === 'GET') {
            const range = url.searchParams.get('range') ?? '1h'
            return handleDashboardMetrics(range)
        }

        const containerMetricsMatch = /^\/api\/containers\/([^/]+)\/metrics$/.exec(path)
        if (containerMetricsMatch?.[1] !== undefined && request.method === 'GET') {
            const name = decodeURIComponent(containerMetricsMatch[1])
            const range = url.searchParams.get('range') ?? '1h'
            return handleContainerMetrics(name, range)
        }

        // Jobs routes
        if (path === '/api/jobs' && request.method === 'GET') {
            return await handleGetJobs(env)
        }

        if (path === '/api/jobs/stats' && request.method === 'GET') {
            return await handleJobStats(env)
        }

        const jobMatch = /^\/api\/jobs\/([^/]+)$/.exec(path)
        if (jobMatch?.[1] !== undefined && request.method === 'GET') {
            return await handleGetJob(env, jobMatch[1])
        }

        const jobCancelMatch = /^\/api\/jobs\/([^/]+)\/cancel$/.exec(path)
        if (jobCancelMatch?.[1] !== undefined && request.method === 'POST') {
            return await handleCancelJob(env, jobCancelMatch[1])
        }

        const jobRetryMatch = /^\/api\/jobs\/([^/]+)\/retry$/.exec(path)
        if (jobRetryMatch?.[1] !== undefined && request.method === 'POST') {
            return await handleRetryJob(env, jobRetryMatch[1])
        }

        // Webhooks routes
        if (path === '/api/webhooks' && request.method === 'GET') {
            return await handleGetWebhooks(env)
        }

        if (path === '/api/webhooks' && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return await handleCreateWebhook(env, body)
        }

        const webhookMatch = /^\/api\/webhooks\/([^/]+)$/.exec(path)
        if (webhookMatch?.[1] !== undefined) {
            if (request.method === 'PUT') {
                const body = await request.json() as Record<string, unknown>
                return await handleUpdateWebhook(env, webhookMatch[1], body)
            }
            if (request.method === 'DELETE') {
                return await handleDeleteWebhook(env, webhookMatch[1])
            }
        }

        const webhookDeliveriesMatch = /^\/api\/webhooks\/([^/]+)\/deliveries$/.exec(path)
        if (webhookDeliveriesMatch?.[1] !== undefined && request.method === 'GET') {
            return handleGetWebhookDeliveries(env, webhookDeliveriesMatch[1])
        }

        const webhookTestMatch = /^\/api\/webhooks\/([^/]+)\/test$/.exec(path)
        if (webhookTestMatch?.[1] !== undefined && request.method === 'POST') {
            return await handleTestWebhook(env, webhookTestMatch[1])
        }

        // Snapshots routes
        if (path === '/api/snapshots' && request.method === 'GET') {
            return await handleGetSnapshots(env)
        }

        if (path === '/api/snapshots' && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return await handleCreateSnapshot(env, body)
        }

        if (path === '/api/snapshots/stats' && request.method === 'GET') {
            return await handleSnapshotStats(env)
        }

        const snapshotMatch = /^\/api\/snapshots\/([^/]+)$/.exec(path)
        if (snapshotMatch?.[1] !== undefined) {
            if (request.method === 'GET') {
                return await handleGetSnapshot(env, snapshotMatch[1])
            }
            if (request.method === 'DELETE') {
                return await handleDeleteSnapshot(env, snapshotMatch[1])
            }
        }

        const snapshotRestoreMatch = /^\/api\/snapshots\/([^/]+)\/restore$/.exec(path)
        if (snapshotRestoreMatch?.[1] !== undefined && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return await handleRestoreSnapshot(env, snapshotRestoreMatch[1], body)
        }

        // Schedules routes
        if (path === '/api/schedules' && request.method === 'GET') {
            return await handleGetSchedules(env)
        }

        if (path === '/api/schedules' && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return await handleCreateSchedule(env, body)
        }

        const scheduleMatch = /^\/api\/schedules\/([^/]+)$/.exec(path)
        if (scheduleMatch?.[1] !== undefined) {
            if (request.method === 'GET') {
                return await handleGetSchedule(env, scheduleMatch[1])
            }
            if (request.method === 'PUT') {
                const body = await request.json() as Record<string, unknown>
                return await handleUpdateSchedule(env, scheduleMatch[1], body)
            }
            if (request.method === 'DELETE') {
                return await handleDeleteSchedule(env, scheduleMatch[1])
            }
        }

        const scheduleHistoryMatch = /^\/api\/schedules\/([^/]+)\/history$/.exec(path)
        if (scheduleHistoryMatch?.[1] !== undefined && request.method === 'GET') {
            return await handleScheduleHistory(env, scheduleHistoryMatch[1])
        }

        const scheduleTriggerMatch = /^\/api\/schedules\/([^/]+)\/trigger$/.exec(path)
        if (scheduleTriggerMatch?.[1] !== undefined && request.method === 'POST') {
            return await handleTriggerSchedule(env, scheduleTriggerMatch[1])
        }

        // Image routes
        const imageInfoMatch = /^\/api\/containers\/([^/]+)\/image$/.exec(path)
        if (imageInfoMatch?.[1] !== undefined && request.method === 'GET') {
            return handleGetImageInfo(imageInfoMatch[1])
        }

        const rolloutsMatch = /^\/api\/containers\/([^/]+)\/rollouts$/.exec(path)
        if (rolloutsMatch?.[1] !== undefined && request.method === 'GET') {
            return handleGetRollouts(rolloutsMatch[1])
        }

        const buildsMatch = /^\/api\/containers\/([^/]+)\/builds$/.exec(path)
        if (buildsMatch?.[1] !== undefined && request.method === 'GET') {
            return handleGetBuilds(buildsMatch[1])
        }

        const rebuildMatch = /^\/api\/containers\/([^/]+)\/rebuild$/.exec(path)
        if (rebuildMatch?.[1] !== undefined && request.method === 'POST') {
            return handleRebuild(rebuildMatch[1])
        }

        const rollbackMatch = /^\/api\/containers\/([^/]+)\/rollback$/.exec(path)
        if (rollbackMatch?.[1] !== undefined && request.method === 'POST') {
            return handleRollback(rollbackMatch[1])
        }

        // Migrations status
        if (path === '/api/migrations/status') {
            const result = await env.METADATA.prepare(
                'SELECT * FROM migrations ORDER BY applied_at'
            ).all()
            return jsonResponse({ migrations: result.results })
        }

        // 404 for unknown routes
        return jsonResponse({ error: 'Not found', path }, 404)
    } catch (error) {
        console.error('API error:', error)
        return jsonResponse({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500)
    }
}

/**
 * List all containers
 * NOTE: Cloudflare Containers API is limited. This uses demo data.
 * In production, this would call Cloudflare API to list Workers with container bindings.
 */
async function handleListContainers(env: Env): Promise<Response> {
    // Get colors from metadata
    const colorResult = await env.METADATA.prepare(
        'SELECT container_name, color FROM container_colors'
    ).all<{ container_name: string; color: string }>()

    const colorMap = new Map<string, string>()
    for (const row of colorResult.results) {
        colorMap.set(row.container_name, row.color)
    }

    // No containers are configured yet.
    // Containers must be defined in wrangler.toml with [[containers]] sections.
    // When you add real containers, this function should query them from the 
    // Cloudflare Containers API or from a D1 table that tracks container configuration.
    const containers: unknown[] = []

    return jsonResponse({
        containers,
        total: containers.length,
        message: containers.length === 0
            ? 'No containers configured. Add container definitions to wrangler.toml to get started.'
            : undefined,
    })
}

/**
 * Get a single container
 */
async function handleGetContainer(name: string, env: Env): Promise<Response> {
    const containersResponse = await handleListContainers(env)
    const data = await containersResponse.json() as { containers: unknown[] }
    const container = (data.containers as { class: { name: string } }[]).find(
        (c) => c.class.name === name
    )

    if (!container) {
        return jsonResponse({ error: 'Container not found' }, 404)
    }

    return jsonResponse({ container })
}

/**
 * List instances for a container
 */
async function handleListInstances(containerName: string, env: Env): Promise<Response> {
    const containersResponse = await handleListContainers(env)
    const data = await containersResponse.json() as { containers: unknown[] }
    const container = (data.containers as { class: { name: string }; instances: unknown[] }[]).find(
        (c) => c.class.name === containerName
    )

    if (!container) {
        return jsonResponse({ error: 'Container not found' }, 404)
    }

    return jsonResponse({
        instances: container.instances,
        total: container.instances.length,
    })
}

/**
 * Handle container actions (restart, stop, signal)
 */
async function handleContainerAction(
    name: string,
    action: string,
    env: Env
): Promise<Response> {
    // Log the action
    await env.METADATA.prepare(`
        INSERT INTO jobs (container_name, operation, status, started_at, completed_at, duration_ms)
        VALUES (?, ?, 'completed', datetime('now'), datetime('now'), 100)
    `).bind(name, action).run()

    return jsonResponse({
        success: true,
        message: `Container ${name} ${action} initiated`,
    })
}

/**
 * Update container color
 */
async function handleUpdateColor(
    name: string,
    color: string | null,
    env: Env
): Promise<Response> {
    if (color) {
        await env.METADATA.prepare(`
            INSERT OR REPLACE INTO container_colors (container_name, color, updated_at)
            VALUES (?, ?, datetime('now'))
        `).bind(name, color).run()
    } else {
        await env.METADATA.prepare(
            'DELETE FROM container_colors WHERE container_name = ?'
        ).bind(name).run()
    }

    return jsonResponse({ success: true })
}

/**
 * Stop a specific instance
 */
async function handleStopInstance(
    containerName: string,
    instanceId: string,
    env: Env
): Promise<Response> {
    // Log the action
    await env.METADATA.prepare(`
        INSERT INTO jobs (container_name, operation, status, started_at, completed_at, duration_ms, metadata)
        VALUES (?, 'stop_instance', 'completed', datetime('now'), datetime('now'), 50, ?)
    `).bind(containerName, JSON.stringify({ instanceId })).run()

    return jsonResponse({
        success: true,
        message: `Instance ${instanceId} stop initiated`,
    })
}

/**
 * Process scheduled actions
 */
async function processScheduledActions(env: Env): Promise<void> {
    const now = new Date().toISOString()

    const result = await env.METADATA.prepare(`
        SELECT * FROM scheduled_actions
        WHERE enabled = 1
        AND (next_run_at IS NULL OR next_run_at <= ?)
    `).bind(now).all()

    console.log(`Found ${result.results.length} due scheduled actions`)

    for (const action of result.results) {
        console.log(`Processing scheduled action: ${JSON.stringify(action)}`)
    }
}

/**
 * Get container configuration (demo data)
 */
function handleGetConfig(name: string): Response {
    // Demo configuration
    const config = {
        name,
        className: name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(''),
        image: `docker.io/myorg/${name}:latest`,
        instanceType: 'standard-1',
        maxInstances: 5,
        envVars: [
            { key: 'NODE_ENV', value: 'production', isSecret: false, source: 'config' },
            { key: 'API_KEY', value: '***', isSecret: true, source: 'config' },
            { key: 'DATABASE_URL', value: 'postgresql://...', isSecret: true, source: 'binding' },
        ],
        ports: [{ containerPort: 8080, protocol: 'tcp', isDefault: true }],
        network: {
            allowEgress: true,
            egressRules: [],
            allowedHosts: ['api.cloudflare.com', '*.amazonaws.com'],
        },
        healthCheck: {
            enabled: true,
            endpoint: '/health',
            intervalSeconds: 30,
            timeoutSeconds: 5,
            failureThreshold: 3,
            successThreshold: 1,
        },
        sleep: {
            enabled: true,
            sleepAfter: '5m',
            wakeOnRequest: true,
        },
        updatedAt: new Date().toISOString(),
    }

    return jsonResponse({ config })
}

/**
 * Update container configuration
 */
async function handleUpdateConfig(
    name: string,
    updates: Record<string, unknown>,
    env: Env
): Promise<Response> {
    // Log the update
    await env.METADATA.prepare(`
        INSERT INTO jobs (container_name, operation, status, started_at, completed_at, duration_ms, metadata)
        VALUES (?, 'update_config', 'completed', datetime('now'), datetime('now'), 50, ?)
    `).bind(name, JSON.stringify(updates)).run()

    // Return updated config (in production, merge with existing and return)
    const config = {
        name,
        ...updates,
        updatedAt: new Date().toISOString(),
    }

    return jsonResponse({ success: true, config })
}

/**
 * Validate configuration
 */
function handleValidateConfig(updates: Record<string, unknown>): Response {
    const errors: { field: string; message: string }[] = []
    const warnings: { field: string; message: string }[] = []

    // Validate max instances
    const maxInstances = updates['maxInstances'] as number | undefined
    if (maxInstances !== undefined) {
        if (maxInstances < 1) {
            errors.push({ field: 'maxInstances', message: 'Must be at least 1' })
        }
        if (maxInstances > 100) {
            warnings.push({ field: 'maxInstances', message: 'High instance count may increase costs' })
        }
    }

    // Validate env vars
    const envVars = updates['envVars'] as { key: string; value: string }[] | undefined
    if (envVars !== undefined) {
        for (const envVar of envVars) {
            if (!/^[A-Z_][A-Z0-9_]*$/i.test(envVar.key)) {
                errors.push({
                    field: `envVars.${envVar.key}`,
                    message: 'Invalid key format',
                })
            }
        }
    }

    return jsonResponse({
        valid: errors.length === 0,
        errors,
        warnings,
    })
}

/**
 * Get configuration diff
 */
async function handleConfigDiff(
    name: string,
    proposed: Record<string, unknown>
): Promise<Response> {
    // Get current config
    const currentResponse = handleGetConfig(name)
    const currentData = await currentResponse.json() as { config: Record<string, unknown> }
    const current = currentData.config

    const changes: { field: string; oldValue: string; newValue: string; type: string }[] = []

    // Compare fields
    for (const key of Object.keys(proposed)) {
        const oldValue = JSON.stringify(current[key])
        const newValue = JSON.stringify(proposed[key])
        if (oldValue !== newValue) {
            changes.push({
                field: key,
                oldValue: oldValue ?? 'undefined',
                newValue,
                type: current[key] === undefined ? 'added' : 'modified',
            })
        }
    }

    return jsonResponse({ changes })
}

/**
 * Get logs for container (demo data)
 */
function handleGetLogs(name: string): Response {
    const now = Date.now()
    const logs = [
        { id: '1', timestamp: new Date(now - 60000).toISOString(), level: 'info', message: `Container ${name} started successfully`, source: 'system', instanceId: 'inst-abc123' },
        { id: '2', timestamp: new Date(now - 55000).toISOString(), level: 'info', message: 'Listening on port 8080', source: 'stdout', instanceId: 'inst-abc123' },
        { id: '3', timestamp: new Date(now - 50000).toISOString(), level: 'debug', message: 'Health check endpoint registered at /health', source: 'stdout', instanceId: 'inst-abc123' },
        { id: '4', timestamp: new Date(now - 45000).toISOString(), level: 'info', message: 'Database connection established', source: 'stdout', instanceId: 'inst-abc123' },
        { id: '5', timestamp: new Date(now - 40000).toISOString(), level: 'warn', message: 'Cache miss for key: user_session_123', source: 'stderr', instanceId: 'inst-abc123' },
        { id: '6', timestamp: new Date(now - 35000).toISOString(), level: 'info', message: 'Processing incoming request: GET /api/users', source: 'stdout', instanceId: 'inst-abc123' },
        { id: '7', timestamp: new Date(now - 30000).toISOString(), level: 'debug', message: 'Query execution time: 12ms', source: 'stdout', instanceId: 'inst-abc123' },
        { id: '8', timestamp: new Date(now - 25000).toISOString(), level: 'info', message: 'Response sent: 200 OK (156 bytes)', source: 'stdout', instanceId: 'inst-abc123' },
        { id: '9', timestamp: new Date(now - 20000).toISOString(), level: 'error', message: 'Failed to connect to external API: timeout after 30s', source: 'stderr', instanceId: 'inst-def456' },
        { id: '10', timestamp: new Date(now - 15000).toISOString(), level: 'warn', message: 'Retrying external API connection (attempt 2/3)', source: 'stderr', instanceId: 'inst-def456' },
        { id: '11', timestamp: new Date(now - 10000).toISOString(), level: 'info', message: 'External API connection restored', source: 'stdout', instanceId: 'inst-def456' },
        { id: '12', timestamp: new Date(now - 5000).toISOString(), level: 'info', message: 'Health check passed', source: 'system', instanceId: 'inst-abc123' },
    ]

    return jsonResponse({ logs, hasMore: false, cursor: undefined })
}

/**
 * Clear logs for container
 */
function handleClearLogs(name: string): Response {

    console.log(`Clearing logs for container: ${name}`)
    return jsonResponse({ success: true })
}

/**
 * Download logs as text file
 */
function handleDownloadLogs(name: string): Response {
    const logs = `[2024-12-24 12:00:00] [INFO] Container ${name} started
[2024-12-24 12:00:01] [INFO] Listening on port 8080
[2024-12-24 12:00:02] [DEBUG] Health check registered
[2024-12-24 12:00:05] [INFO] Database connected
[2024-12-24 12:01:00] [WARN] Cache miss
[2024-12-24 12:01:15] [ERROR] External API timeout
[2024-12-24 12:01:30] [INFO] Connection restored`

    return new Response(logs, {
        headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${name}-logs.txt"`,
            ...corsHeaders,
        },
    })
}

/**
 * Execute HTTP test request (demo)
 */
async function handleHttpTest(
    name: string,
    request: Record<string, unknown>
): Promise<Response> {

    console.log(`HTTP test for ${name}:`, request)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400))

    const method = request['method'] as string
    const path = request['path'] as string

    // Demo response based on path
    let status = 200
    let body = ''

    if (path === '/health') {
        body = JSON.stringify({ status: 'healthy', uptime: 86400 }, null, 2)
    } else if (path.startsWith('/api/')) {
        body = JSON.stringify({
            success: true,
            data: { message: `${method} request to ${path} processed` },
            timestamp: new Date().toISOString(),
        }, null, 2)
    } else if (path === '/404') {
        status = 404
        body = JSON.stringify({ error: 'Not found' }, null, 2)
    } else {
        body = `Hello from ${name}!\nPath: ${path}\nMethod: ${method}`
    }

    return jsonResponse({
        status,
        statusText: status === 200 ? 'OK' : 'Not Found',
        headers: {
            'Content-Type': path.startsWith('/api/') || path === '/health' ? 'application/json' : 'text/plain',
            'X-Container': name,
            'X-Response-Time': `${Math.floor(100 + Math.random() * 400)}ms`,
        },
        body,
        duration: Math.floor(100 + Math.random() * 400),
        size: body.length,
    })
}

/**
 * Get container topology (demo data)
 */
function handleGetTopology(): Response {
    const nodes = [
        { id: 'api-gateway', name: 'api-gateway', className: 'ApiGateway', status: 'running', instanceCount: 3, type: 'container' },
        { id: 'user-service', name: 'user-service', className: 'UserService', status: 'running', instanceCount: 2, type: 'container' },
        { id: 'auth-service', name: 'auth-service', className: 'AuthService', status: 'running', instanceCount: 2, type: 'container' },
        { id: 'database', name: 'database', className: 'PostgresDB', status: 'running', instanceCount: 1, type: 'database' },
        { id: 'cache', name: 'cache', className: 'RedisCache', status: 'running', instanceCount: 1, type: 'service' },
        { id: 'storage', name: 'storage', className: 'ObjectStorage', status: 'running', instanceCount: 1, type: 'storage' },
        { id: 'worker', name: 'worker', className: 'BackgroundWorker', status: 'sleeping', instanceCount: 0, type: 'container' },
    ]

    const edges = [
        { id: 'e1', source: 'api-gateway', target: 'user-service', bindingType: 'service', bindingName: 'users' },
        { id: 'e2', source: 'api-gateway', target: 'auth-service', bindingType: 'service', bindingName: 'auth' },
        { id: 'e3', source: 'user-service', target: 'database', bindingType: 'd1', bindingName: 'USERS_DB' },
        { id: 'e4', source: 'auth-service', target: 'database', bindingType: 'd1', bindingName: 'AUTH_DB' },
        { id: 'e5', source: 'user-service', target: 'cache', bindingType: 'kv', bindingName: 'USER_CACHE' },
        { id: 'e6', source: 'auth-service', target: 'cache', bindingType: 'kv', bindingName: 'SESSION_CACHE' },
        { id: 'e7', source: 'user-service', target: 'storage', bindingType: 'r2', bindingName: 'AVATARS' },
        { id: 'e8', source: 'api-gateway', target: 'worker', bindingType: 'queue', bindingName: 'TASKS', animated: true },
    ]

    return jsonResponse({ nodes, edges })
}

/**
 * Detect orphan containers and issues (demo data)
 */
function handleDetectOrphans(): Response {
    return jsonResponse({
        orphanContainers: ['legacy-worker'],
        unusedBindings: ['OLD_KV_BINDING'],
        circularDependencies: [],
    })
}

/**
 * Save node positions to D1
 */
async function handleSavePositions(
    positions: Record<string, { x: number; y: number }>,
    env: Env
): Promise<Response> {
    // Log positions for demo

    console.log('Saving positions:', positions)

    // In production, would save to D1
    try {
        for (const [nodeId, pos] of Object.entries(positions)) {
            await env.METADATA.prepare(
                'INSERT OR REPLACE INTO container_colors (container_name, color) VALUES (?, ?)'
            ).bind(nodeId, JSON.stringify(pos)).run()
        }
    } catch {
        // Silently fail for demo
    }

    return jsonResponse({ success: true })
}

/**
 * Generate mock time series data
 */
function generateTimeSeries(points: number, baseValue: number, variance: number): { timestamp: string; value: number }[] {
    const now = Date.now()
    const interval = 60000 // 1 minute
    const data: { timestamp: string; value: number }[] = []

    for (let i = points - 1; i >= 0; i--) {
        const timestamp = new Date(now - i * interval).toISOString()
        const value = Math.max(0, baseValue + (Math.random() - 0.5) * variance * 2)
        data.push({ timestamp, value })
    }

    return data
}

/**
 * Handle dashboard metrics (demo data)
 */
function handleDashboardMetrics(range: string): Response {
    const pointsMap: Record<string, number> = {
        '1h': 60,
        '6h': 72,
        '24h': 96,
        '7d': 168,
        '30d': 180,
    }
    const points = pointsMap[range] ?? 60

    return jsonResponse({
        aggregated: {
            totalContainers: 7,
            runningInstances: 12,
            cpuUsage: 42.3,
            memoryUsage: 58.7,
            requestsPerMinute: 1247,
            errorsPerMinute: 3,
        },
        topContainers: {
            byCpu: [
                { name: 'api-gateway', value: 65.2 },
                { name: 'user-service', value: 48.1 },
                { name: 'auth-service', value: 35.4 },
                { name: 'worker', value: 22.8 },
                { name: 'cache', value: 12.1 },
            ],
            byMemory: [
                { name: 'database', value: 78.5 },
                { name: 'user-service', value: 62.3 },
                { name: 'api-gateway', value: 45.2 },
                { name: 'auth-service', value: 38.9 },
                { name: 'storage', value: 28.4 },
            ],
            byRequests: [
                { name: 'api-gateway', value: 523 },
                { name: 'auth-service', value: 312 },
                { name: 'user-service', value: 245 },
                { name: 'storage', value: 98 },
                { name: 'cache', value: 67 },
            ],
        },
        timeline: {
            cpu: generateTimeSeries(points, 42, 20),
            memory: generateTimeSeries(points, 58, 15),
            requests: generateTimeSeries(points, 20, 10),
        },
    })
}

/**
 * Handle container metrics (demo data)
 */
function handleContainerMetrics(name: string, range: string): Response {
    const pointsMap: Record<string, number> = {
        '1h': 60,
        '6h': 72,
        '24h': 96,
        '7d': 168,
        '30d': 180,
    }
    const points = pointsMap[range] ?? 60

    return jsonResponse({
        container: name,
        range,
        series: {
            cpu: generateTimeSeries(points, 45, 25),
            memory: generateTimeSeries(points, 55, 20),
            requests: generateTimeSeries(points, 15, 8),
            errors: generateTimeSeries(points, 0.5, 1),
        },
        current: {
            containerName: name,
            timestamp: new Date().toISOString(),
            cpu: { usage: 45.2, limit: 100 },
            memory: { used: 268435456, limit: 536870912, percentage: 50 },
            network: { bytesIn: 1234567, bytesOut: 987654, requestsPerSecond: 15 },
            instances: { total: 3, running: 2, sleeping: 1, errored: 0 },
        },
    })
}
// Job handlers (D1-backed)

interface JobRow {
    id: number
    container_name: string | null
    operation: string
    status: string
    started_at: string
    completed_at: string | null
    duration_ms: number | null
    error_message: string | null
    metadata: string | null
}

function mapJobRow(row: JobRow): Record<string, unknown> {
    const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {}
    return {
        id: String(row.id),
        name: metadata['name'] ?? row.operation,
        description: metadata['description'] ?? '',
        status: row.status,
        trigger: metadata['trigger'] ?? 'manual',
        containerName: row.container_name,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        duration: row.duration_ms,
        output: metadata['output'],
        error: row.error_message,
    }
}

async function handleGetJobs(env: Env): Promise<Response> {
    const result = await env.METADATA.prepare(
        'SELECT * FROM jobs ORDER BY started_at DESC LIMIT 100'
    ).all<JobRow>()

    const jobs = (result.results ?? []).map(mapJobRow)

    return jsonResponse({
        jobs,
        total: jobs.length,
        page: 1,
        pageSize: 100,
    })
}

async function handleJobStats(env: Env): Promise<Response> {
    const stats = await env.METADATA.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            AVG(duration_ms) as avg_duration
        FROM jobs
    `).first<{
        total: number
        pending: number
        running: number
        completed: number
        failed: number
        avg_duration: number | null
    }>()

    return jsonResponse({
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        running: stats?.running ?? 0,
        completed: stats?.completed ?? 0,
        failed: stats?.failed ?? 0,
        averageDuration: stats?.avg_duration ?? 0,
    })
}

async function handleGetJob(env: Env, id: string): Promise<Response> {
    const result = await env.METADATA.prepare(
        'SELECT * FROM jobs WHERE id = ?'
    ).bind(id).first<JobRow>()

    if (!result) {
        return jsonResponse({ error: 'Job not found' }, 404)
    }

    return jsonResponse(mapJobRow(result))
}

async function handleCancelJob(env: Env, id: string): Promise<Response> {
    await env.METADATA.prepare(`
        UPDATE jobs SET status = 'cancelled', completed_at = datetime('now')
        WHERE id = ? AND status IN ('pending', 'running')
    `).bind(id).run()

    return jsonResponse({ success: true, jobId: id })
}

async function handleRetryJob(env: Env, id: string): Promise<Response> {
    // Get original job
    const original = await env.METADATA.prepare(
        'SELECT * FROM jobs WHERE id = ?'
    ).bind(id).first<JobRow>()

    if (!original) {
        return jsonResponse({ error: 'Job not found' }, 404)
    }

    // Create retry job
    const metadata = JSON.stringify({
        ...(original.metadata ? JSON.parse(original.metadata) as Record<string, unknown> : {}),
        trigger: 'retry',
        originalJobId: id,
    })

    const result = await env.METADATA.prepare(`
        INSERT INTO jobs (container_name, operation, status, metadata)
        VALUES (?, ?, 'pending', ?)
    `).bind(original.container_name, original.operation, metadata).run()

    return jsonResponse({
        id: String(result.meta.last_row_id),
        name: original.operation,
        status: 'pending',
        trigger: 'retry',
        containerName: original.container_name,
        startedAt: new Date().toISOString(),
    })
}

// Webhook handlers (D1-backed)

interface WebhookRow {
    id: number
    url: string
    events: string
    container_filter: string | null
    secret: string | null
    enabled: number
    created_at: string
    updated_at: string
    last_triggered_at: string | null
    last_status: number | null
}

function mapWebhookRow(row: WebhookRow): Record<string, unknown> {
    return {
        id: String(row.id),
        name: `Webhook ${row.id}`,
        url: row.url,
        events: JSON.parse(row.events) as string[],
        containerFilter: row.container_filter,
        enabled: row.enabled === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastTriggeredAt: row.last_triggered_at,
        lastStatus: row.last_status,
    }
}

async function handleGetWebhooks(env: Env): Promise<Response> {
    const result = await env.METADATA.prepare(
        'SELECT * FROM webhooks ORDER BY created_at DESC'
    ).all<WebhookRow>()

    const webhooks = (result.results ?? []).map(mapWebhookRow)

    return jsonResponse({
        webhooks,
        total: webhooks.length,
    })
}

interface CreateWebhookBody {
    name?: string
    url: string
    events: string[]
    containerFilter?: string
    secret?: string
    enabled?: boolean
}

async function handleCreateWebhook(env: Env, body: unknown): Promise<Response> {
    const data = body as CreateWebhookBody

    const result = await env.METADATA.prepare(`
        INSERT INTO webhooks (url, events, container_filter, secret, enabled)
        VALUES (?, ?, ?, ?, ?)
    `).bind(
        data.url,
        JSON.stringify(data.events),
        data.containerFilter ?? null,
        data.secret ?? null,
        data.enabled !== false ? 1 : 0
    ).run()

    return jsonResponse({
        id: String(result.meta.last_row_id),
        name: data.name ?? `Webhook ${result.meta.last_row_id}`,
        url: data.url,
        events: data.events,
        containerFilter: data.containerFilter,
        enabled: data.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })
}

interface UpdateWebhookBody {
    name?: string
    url?: string
    events?: string[]
    containerFilter?: string
    secret?: string
    enabled?: boolean
}

async function handleUpdateWebhook(env: Env, id: string, body: unknown): Promise<Response> {
    const data = body as UpdateWebhookBody

    // Check exists
    const existing = await env.METADATA.prepare(
        'SELECT * FROM webhooks WHERE id = ?'
    ).bind(id).first<WebhookRow>()

    if (!existing) {
        return jsonResponse({ error: 'Webhook not found' }, 404)
    }

    await env.METADATA.prepare(`
        UPDATE webhooks SET
            url = COALESCE(?, url),
            events = COALESCE(?, events),
            container_filter = COALESCE(?, container_filter),
            secret = COALESCE(?, secret),
            enabled = COALESCE(?, enabled),
            updated_at = datetime('now')
        WHERE id = ?
    `).bind(
        data.url ?? null,
        data.events ? JSON.stringify(data.events) : null,
        data.containerFilter ?? null,
        data.secret ?? null,
        data.enabled !== undefined ? (data.enabled ? 1 : 0) : null,
        id
    ).run()

    // Fetch updated
    const updated = await env.METADATA.prepare(
        'SELECT * FROM webhooks WHERE id = ?'
    ).bind(id).first<WebhookRow>()

    return jsonResponse(updated ? mapWebhookRow(updated) : { id })
}

async function handleDeleteWebhook(env: Env, id: string): Promise<Response> {
    await env.METADATA.prepare(
        'DELETE FROM webhooks WHERE id = ?'
    ).bind(id).run()

    return jsonResponse({ success: true, webhookId: id })
}

function handleGetWebhookDeliveries(_env: Env, webhookId: string): Response {
    // Note: Deliveries would need a separate table in production
    // For now, return empty array since we don't have a deliveries table
    return jsonResponse({
        deliveries: [],
        total: 0,
        webhookId,
    })
}

async function handleTestWebhook(env: Env, id: string): Promise<Response> {
    // Get webhook
    const webhook = await env.METADATA.prepare(
        'SELECT * FROM webhooks WHERE id = ?'
    ).bind(id).first<WebhookRow>()

    if (!webhook) {
        return jsonResponse({ error: 'Webhook not found' }, 404)
    }

    // In production, this would actually send a test request to webhook.url
    // For now, just update last_triggered_at
    await env.METADATA.prepare(`
        UPDATE webhooks SET last_triggered_at = datetime('now'), last_status = 200
        WHERE id = ?
    `).bind(id).run()

    return jsonResponse({
        success: true,
        webhookId: id,
        message: `Test webhook sent to ${webhook.url}`,
    })
}

// Snapshot handlers (D1/R2-backed)

interface SnapshotRow {
    id: number
    container_name: string
    name: string | null
    description: string | null
    r2_key: string
    created_at: string
    created_by: string | null
    size_bytes: number | null
    metadata: string | null
}

interface SnapshotConfig {
    instanceType?: string
    maxInstances?: number
    sleepAfter?: number
    defaultPort?: number
    envVars?: Record<string, string>
    healthCheck?: { path: string; interval: number; timeout: number }
}

function mapSnapshotRow(row: SnapshotRow): Record<string, unknown> {
    const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {}
    return {
        id: String(row.id),
        containerName: row.container_name,
        name: row.name ?? `Snapshot ${row.id}`,
        description: row.description ?? '',
        status: 'ready',
        trigger: metadata['trigger'] ?? 'manual',
        createdAt: row.created_at,
        createdBy: row.created_by ?? 'system',
        size: row.size_bytes ?? 0,
        r2Key: row.r2_key,
        config: metadata['config'] ?? {},
    }
}

async function handleGetSnapshots(env: Env): Promise<Response> {
    const result = await env.METADATA.prepare(
        'SELECT * FROM snapshots ORDER BY created_at DESC'
    ).all<SnapshotRow>()

    const snapshots = (result.results ?? []).map(mapSnapshotRow)

    return jsonResponse({
        snapshots,
        total: snapshots.length,
    })
}

async function handleGetSnapshot(env: Env, id: string): Promise<Response> {
    const result = await env.METADATA.prepare(
        'SELECT * FROM snapshots WHERE id = ?'
    ).bind(id).first<SnapshotRow>()

    if (!result) {
        return jsonResponse({ error: 'Snapshot not found' }, 404)
    }

    // Optionally fetch config from R2
    let config: SnapshotConfig = {}
    try {
        const obj = await env.SNAPSHOT_BUCKET.get(result.r2_key)
        if (obj) {
            const text = await obj.text()
            config = JSON.parse(text) as SnapshotConfig
        }
    } catch {
        // Use metadata config if R2 fetch fails
        const metadata = result.metadata ? JSON.parse(result.metadata) as Record<string, unknown> : {}
        config = (metadata['config'] as SnapshotConfig) ?? {}
    }

    return jsonResponse({
        ...mapSnapshotRow(result),
        config,
    })
}

interface CreateSnapshotBody {
    containerName: string
    name?: string
    description?: string
    trigger?: string
}

async function handleCreateSnapshot(env: Env, body: unknown): Promise<Response> {
    const data = body as CreateSnapshotBody
    const timestamp = Date.now()
    const r2Key = `snapshots/${data.containerName}/snap-${timestamp}.json`

    // Create a sample config (in real implementation, this would capture actual container config)
    const config: SnapshotConfig = {
        instanceType: 'standard-1',
        maxInstances: 2,
        sleepAfter: 600,
        defaultPort: 8080,
        envVars: { NODE_ENV: 'production' },
    }

    const configJson = JSON.stringify(config)
    const sizeBytes = configJson.length

    // Store config in R2
    await env.SNAPSHOT_BUCKET.put(r2Key, configJson, {
        customMetadata: {
            containerName: data.containerName,
            snapshotName: data.name ?? 'unnamed',
        },
    })

    // Store metadata in D1
    const metadata = JSON.stringify({
        trigger: data.trigger ?? 'manual',
        config: config,
    })

    const result = await env.METADATA.prepare(`
        INSERT INTO snapshots 
        (container_name, name, description, r2_key, created_by, size_bytes, metadata)
        VALUES (?, ?, ?, ?, 'manual', ?, ?)
    `).bind(
        data.containerName,
        data.name ?? null,
        data.description ?? null,
        r2Key,
        sizeBytes,
        metadata
    ).run()

    const newId = result.meta.last_row_id

    return jsonResponse({
        id: String(newId),
        containerName: data.containerName,
        name: data.name ?? `Snapshot ${newId}`,
        description: data.description ?? '',
        status: 'ready',
        trigger: data.trigger ?? 'manual',
        createdAt: new Date().toISOString(),
        createdBy: 'manual',
        size: sizeBytes,
        r2Key,
        config,
    })
}

async function handleDeleteSnapshot(env: Env, id: string): Promise<Response> {
    // Get snapshot to find R2 key
    const snapshot = await env.METADATA.prepare(
        'SELECT r2_key FROM snapshots WHERE id = ?'
    ).bind(id).first<{ r2_key: string }>()

    if (snapshot) {
        // Delete from R2
        try {
            await env.SNAPSHOT_BUCKET.delete(snapshot.r2_key)
        } catch {
            // Ignore R2 deletion errors
        }
    }

    // Delete from D1
    await env.METADATA.prepare(
        'DELETE FROM snapshots WHERE id = ?'
    ).bind(id).run()

    return jsonResponse({ success: true, snapshotId: id })
}

async function handleSnapshotStats(env: Env): Promise<Response> {
    // Get aggregate stats
    const statsResult = await env.METADATA.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(size_bytes) as total_size,
            MIN(created_at) as oldest,
            MAX(created_at) as newest
        FROM snapshots
    `).first<{
        total: number
        total_size: number | null
        oldest: string | null
        newest: string | null
    }>()

    // Get counts per container
    const containerCounts = await env.METADATA.prepare(`
        SELECT container_name, COUNT(*) as count
        FROM snapshots
        GROUP BY container_name
    `).all<{ container_name: string; count: number }>()

    return jsonResponse({
        totalSnapshots: statsResult?.total ?? 0,
        totalSize: statsResult?.total_size ?? 0,
        oldestSnapshot: statsResult?.oldest,
        newestSnapshot: statsResult?.newest,
        containerCounts: (containerCounts.results ?? []).map(r => ({
            containerName: r.container_name,
            count: r.count,
        })),
    })
}

interface RestoreSnapshotOptions {
    restoreEnv?: boolean
    restoreConfig?: boolean
    restoreNetworking?: boolean
    createBackupFirst?: boolean
}

async function handleRestoreSnapshot(env: Env, id: string, options: unknown): Promise<Response> {
    const opts = options as RestoreSnapshotOptions

    // Get snapshot
    const snapshot = await env.METADATA.prepare(
        'SELECT * FROM snapshots WHERE id = ?'
    ).bind(id).first<SnapshotRow>()

    if (!snapshot) {
        return jsonResponse({ error: 'Snapshot not found' }, 404)
    }

    // Fetch config from R2
    let config: SnapshotConfig = {}
    try {
        const obj = await env.SNAPSHOT_BUCKET.get(snapshot.r2_key)
        if (obj) {
            const text = await obj.text()
            config = JSON.parse(text) as SnapshotConfig
        }
    } catch {
        const metadata = snapshot.metadata ? JSON.parse(snapshot.metadata) as Record<string, unknown> : {}
        config = (metadata['config'] as SnapshotConfig) ?? {}
    }

    // Create backup if requested
    if (opts.createBackupFirst) {
        await handleCreateSnapshot(env, {
            containerName: snapshot.container_name,
            name: `pre-restore-backup-${Date.now()}`,
            description: `Automatic backup before restoring snapshot ${id}`,
            trigger: 'pre-restore',
        })
    }

    // In a real implementation, this would apply the config to the container
    // For now, we just return success with the changes that would be made
    const changes: { field: string; newValue: unknown }[] = []

    if (opts.restoreConfig !== false && config.maxInstances !== undefined) {
        changes.push({ field: 'maxInstances', newValue: config.maxInstances })
    }
    if (opts.restoreConfig !== false && config.sleepAfter !== undefined) {
        changes.push({ field: 'sleepAfter', newValue: config.sleepAfter })
    }
    if (opts.restoreEnv !== false && config.envVars) {
        Object.entries(config.envVars).forEach(([key, value]) => {
            changes.push({ field: `envVars.${key}`, newValue: value })
        })
    }

    // Log the restore as a job
    await env.METADATA.prepare(`
        INSERT INTO jobs (container_name, operation, status, metadata)
        VALUES (?, 'restore', 'completed', ?)
    `).bind(
        snapshot.container_name,
        JSON.stringify({ snapshotId: id, changes })
    ).run()

    return jsonResponse({
        success: true,
        snapshotId: id,
        containerName: snapshot.container_name,
        restoredAt: new Date().toISOString(),
        changes,
    })
}

// Schedule handlers (D1-backed)

interface ScheduledActionRow {
    id: number
    container_name: string
    action_type: string
    cron_expression: string
    timezone: string
    enabled: number
    last_run_at: string | null
    last_run_status: string | null
    next_run_at: string | null
    metadata: string | null
    created_at: string
    updated_at: string
}

function mapScheduleRow(row: ScheduledActionRow): Record<string, unknown> {
    const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {}
    return {
        id: String(row.id),
        containerName: row.container_name,
        name: metadata['name'] ?? `Schedule ${row.id}`,
        description: metadata['description'] ?? '',
        action: row.action_type,
        actionParams: metadata['actionParams'] ?? {},
        cronExpression: row.cron_expression,
        cronDescription: metadata['cronDescription'] ?? row.cron_expression,
        timezone: row.timezone,
        enabled: row.enabled === 1,
        status: row.enabled === 1 ? 'active' : 'paused',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastRunAt: row.last_run_at,
        lastRunStatus: row.last_run_status,
        nextRunAt: row.next_run_at,
        runCount: metadata['runCount'] ?? 0,
    }
}

async function handleGetSchedules(env: Env): Promise<Response> {
    const result = await env.METADATA.prepare(
        'SELECT * FROM scheduled_actions ORDER BY created_at DESC'
    ).all<ScheduledActionRow>()

    const schedules = (result.results ?? []).map(mapScheduleRow)

    return jsonResponse({
        schedules,
        total: schedules.length,
    })
}

async function handleGetSchedule(env: Env, id: string): Promise<Response> {
    const result = await env.METADATA.prepare(
        'SELECT * FROM scheduled_actions WHERE id = ?'
    ).bind(id).first<ScheduledActionRow>()

    if (!result) {
        return jsonResponse({ error: 'Schedule not found' }, 404)
    }

    return jsonResponse(mapScheduleRow(result))
}

interface CreateScheduleBody {
    containerName: string
    name: string
    description?: string
    action: string
    actionParams?: Record<string, unknown>
    cronExpression: string
    timezone?: string
    enabled?: boolean
}

async function handleCreateSchedule(env: Env, body: unknown): Promise<Response> {
    const data = body as CreateScheduleBody
    const metadata = JSON.stringify({
        name: data.name,
        description: data.description ?? '',
        actionParams: data.actionParams ?? {},
        cronDescription: data.cronExpression,
        runCount: 0,
    })

    const result = await env.METADATA.prepare(`
        INSERT INTO scheduled_actions 
        (container_name, action_type, cron_expression, timezone, enabled, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        data.containerName,
        data.action,
        data.cronExpression,
        data.timezone ?? 'UTC',
        data.enabled !== false ? 1 : 0,
        metadata
    ).run()

    const newId = result.meta.last_row_id

    return jsonResponse({
        id: String(newId),
        containerName: data.containerName,
        name: data.name,
        description: data.description ?? '',
        action: data.action,
        cronExpression: data.cronExpression,
        timezone: data.timezone ?? 'UTC',
        enabled: data.enabled !== false,
        status: data.enabled !== false ? 'active' : 'paused',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        runCount: 0,
    })
}

interface UpdateScheduleBody {
    name?: string
    description?: string
    action?: string
    actionParams?: Record<string, unknown>
    cronExpression?: string
    timezone?: string
    enabled?: boolean
}

async function handleUpdateSchedule(env: Env, id: string, body: unknown): Promise<Response> {
    const data = body as UpdateScheduleBody

    // Get existing record
    const existing = await env.METADATA.prepare(
        'SELECT * FROM scheduled_actions WHERE id = ?'
    ).bind(id).first<ScheduledActionRow>()

    if (!existing) {
        return jsonResponse({ error: 'Schedule not found' }, 404)
    }

    const existingMetadata = existing.metadata ? JSON.parse(existing.metadata) as Record<string, unknown> : {}
    const updatedMetadata = JSON.stringify({
        ...existingMetadata,
        name: data.name ?? existingMetadata['name'],
        description: data.description ?? existingMetadata['description'],
        actionParams: data.actionParams ?? existingMetadata['actionParams'],
        cronDescription: data.cronExpression ?? existingMetadata['cronDescription'],
    })

    await env.METADATA.prepare(`
        UPDATE scheduled_actions SET
            action_type = COALESCE(?, action_type),
            cron_expression = COALESCE(?, cron_expression),
            timezone = COALESCE(?, timezone),
            enabled = COALESCE(?, enabled),
            metadata = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `).bind(
        data.action ?? null,
        data.cronExpression ?? null,
        data.timezone ?? null,
        data.enabled !== undefined ? (data.enabled ? 1 : 0) : null,
        updatedMetadata,
        id
    ).run()

    // Fetch updated record
    const updated = await env.METADATA.prepare(
        'SELECT * FROM scheduled_actions WHERE id = ?'
    ).bind(id).first<ScheduledActionRow>()

    return jsonResponse(updated ? mapScheduleRow(updated) : { id })
}

async function handleDeleteSchedule(env: Env, id: string): Promise<Response> {
    await env.METADATA.prepare(
        'DELETE FROM scheduled_actions WHERE id = ?'
    ).bind(id).run()

    return jsonResponse({ success: true, scheduleId: id })
}

async function handleScheduleHistory(env: Env, scheduleId: string): Promise<Response> {
    // Get schedule info first
    const schedule = await env.METADATA.prepare(
        'SELECT * FROM scheduled_actions WHERE id = ?'
    ).bind(scheduleId).first<ScheduledActionRow>()

    if (!schedule) {
        return jsonResponse({ error: 'Schedule not found' }, 404)
    }

    // Get execution history from jobs table
    const result = await env.METADATA.prepare(`
        SELECT * FROM jobs 
        WHERE metadata LIKE ? 
        ORDER BY started_at DESC 
        LIMIT 50
    `).bind(`%"scheduleId":${scheduleId}%`).all<{
        id: number
        container_name: string
        operation: string
        status: string
        started_at: string
        completed_at: string | null
        duration_ms: number | null
        error_message: string | null
        metadata: string | null
    }>()

    const metadata = schedule.metadata ? JSON.parse(schedule.metadata) as Record<string, unknown> : {}
    const executions = (result.results ?? []).map(row => ({
        id: String(row.id),
        scheduleId,
        scheduleName: metadata['name'] ?? 'Schedule',
        containerName: row.container_name,
        action: row.operation,
        status: row.status === 'completed' ? 'success' : row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        duration: row.duration_ms,
        output: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>)['output'] : null,
        error: row.error_message,
    }))

    return jsonResponse({
        executions,
        total: executions.length,
    })
}

async function handleTriggerSchedule(env: Env, id: string): Promise<Response> {
    // Get the schedule
    const schedule = await env.METADATA.prepare(
        'SELECT * FROM scheduled_actions WHERE id = ?'
    ).bind(id).first<ScheduledActionRow>()

    if (!schedule) {
        return jsonResponse({ error: 'Schedule not found' }, 404)
    }

    // Create a job entry for the triggered execution
    const jobMetadata = JSON.stringify({
        scheduleId: id,
        triggeredManually: true,
        output: 'Triggered manually',
    })

    await env.METADATA.prepare(`
        INSERT INTO jobs (container_name, operation, status, metadata)
        VALUES (?, ?, 'completed', ?)
    `).bind(schedule.container_name, schedule.action_type, jobMetadata).run()

    // Update last run info
    const existingMetadata = schedule.metadata ? JSON.parse(schedule.metadata) as Record<string, unknown> : {}
    const runCount = ((existingMetadata['runCount'] as number) ?? 0) + 1
    const updatedMetadata = JSON.stringify({ ...existingMetadata, runCount })

    await env.METADATA.prepare(`
        UPDATE scheduled_actions SET
            last_run_at = datetime('now'),
            last_run_status = 'success',
            metadata = ?
        WHERE id = ?
    `).bind(updatedMetadata, id).run()

    return jsonResponse({
        success: true,
        scheduleId: id,
        message: `Schedule triggered: ${schedule.action_type} on ${schedule.container_name}`,
    })
}

// Image handlers
function handleGetImageInfo(containerName: string): Response {
    return jsonResponse({
        current: {
            containerName,
            digest: 'sha256:a3ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d4',
            tag: 'v2.1.0',
            registry: 'registry.cloudflare.com',
            repository: `containers/${containerName}`,
            size: 156274688, // ~149 MB
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            builtAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            dockerfileSource: 'github.com/org/repo/Dockerfile',
            buildArgs: { NODE_ENV: 'production' },
        },
        previousVersions: [
            {
                digest: 'sha256:b4ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d5',
                tag: 'v2.0.0',
                builtAt: new Date(Date.now() - 86400000 * 10).toISOString(),
            },
            {
                digest: 'sha256:c5ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d6',
                tag: 'v1.9.0',
                builtAt: new Date(Date.now() - 86400000 * 20).toISOString(),
            },
            {
                digest: 'sha256:d6ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d7',
                tag: 'v1.8.0',
                builtAt: new Date(Date.now() - 86400000 * 30).toISOString(),
            },
        ],
    })
}

function handleGetRollouts(containerName: string): Response {
    return jsonResponse({
        rollouts: [
            {
                id: 'rollout-1',
                containerName,
                fromDigest: 'sha256:b4ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d5',
                toDigest: 'sha256:a3ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d4',
                toTag: 'v2.1.0',
                status: 'complete',
                startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
                completedAt: new Date(Date.now() - 86400000 * 3 + 45000).toISOString(),
                duration: 45000,
                instancesUpdated: 3,
                instancesTotal: 3,
                triggeredBy: 'admin',
            },
            {
                id: 'rollout-2',
                containerName,
                fromDigest: 'sha256:c5ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d6',
                toDigest: 'sha256:b4ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d5',
                toTag: 'v2.0.0',
                status: 'complete',
                startedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
                completedAt: new Date(Date.now() - 86400000 * 10 + 60000).toISOString(),
                duration: 60000,
                instancesUpdated: 3,
                instancesTotal: 3,
                triggeredBy: 'ci/cd',
            },
            {
                id: 'rollout-3',
                containerName,
                toDigest: 'sha256:failed123',
                toTag: 'v2.0.0-rc1',
                status: 'failed',
                startedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
                completedAt: new Date(Date.now() - 86400000 * 12 + 30000).toISOString(),
                duration: 30000,
                instancesUpdated: 1,
                instancesTotal: 3,
                triggeredBy: 'ci/cd',
                error: 'Health check failed on instance 2',
            },
        ],
        total: 3,
    })
}

function handleGetBuilds(containerName: string): Response {
    return jsonResponse({
        builds: [
            {
                id: 'build-1',
                containerName,
                status: 'complete',
                digest: 'sha256:a3ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d4',
                tag: 'v2.1.0',
                startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
                completedAt: new Date(Date.now() - 86400000 * 3 + 180000).toISOString(),
                duration: 180000,
                triggeredBy: 'ci/cd',
            },
        ],
        total: 1,
    })
}

function handleRebuild(containerName: string): Response {
    return jsonResponse({
        id: `build-${Date.now()}`,
        containerName,
        status: 'pending',
        tag: 'latest',
        startedAt: new Date().toISOString(),
        triggeredBy: 'manual',
    })
}

function handleRollback(containerName: string): Response {
    return jsonResponse({
        success: true,
        rolloutId: `rollout-${Date.now()}`,
        containerName,
    })
}

/**
 * Create a JSON response
 */
function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
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

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
        ctx.waitUntil(processScheduledActions(env))
    },
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
            return handleGetJobs()
        }

        if (path === '/api/jobs/stats' && request.method === 'GET') {
            return handleJobStats()
        }

        const jobMatch = /^\/api\/jobs\/([^/]+)$/.exec(path)
        if (jobMatch?.[1] !== undefined && request.method === 'GET') {
            return handleGetJob(jobMatch[1])
        }

        const jobCancelMatch = /^\/api\/jobs\/([^/]+)\/cancel$/.exec(path)
        if (jobCancelMatch?.[1] !== undefined && request.method === 'POST') {
            return handleCancelJob(jobCancelMatch[1])
        }

        const jobRetryMatch = /^\/api\/jobs\/([^/]+)\/retry$/.exec(path)
        if (jobRetryMatch?.[1] !== undefined && request.method === 'POST') {
            return handleRetryJob(jobRetryMatch[1])
        }

        // Webhooks routes
        if (path === '/api/webhooks' && request.method === 'GET') {
            return handleGetWebhooks()
        }

        if (path === '/api/webhooks' && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return handleCreateWebhook(body)
        }

        const webhookMatch = /^\/api\/webhooks\/([^/]+)$/.exec(path)
        if (webhookMatch?.[1] !== undefined) {
            if (request.method === 'PUT') {
                const body = await request.json() as Record<string, unknown>
                return handleUpdateWebhook(webhookMatch[1], body)
            }
            if (request.method === 'DELETE') {
                return handleDeleteWebhook(webhookMatch[1])
            }
        }

        const webhookDeliveriesMatch = /^\/api\/webhooks\/([^/]+)\/deliveries$/.exec(path)
        if (webhookDeliveriesMatch?.[1] !== undefined && request.method === 'GET') {
            return handleGetWebhookDeliveries(webhookDeliveriesMatch[1])
        }

        const webhookTestMatch = /^\/api\/webhooks\/([^/]+)\/test$/.exec(path)
        if (webhookTestMatch?.[1] !== undefined && request.method === 'POST') {
            return handleTestWebhook(webhookTestMatch[1])
        }

        // Snapshots routes
        if (path === '/api/snapshots' && request.method === 'GET') {
            return handleGetSnapshots()
        }

        if (path === '/api/snapshots' && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return handleCreateSnapshot(body)
        }

        if (path === '/api/snapshots/stats' && request.method === 'GET') {
            return handleSnapshotStats()
        }

        const snapshotMatch = /^\/api\/snapshots\/([^/]+)$/.exec(path)
        if (snapshotMatch?.[1] !== undefined) {
            if (request.method === 'GET') {
                return handleGetSnapshot(snapshotMatch[1])
            }
            if (request.method === 'DELETE') {
                return handleDeleteSnapshot(snapshotMatch[1])
            }
        }

        const snapshotRestoreMatch = /^\/api\/snapshots\/([^/]+)\/restore$/.exec(path)
        if (snapshotRestoreMatch?.[1] !== undefined && request.method === 'POST') {
            const body = await request.json() as Record<string, unknown>
            return handleRestoreSnapshot(snapshotRestoreMatch[1], body)
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

    // Demo containers - in production, fetch from Cloudflare API
    const demoContainers = [
        {
            class: {
                name: 'api-server',
                className: 'ApiServer',
                workerName: 'my-api-worker',
                image: 'docker.io/myorg/api-server:latest',
                instanceType: 'standard-1' as const,
                maxInstances: 10,
                defaultPort: 8080,
                sleepAfter: '5m',
                createdAt: '2025-01-01T00:00:00Z',
                modifiedAt: '2025-12-24T12:00:00Z',
            },
            instances: [
                {
                    id: 'inst-abc123',
                    containerName: 'api-server',
                    status: 'running' as const,
                    location: 'iad',
                    startedAt: new Date(Date.now() - 3600000).toISOString(),
                    cpuPercent: 12.5,
                    memoryMb: 256,
                },
                {
                    id: 'inst-def456',
                    containerName: 'api-server',
                    status: 'running' as const,
                    location: 'sfo',
                    startedAt: new Date(Date.now() - 7200000).toISOString(),
                    cpuPercent: 8.3,
                    memoryMb: 198,
                },
            ],
            status: 'running' as const,
            color: colorMap.get('api-server'),
        },
        {
            class: {
                name: 'worker-processor',
                className: 'WorkerProcessor',
                workerName: 'background-jobs',
                image: 'docker.io/myorg/worker:v2.1.0',
                instanceType: 'standard-2' as const,
                maxInstances: 5,
                defaultPort: 9000,
                sleepAfter: '10m',
                createdAt: '2025-02-15T00:00:00Z',
                modifiedAt: '2025-12-20T08:30:00Z',
            },
            instances: [
                {
                    id: 'inst-ghi789',
                    containerName: 'worker-processor',
                    status: 'running' as const,
                    location: 'lhr',
                    startedAt: new Date(Date.now() - 1800000).toISOString(),
                    cpuPercent: 45.2,
                    memoryMb: 1024,
                },
            ],
            status: 'running' as const,
            color: colorMap.get('worker-processor'),
        },
        {
            class: {
                name: 'ml-inference',
                className: 'MLInference',
                workerName: 'ml-service',
                image: 'docker.io/myorg/ml-model:v1.0.0',
                instanceType: 'standard-4' as const,
                maxInstances: 3,
                defaultPort: 5000,
                createdAt: '2025-03-01T00:00:00Z',
                modifiedAt: '2025-12-22T16:00:00Z',
            },
            instances: [],
            status: 'stopped' as const,
            color: colorMap.get('ml-inference'),
        },
    ]

    return jsonResponse({
        containers: demoContainers,
        total: demoContainers.length,
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

// Mock jobs data
const mockJobs = [
    {
        id: 'job-1',
        name: 'Container Health Check',
        description: 'Periodic health check for all containers',
        status: 'completed',
        trigger: 'scheduled',
        containerName: 'api-gateway',
        startedAt: new Date(Date.now() - 300000).toISOString(),
        completedAt: new Date(Date.now() - 295000).toISOString(),
        duration: 5000,
        output: 'All containers healthy',
    },
    {
        id: 'job-2',
        name: 'Log Rotation',
        description: 'Rotate and archive container logs',
        status: 'running',
        trigger: 'scheduled',
        startedAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
        id: 'job-3',
        name: 'Backup Database',
        description: 'Scheduled database backup',
        status: 'failed',
        trigger: 'scheduled',
        containerName: 'database',
        startedAt: new Date(Date.now() - 600000).toISOString(),
        completedAt: new Date(Date.now() - 590000).toISOString(),
        duration: 10000,
        error: 'Connection timeout after 10s',
    },
    {
        id: 'job-4',
        name: 'Scale Up Event',
        description: 'Auto-scaling triggered by high load',
        status: 'completed',
        trigger: 'container_event',
        containerName: 'user-service',
        startedAt: new Date(Date.now() - 1800000).toISOString(),
        completedAt: new Date(Date.now() - 1797000).toISOString(),
        duration: 3000,
        output: 'Scaled from 2 to 4 instances',
    },
    {
        id: 'job-5',
        name: 'Manual Deploy',
        description: 'Manual deployment triggered by user',
        status: 'pending',
        trigger: 'manual',
        containerName: 'auth-service',
        startedAt: new Date().toISOString(),
    },
]

function handleGetJobs(): Response {
    return jsonResponse({
        jobs: mockJobs,
        total: mockJobs.length,
        page: 1,
        pageSize: 50,
    })
}

function handleJobStats(): Response {
    return jsonResponse({
        total: mockJobs.length,
        pending: mockJobs.filter(j => j.status === 'pending').length,
        running: mockJobs.filter(j => j.status === 'running').length,
        completed: mockJobs.filter(j => j.status === 'completed').length,
        failed: mockJobs.filter(j => j.status === 'failed').length,
        averageDuration: 6000,
    })
}

function handleGetJob(id: string): Response {
    const job = mockJobs.find(j => j.id === id)
    if (!job) {
        return jsonResponse({ error: 'Job not found' }, 404)
    }
    return jsonResponse(job)
}

function handleCancelJob(id: string): Response {
    return jsonResponse({ success: true, jobId: id })
}

function handleRetryJob(id: string): Response {
    return jsonResponse({
        ...mockJobs[0],
        id: `${id}-retry`,
        status: 'pending',
        startedAt: new Date().toISOString(),
    })
}

// Mock webhooks data
const mockWebhooks = [
    {
        id: 'webhook-1',
        name: 'Slack Notifications',
        url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
        events: ['container.error', 'job.failed'],
        enabled: true,
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'webhook-2',
        name: 'PagerDuty',
        url: 'https://events.pagerduty.com/v2/enqueue',
        events: ['container.error'],
        enabled: true,
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        id: 'webhook-3',
        name: 'Analytics',
        url: 'https://analytics.example.com/events',
        events: ['container.started', 'container.stopped', 'container.scaled'],
        enabled: false,
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
]

function handleGetWebhooks(): Response {
    return jsonResponse({
        webhooks: mockWebhooks,
        total: mockWebhooks.length,
    })
}

function handleCreateWebhook(_body: unknown): Response {
    return jsonResponse({
        id: `webhook-${Date.now()}`,
        ...(_body as object),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })
}

function handleUpdateWebhook(id: string, _body: unknown): Response {
    const webhook = mockWebhooks.find(w => w.id === id)
    if (!webhook) {
        return jsonResponse({ error: 'Webhook not found' }, 404)
    }
    return jsonResponse({
        ...webhook,
        ...(_body as object),
        updatedAt: new Date().toISOString(),
    })
}

function handleDeleteWebhook(id: string): Response {
    return jsonResponse({ success: true, webhookId: id })
}

function handleGetWebhookDeliveries(webhookId: string): Response {
    return jsonResponse({
        deliveries: [
            {
                id: 'delivery-1',
                webhookId,
                event: 'container.error',
                status: 'delivered',
                requestBody: '{"event":"container.error","container":"api-gateway"}',
                responseStatus: 200,
                attemptCount: 1,
                lastAttemptAt: new Date(Date.now() - 3600000).toISOString(),
                duration: 250,
            },
            {
                id: 'delivery-2',
                webhookId,
                event: 'job.failed',
                status: 'failed',
                requestBody: '{"event":"job.failed","job":"backup"}',
                responseStatus: 500,
                responseBody: 'Internal Server Error',
                attemptCount: 3,
                lastAttemptAt: new Date(Date.now() - 7200000).toISOString(),
                error: 'Max retries exceeded',
                duration: 1500,
            },
        ],
        total: 2,
    })
}

function handleTestWebhook(id: string): Response {
    return jsonResponse({ success: true, webhookId: id })
}

// Mock snapshots data
const mockSnapshots = [
    {
        id: 'snap-1',
        containerName: 'api-gateway',
        name: 'before-deploy-v2',
        description: 'Snapshot before version 2.0 deployment',
        status: 'ready',
        trigger: 'manual',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdBy: 'admin',
        size: 4520,
        r2Key: 'snapshots/api-gateway/snap-1.json',
        config: {
            instanceType: 'standard-1',
            maxInstances: 4,
            sleepAfter: 600,
            defaultPort: 8080,
            envVars: { NODE_ENV: 'production', LOG_LEVEL: 'info' },
            healthCheck: { path: '/health', interval: 30, timeout: 5 },
        },
    },
    {
        id: 'snap-2',
        containerName: 'user-service',
        name: 'weekly-backup',
        status: 'ready',
        trigger: 'scheduled',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        size: 3240,
        r2Key: 'snapshots/user-service/snap-2.json',
        config: {
            instanceType: 'standard-2',
            maxInstances: 2,
            defaultPort: 3000,
            envVars: { NODE_ENV: 'production' },
        },
    },
    {
        id: 'snap-3',
        containerName: 'api-gateway',
        name: 'pre-migration',
        description: 'Before database migration',
        status: 'ready',
        trigger: 'pre-deploy',
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        size: 4100,
        r2Key: 'snapshots/api-gateway/snap-3.json',
        config: {
            instanceType: 'standard-1',
            maxInstances: 3,
            sleepAfter: 600,
            defaultPort: 8080,
            envVars: { NODE_ENV: 'production', LOG_LEVEL: 'debug' },
        },
    },
]

function handleGetSnapshots(): Response {
    return jsonResponse({
        snapshots: mockSnapshots,
        total: mockSnapshots.length,
    })
}

function handleGetSnapshot(id: string): Response {
    const snapshot = mockSnapshots.find(s => s.id === id)
    if (!snapshot) {
        return jsonResponse({ error: 'Snapshot not found' }, 404)
    }
    return jsonResponse(snapshot)
}

function handleCreateSnapshot(_body: unknown): Response {
    return jsonResponse({
        id: `snap-${Date.now()}`,
        ...(_body as object),
        status: 'creating',
        createdAt: new Date().toISOString(),
        size: 0,
        r2Key: `snapshots/temp/snap-${Date.now()}.json`,
        config: {
            instanceType: 'standard-1',
            maxInstances: 1,
            envVars: {},
        },
    })
}

function handleDeleteSnapshot(id: string): Response {
    return jsonResponse({ success: true, snapshotId: id })
}

function handleSnapshotStats(): Response {
    const oldest = mockSnapshots[mockSnapshots.length - 1]
    const newest = mockSnapshots[0]
    return jsonResponse({
        totalSnapshots: mockSnapshots.length,
        totalSize: mockSnapshots.reduce((sum, s) => sum + s.size, 0),
        oldestSnapshot: oldest?.createdAt,
        newestSnapshot: newest?.createdAt,
        containerCounts: [
            { containerName: 'api-gateway', count: 2 },
            { containerName: 'user-service', count: 1 },
        ],
    })
}

function handleRestoreSnapshot(id: string, _options: unknown): Response {
    const snapshot = mockSnapshots.find(s => s.id === id)
    if (!snapshot) {
        return jsonResponse({ error: 'Snapshot not found' }, 404)
    }
    return jsonResponse({
        success: true,
        snapshotId: id,
        containerName: snapshot.containerName,
        restoredAt: new Date().toISOString(),
        changes: [
            { field: 'maxInstances', oldValue: 2, newValue: snapshot.config.maxInstances },
            { field: 'envVars.LOG_LEVEL', oldValue: 'warn', newValue: 'info' },
        ],
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

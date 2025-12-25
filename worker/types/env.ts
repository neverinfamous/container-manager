/**
 * Worker environment bindings
 */
export interface Env {
    // D1 Database for metadata
    METADATA: D1Database

    // R2 Bucket for snapshots
    SNAPSHOT_BUCKET: R2Bucket

    // Durable Object for async operations
    SNAPSHOT_DO: DurableObjectNamespace

    // Container bindings
    HELLO_WORLD: DurableObjectNamespace

    // Static assets
    ASSETS: Fetcher

    // Secrets
    ACCOUNT_ID: string
    API_KEY: string
    TEAM_DOMAIN: string
    POLICY_AUD: string
}

/**
 * Worker execution context
 */
export interface WorkerContext {
    env: Env
    ctx: ExecutionContext
}

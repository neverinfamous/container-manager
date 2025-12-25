/**
 * Deployment Steps - Step-by-step guide for deploying container-manager
 */

export interface DeploymentStep {
    id: string
    title: string
    description: string
    commands?: { label: string; command: string }[]
    notes?: string[]
    links?: { label: string; url: string }[]
    platform: 'wsl2' | 'any'
}

export const DEPLOYMENT_STEPS: DeploymentStep[] = [
    {
        id: 'wsl2',
        title: 'Enable WSL2',
        description: 'Windows Subsystem for Linux 2 is required for deploying Cloudflare Workers with containers.',
        commands: [
            { label: 'Enable WSL', command: 'wsl --install' },
            { label: 'Set WSL2 default', command: 'wsl --set-default-version 2' },
        ],
        notes: [
            'Restart your computer after installation',
            'Ubuntu is installed by default',
        ],
        links: [
            { label: 'WSL2 Documentation', url: 'https://learn.microsoft.com/en-us/windows/wsl/install' },
        ],
        platform: 'wsl2',
    },
    {
        id: 'nodejs',
        title: 'Install Node.js in WSL2',
        description: 'Install Node.js 20+ inside your WSL2 Ubuntu environment.',
        commands: [
            { label: 'Install nvm', command: 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash' },
            { label: 'Install Node 20', command: 'nvm install 20' },
            { label: 'Verify installation', command: 'node --version' },
        ],
        notes: [
            'Run these commands inside WSL2 (open Ubuntu terminal)',
            'Close and reopen terminal after installing nvm',
        ],
        platform: 'wsl2',
    },
    {
        id: 'npm-install',
        title: 'Install Dependencies (WSL2)',
        description: 'Run npm install from WSL2 to get Linux-compatible binaries for rollup and other native modules.',
        commands: [
            { label: 'Navigate to project', command: 'cd /mnt/c/Users/YOUR_USERNAME/Desktop/container-manager' },
            { label: 'Remove Windows modules', command: 'rm -rf node_modules package-lock.json' },
            { label: 'Install dependencies', command: 'npm install' },
        ],
        notes: [
            'Replace YOUR_USERNAME with your Windows username',
            'This fixes "Cannot find module @rollup/rollup-linux-x64-gnu" errors',
        ],
        platform: 'wsl2',
    },
    {
        id: 'wrangler-login',
        title: 'Authenticate with Cloudflare',
        description: 'Log in to your Cloudflare account using wrangler CLI.',
        commands: [
            { label: 'Login to Cloudflare', command: 'npx wrangler login' },
            { label: 'Verify login', command: 'npx wrangler whoami' },
        ],
        notes: [
            'A browser window will open for authentication',
            'Make sure you have a Cloudflare account',
        ],
        links: [
            { label: 'Create Cloudflare account', url: 'https://dash.cloudflare.com/sign-up' },
        ],
        platform: 'wsl2',
    },
    {
        id: 'd1-create',
        title: 'Create D1 Database',
        description: 'Create the D1 database for storing container metadata.',
        commands: [
            { label: 'Create database', command: 'npx wrangler d1 create container-manager-metadata' },
        ],
        notes: [
            'Copy the database_id from the output',
            'You will need this ID for the next step',
        ],
        platform: 'wsl2',
    },
    {
        id: 'wrangler-toml',
        title: 'Update wrangler.toml',
        description: 'Add your D1 database binding to wrangler.toml.',
        commands: [
            {
                label: 'Example binding', command: `[[d1_databases]]
binding = "METADATA"
database_name = "container-manager-metadata"
database_id = "YOUR_DATABASE_ID"` },
        ],
        notes: [
            'Replace YOUR_DATABASE_ID with the ID from the previous step',
            'The binding name "METADATA" must match what the worker expects',
        ],
        platform: 'any',
    },
    {
        id: 'd1-migrate',
        title: 'Run D1 Migration',
        description: 'Create the containers table in your D1 database.',
        commands: [
            { label: 'Run migration', command: 'npx wrangler d1 execute container-manager-metadata --remote --file=./migrations/001_create_tables.sql' },
            { label: 'Verify table', command: 'npx wrangler d1 execute container-manager-metadata --remote --command="SELECT name FROM sqlite_master WHERE type=\'table\';"' },
        ],
        notes: [
            'Make sure the migration file exists in ./migrations/',
            'Use --remote flag to run on production database',
        ],
        platform: 'wsl2',
    },
    {
        id: 'deploy',
        title: 'Deploy to Cloudflare',
        description: 'Deploy the container manager worker to Cloudflare.',
        commands: [
            { label: 'Deploy worker', command: 'npx wrangler deploy' },
        ],
        notes: [
            'Run this from WSL2, not Windows PowerShell',
            'The worker URL will be shown after successful deployment',
        ],
        links: [
            { label: 'Cloudflare Dashboard', url: 'https://dash.cloudflare.com/' },
        ],
        platform: 'wsl2',
    },
]

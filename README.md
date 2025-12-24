# Cloudflare Container Manager

A management platform for Cloudflare Containers, designed with the same philosophy and capabilities as [D1 Manager](https://github.com/neverinfamous/d1-manager).

[![GitHub](https://img.shields.io/badge/GitHub-neverinfamous/container--manager-blue?logo=github)](https://github.com/neverinfamous/container-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/version-v0.1.0-green)
![Status](https://img.shields.io/badge/status-Development-yellow)

## Tech Stack

**Frontend**: React 19 | Vite 7 | TypeScript 5.9 | Tailwind CSS 4 | shadcn/ui

**Backend**: Cloudflare Workers + D1 + R2 + Durable Objects + Zero Trust

---

## 🎯 Planned Features

### Container Lifecycle Management
- View all container classes in your account
- Start, stop, restart, and delete containers
- View running instances with location and uptime
- Bulk operations with multi-select
- Health check configuration
- Color tags for visual organization

### Configuration & Environment
- Environment variable editor with validation
- Secrets manager (KV/Secrets bindings)
- Instance type selector (lite → standard-4)
- Port and timeout configuration
- Networking and egress rules
- Config diff viewer

### Logs & Debug Console
- Real-time log streaming
- Log level filtering and search
- HTTP test client for container endpoints
- Saved request templates
- Export logs (JSON/CSV)

### Dependency Topology
- Interactive container dependency graph
- Container ↔ D1/KV/R2/DO binding visualization
- Orphan detection
- Circular dependency alerts
- Export (PNG/SVG/JSON)

### Snapshots & Rollback
- Create configuration snapshots
- Restore from snapshots
- Auto-snapshot before destructive operations
- R2-backed snapshot storage
- Orphaned snapshot detection

### Scheduling & Automation
- Scheduled restart/rebuild/scale actions
- Cron expression builder
- Execution history
- Enable/disable per schedule

### Metrics Dashboard
- CPU, memory, request metrics
- Time range selector (24h/7d/30d)
- Latency percentiles (P50/P90/P99)
- Instance count over time

### Webhooks
- Event-driven notifications
- Container lifecycle events
- Schedule execution events
- HMAC signing support

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up)

### Local Development

```bash
git clone https://github.com/neverinfamous/container-manager.git
cd container-manager
npm install
```

**Start the servers (2 terminals):**

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Worker API:
```bash
npx wrangler dev --config wrangler.dev.toml --local
```

Open **http://localhost:5173**

---

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run check` | Run both lint and typecheck |
| `npm run preview` | Preview production build |

---

## 🔧 Production Deployment

### 1. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 2. Create Metadata Database

```bash
npx wrangler d1 create container-manager-metadata
npx wrangler d1 execute container-manager-metadata --remote --file=worker/schema.sql
```

### 3. Configure Wrangler

```bash
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` with your `database_id` from step 2.

### 4. Set Up R2 Snapshot Bucket (Optional)

```bash
npx wrangler r2 bucket create container-manager-snapshots
```

### 5. Set Secrets

```bash
npx wrangler secret put ACCOUNT_ID
npx wrangler secret put API_KEY
npx wrangler secret put TEAM_DOMAIN
npx wrangler secret put POLICY_AUD
```

### 6. Deploy

```bash
npm run build
npx wrangler deploy
```

---

## 🛠️ Project Structure

```
container-manager/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── contexts/           # React contexts (Theme)
│   ├── lib/                # Utilities (utils, cache)
│   ├── services/           # API clients
│   ├── types/              # TypeScript types
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind CSS
├── worker/                 # Backend source
│   ├── routes/             # API route handlers
│   ├── types/              # Worker types
│   ├── utils/              # Worker utilities
│   ├── durable-objects/    # Durable Object classes
│   ├── index.ts            # Worker entry point
│   └── schema.sql          # D1 database schema
├── wrangler.toml.example   # Production config template
├── wrangler.dev.toml       # Local development config
└── package.json
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 📞 Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/neverinfamous/container-manager/issues)
- 💡 **Feature Requests:** [GitHub Discussions](https://github.com/neverinfamous/container-manager/discussions)
- 📧 **Email:** admin@adamic.tech

---

**Made with ❤️ for the Cloudflare community**

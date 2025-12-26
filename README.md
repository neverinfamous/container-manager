# Cloudflare Container Manager

**Last Updated:** December 26, 2025 | **Version:** 0.1.0

A management platform for Cloudflare Containers with a full-featured UI for lifecycle management, configuration, logs, metrics, scheduling, and snapshots.

[![GitHub](https://img.shields.io/badge/GitHub-neverinfamous/container--manager-blue?logo=github)](https://github.com/neverinfamous/container-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/version-v0.1.0-green)
![Status](https://img.shields.io/badge/status-Beta-orange)

**[Live Demo](https://container.adamic.tech)** • **[Wiki](https://github.com/neverinfamous/container-manager/wiki)** • **[Changelog](https://github.com/neverinfamous/container-manager/wiki/Changelog)**

---

## ⚠️ Current Limitations

> [!IMPORTANT]
> **Cloudflare Containers is in Open Beta** and does not yet have a public management API. This project implements workarounds to provide a management UI despite these limitations.

### No Container Management API

As of December 2025, Cloudflare has not released a public API for:
- Listing deployed containers
- Starting/stopping/restarting containers
- Viewing CPU/memory metrics from container runtime

**Workarounds Implemented:**
- **D1 Shadow Registry** - Containers are registered in D1 database; UI reads from registry
- **Instance Ping** - Containers are pinged via Durable Object fetch to detect running instances
- **Request Tracking** - All container requests are logged to D1 for real-time metrics

### What Works vs What's Simulated

| Feature | Status | Notes |
|---------|--------|-------|
| Container registry | ✅ Real | Stored in D1 |
| Running instances | ✅ Real | Detected via container ping |
| Requests/minute | ✅ Real | Logged to D1 `request_logs` table |
| Errors/minute | ✅ Real | Tracked from status codes |
| Request timeline | ✅ Real | Generated from D1 logs |
| CPU/Memory usage | ❌ Simulated | Shows 0% - requires Cloudflare runtime API |
| Log streaming | ❌ Simulated | Requires Cloudflare runtime API |

### Windows Wrangler Docker Build Hang

When deploying containers with `wrangler deploy` on Windows, the Docker build step hangs indefinitely due to a [known bug with Docker stdin on Windows](https://github.com/docker/cli/issues/4179).

**Workaround:** Deploy from **WSL2** instead of PowerShell:
```bash
# From WSL2 terminal
cd /mnt/c/Users/yourname/Desktop/container-manager
npm install  # Reinstall for Linux if node_modules are from Windows
wrangler deploy
```

### Container Registration

You can register containers via the UI or API. CLI registration example:

```bash
wrangler d1 execute container-manager-metadata --remote --command="INSERT INTO containers (name, class_name, worker_name, image, instance_type, max_instances, default_port, status) VALUES ('your-container', 'YourClass', 'your-worker', 'path/to/Dockerfile', 'basic', 3, 8080, 'running');"
```

---

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 • Vite 7 • TypeScript 5.9 |
| Styling | Tailwind CSS 4 • shadcn/ui |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (Shadow Registry) |
| Storage | Cloudflare R2 (Snapshots) |
| Auth | Cloudflare Zero Trust |

---

## ✨ Features

### Container Lifecycle (UI Ready)
- 📋 View all registered containers from D1 shadow registry
- ➕ **Register containers via UI** (no wrangler commands needed!)
- ✏️ **Edit container registrations** inline
- 🗑️ Delete containers with confirmation
- ▶️ Start, stop, restart container controls
- 🏷️ Color tags for visual organization
- 📊 Status indicators (running, stopped, etc.)

### Configuration Management
- 🔧 Environment variable editor
- 🔐 Secrets viewer (masked values)
- ⚙️ Instance type selector
- 🔄 Config diff viewer
- 📝 JSON schema validation

### Logs & Debug Console
- 📜 Real-time log streaming (when API available)
- 🔍 Log filtering and search
- 🧪 HTTP test client for container endpoints
- 💾 Saved request templates

### Dependency Topology
- 🕸️ Interactive container dependency graph (React Flow)
- 🔗 Container ↔ D1/KV/R2/DO binding visualization
- ⚡ Orphan detection (containers without bindings)

### Snapshots & Rollback
- 📸 Create configuration snapshots
- ⏪ One-click restore from snapshots
- 🗄️ R2-backed snapshot storage
- 🔄 Auto-snapshot before destructive operations

### Scheduling & Automation
- ⏰ Scheduled restart/rebuild/scale actions
- 🕐 Cron expression builder with presets
- 📊 Execution history tracking
- ✅ Enable/disable per schedule

### Metrics Dashboard
- 📈 **Real request tracking** - requests/minute, errors/minute from D1
- 🔢 **Running instance count** - detected via container ping
- 📅 Time range selector (1h/6h/24h/7d/30d)
- 📊 Request timeline chart
- ⚠️ CPU/Memory shows 0% until Cloudflare provides runtime API

### Webhooks & Jobs
- 🔔 Event-driven notifications
- 📋 Job history with filtering
- 🔐 HMAC signing support

### Config Generator
- 📤 **Export wrangler.toml** configuration snippets
- 📄 **Generate TypeScript class** code for containers
- 🐳 **Dockerfile templates** for quick deployment
- 📋 One-click copy to clipboard

### Template Gallery
- 📦 **Pre-built Dockerfiles** for common runtimes
- 🟢 Node.js, 🐍 Python, 🔵 Go, 🍞 Bun, 🦕 Deno, 📁 nginx
- 👀 **Preview Dockerfiles** before deploying
- ⚡ **One-click setup** pre-fills container registration

### Deployment Guide
- 🚀 **Step-by-step checklist** for WSL2 and Cloudflare setup
- 📋 **Copy-to-clipboard** for all commands
- 💾 **Progress saved** to localStorage
- 🔗 **Documentation links** for each step

### Health Probes
- ❤️ **HTTP health checks** to any configured endpoint
- ⚙️ **Configurable** in Container Configuration → Health tab
  - Custom health URL (paths like `/health` or full URLs)
  - Expected status code (default: 200)
  - Timeout and check intervals
- ⏱️ **Real-time latency** measurement
- 🔄 **Check Now** button for on-demand probes
- 💾 **Settings persist** to D1 database
- 🔗 **Built-in endpoint** at `/health` and `/api/health`

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for container builds)
- [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) (required for Windows users)

### Installation

```bash
git clone https://github.com/neverinfamous/container-manager.git
cd container-manager
npm install
```

### Local Development

**Terminal 1 - Frontend (Vite):**
```bash
npm run dev
```

**Terminal 2 - Worker API (Wrangler):**
```bash
npx wrangler dev --config wrangler.dev.toml --local
```

Open **http://localhost:5173**

---

## 🔧 Production Deployment

### 1. Authenticate with Cloudflare
```bash
npx wrangler login
```

### 2. Create D1 Database
```bash
npx wrangler d1 create container-manager-metadata
npx wrangler d1 execute container-manager-metadata --remote --file=worker/schema.sql
```

### 3. Create R2 Bucket (for snapshots)
```bash
npx wrangler r2 bucket create container-manager-snapshots
```

### 4. Configure wrangler.toml
```bash
cp wrangler.toml.example wrangler.toml
```
Edit `wrangler.toml` with your `database_id` from step 2.

### 5. Set Secrets
```bash
npx wrangler secret put ACCOUNT_ID
npx wrangler secret put API_KEY
npx wrangler secret put TEAM_DOMAIN
npx wrangler secret put POLICY_AUD
```

### 6. Deploy (from WSL2 on Windows!)
```bash
# On Windows, run from WSL2
cd /mnt/c/Users/yourname/path/to/container-manager
npm install  # Reinstall for Linux
wrangler deploy
```

---

## 🐳 Adding a Container

### 1. Create Container Class

In your worker, create a class extending `Container`:

```typescript
import { Container } from '@cloudflare/containers'

export class HelloWorld extends Container {
    override defaultPort = 8080
    override sleepAfter = '5m'
}
```

### 2. Create Dockerfile

```dockerfile
# containers/hello-world/Dockerfile
FROM node:20-alpine
WORKDIR /app
RUN echo 'require("http").createServer((req,res) => { res.end("Hello!") }).listen(8080)' > server.js
EXPOSE 8080
CMD ["node", "server.js"]
```

### 3. Configure wrangler.toml

```toml
[[containers]]
class_name = "HelloWorld"
image = "./containers/hello-world/Dockerfile"
max_instances = 3

[[durable_objects.bindings]]
name = "HELLO_WORLD"
class_name = "HelloWorld"

[[migrations]]
tag = "v2_hello_world"
new_sqlite_classes = ["HelloWorld"]
```

### 4. Deploy & Register

```bash
# Deploy (from WSL2 on Windows)
wrangler deploy

# Register in shadow registry
wrangler d1 execute container-manager-metadata --remote --command="INSERT INTO containers (name, class_name, worker_name, image, instance_type, max_instances, default_port, status) VALUES ('hello-world', 'HelloWorld', 'container-manager', 'containers/hello-world/Dockerfile', 'basic', 3, 8080, 'running');"
```

---

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run check` | Run lint + typecheck |
| `npm run preview` | Preview production build |

---

## 🛠️ Project Structure

```
container-manager/
├── src/                    # Frontend (React 19)
│   ├── components/         # UI components
│   ├── contexts/           # React contexts
│   ├── lib/                # Utilities
│   ├── services/           # API clients
│   └── types/              # TypeScript types
├── worker/                 # Backend (Workers)
│   ├── routes/             # API handlers
│   ├── durable-objects/    # DO classes
│   ├── index.ts            # Entry point
│   └── schema.sql          # D1 schema
├── containers/             # Container Dockerfiles
│   └── hello-world/        # Test container
└── wrangler.toml           # Production config
```

---

## 🔮 Roadmap

When Cloudflare releases a Container Management API, this project will:

- [ ] Replace D1 shadow registry with live API queries
- [ ] Enable real-time container status updates
- [ ] Show actual metrics from container runtime
- [ ] Support direct start/stop/restart operations
- [ ] Enable log streaming from running containers

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

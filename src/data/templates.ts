/**
 * Container Templates - Pre-built Dockerfile templates for common use cases
 */

export interface ContainerTemplate {
    id: string
    name: string
    description: string
    icon: string // Emoji or icon name
    baseImage: string
    defaultPort: number
    instanceType: string
    sleepAfter: string
    dockerfile: string
    category: 'runtime' | 'framework' | 'static'
}

export const CONTAINER_TEMPLATES: ContainerTemplate[] = [
    {
        id: 'nodejs-20',
        name: 'Node.js 20',
        description: 'Express, Fastify, or any Node.js API',
        icon: '🟢',
        baseImage: 'node:20-alpine',
        defaultPort: 3000,
        instanceType: 'standard-1',
        sleepAfter: '5m',
        category: 'runtime',
        dockerfile: `FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]`,
    },
    {
        id: 'python-312',
        name: 'Python 3.12',
        description: 'FastAPI, Flask, or Django apps',
        icon: '🐍',
        baseImage: 'python:3.12-slim',
        defaultPort: 8000,
        instanceType: 'standard-1',
        sleepAfter: '5m',
        category: 'runtime',
        dockerfile: `FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,
    },
    {
        id: 'go-122',
        name: 'Go 1.22',
        description: 'High-performance Go APIs',
        icon: '🔵',
        baseImage: 'golang:1.22-alpine',
        defaultPort: 8080,
        instanceType: 'standard-1',
        sleepAfter: '5m',
        category: 'runtime',
        dockerfile: `FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]`,
    },
    {
        id: 'bun',
        name: 'Bun',
        description: 'Fast JavaScript runtime and bundler',
        icon: '🍞',
        baseImage: 'oven/bun:latest',
        defaultPort: 3000,
        instanceType: 'standard-1',
        sleepAfter: '5m',
        category: 'runtime',
        dockerfile: `FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

EXPOSE 3000
CMD ["bun", "run", "server.ts"]`,
    },
    {
        id: 'deno',
        name: 'Deno',
        description: 'Secure TypeScript runtime',
        icon: '🦕',
        baseImage: 'denoland/deno:latest',
        defaultPort: 8000,
        instanceType: 'standard-1',
        sleepAfter: '5m',
        category: 'runtime',
        dockerfile: `FROM denoland/deno:latest
WORKDIR /app

COPY deps.ts ./
RUN deno cache deps.ts

COPY . .

EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-read", "main.ts"]`,
    },
    {
        id: 'nginx-static',
        name: 'Static (nginx)',
        description: 'Serve static files with nginx',
        icon: '📁',
        baseImage: 'nginx:alpine',
        defaultPort: 80,
        instanceType: 'basic',
        sleepAfter: '10m',
        category: 'static',
        dockerfile: `FROM nginx:alpine
COPY ./dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
    },
]

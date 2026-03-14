# Agdi Dashboard

The web-based control panel for your Agdi AI Gateway. Monitor agents, manage channels, review security events, and orchestrate multi-agent workflows — all from a single interface.

## Quick Start

### Local Development (no Docker)

```bash
cd apps/dashboard
pnpm install
pnpm dev          # → http://localhost:3000
```

The dashboard connects to the gateway at `ws://127.0.0.1:18789/ws` by default. Make sure the gateway is running:

```bash
agdi gateway --bind loopback --port 18789 --allow-unconfigured
```

### Docker (Full Stack)

```bash
# 1. Create your env file
cp .env.dev.example .env.dev
# Edit .env.dev with your API keys

# 2. Start everything (gateway + dashboard + n8n)
bash start-dev.sh --build

# Services:
#   Dashboard  → http://localhost:3000
#   Gateway WS → ws://localhost:18789
#   n8n        → http://localhost:5678
```

### Production Docker

```bash
cp .env.dev.example .env.prod
# IMPORTANT: Set AGDI_GATEWAY_TOKEN to a strong secret
#   openssl rand -hex 32

docker compose -f docker-compose.prod.yml up -d --build
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AGDI_GATEWAY_TOKEN` | **Yes** (prod) | `local-dev-token` | Shared secret for dashboard login + gateway WebSocket auth |
| `DASHBOARD_SECRET` | No | Falls back to `AGDI_GATEWAY_TOKEN` | Separate JWT signing secret (overrides gateway token for JWTs) |
| `NEXT_PUBLIC_WS_URL` | No | `ws://127.0.0.1:18789/ws` | WebSocket URL for gateway connection (set automatically in Docker) |
| `OPENAI_API_KEY` | No | — | OpenAI API key for agents |
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key for agents |
| `GEMINI_API_KEY` | No | — | Google Gemini API key |
| `N8N_USER` | No | `admin` | n8n web UI username |
| `N8N_PASSWORD` | No | `agdi-local` | n8n web UI password |

> **⚠️ Production:** `AGDI_GATEWAY_TOKEN` must be set to a strong random string (32+ chars). The dashboard will reject all logins in production mode without it.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│  ┌───────────────────────────────────────┐  │
│  │          Next.js Dashboard            │  │
│  │  ┌─────────┐  ┌────────────────────┐  │  │
│  │  │ Auth    │  │ Dashboard Pages    │  │  │
│  │  │ (JWT)   │  │ Overview, Agents,  │  │  │
│  │  │ CSRF    │  │ Security, Canvas,  │  │  │
│  │  │ Session │  │ Workflows, etc.    │  │  │
│  │  └─────────┘  └────────────────────┘  │  │
│  │         │              │              │  │
│  │         ▼              ▼              │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │     agdi-client.ts (WS RPC)     │  │  │
│  │  └──────────────┬──────────────────┘  │  │
│  └─────────────────┼────────────────────┘  │
└────────────────────┼────────────────────────┘
                     │ WebSocket
                     ▼
          ┌──────────────────────┐
          │   Agdi Gateway       │
          │   (port 18789)       │
          │                      │
          │  agents.list         │
          │  channels.status     │
          │  skills.status       │
          │  memory.messages     │
          │  knowledge.list      │
          │  system.status       │
          └──────────────────────┘
```

### Key Modules

| Module | Path | Purpose |
|---|---|---|
| `agdi-client.ts` | `src/lib/agdi-client.ts` | WebSocket RPC client with heartbeat, reconnection, request queuing |
| `auth.ts` | `src/lib/auth.ts` | JWT session management, fingerprinting, password verification |
| `csrf.ts` | `src/lib/csrf.ts` | Double-submit cookie CSRF protection |
| `security-log.ts` | `src/lib/security-log.ts` | In-memory security event buffer (200 events max) |
| `middleware.ts` | `src/middleware.ts` | Auth enforcement, session refresh, input sanitization, rate limiting |

### Dashboard Pages

| Route | Page | Data Source |
|---|---|---|
| `/dashboard` | Command Center | `system.status`, `sessions.list` |
| `/dashboard/agents` | Agent Fleet | `agents.list`, `agents.create/stop` |
| `/dashboard/channels` | Channels | `channels.status` |
| `/dashboard/traces` | Execution Traces | `memory.messages.list` |
| `/dashboard/analytics` | Analytics | `system.status`, `sessions.list` |
| `/dashboard/knowledge` | Knowledge Base | `knowledge.list`, `knowledge.sync/remove` |
| `/dashboard/skills` | Skills | `skills.status` |
| `/dashboard/approvals` | Approvals | `exec.approvals.get/resolve` |
| `/dashboard/workflows` | Workflows | `agents.list` |
| `/dashboard/canvas` | Canvas | `agents.create` |
| `/dashboard/settings` | Settings | `config.get/set` |
| `/dashboard/security` | Security Log | `/api/security/events` (internal) |

---

## Security

The dashboard implements multiple security layers:

- **JWT Sessions** — HS256-signed, 12-hour expiry, sliding refresh at 2h remaining
- **Session Fingerprinting** — Client IP + UA hash embedded in JWT; mismatch = session invalidated
- **CSRF Protection** — Double-submit cookie pattern; `X-CSRF-Token` header required for mutations
- **Rate Limiting** — Progressive delays on failed logins, temporary lockouts after 10 failures
- **Input Sanitization** — Payload size limit (1MB), `__proto__`/`constructor` stripping
- **Security Headers** — CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **WebSocket Heartbeat** — Ping/pong every 30s, stale request cleanup

---

## Testing

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
```

Test suites:
- `src/lib/csrf.test.ts` — CSRF token generation and validation
- `src/lib/auth.test.ts` — JWT, fingerprinting, password checking
- `src/lib/security-log.test.ts` — Security event logging and buffer management

---

## Project Structure

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # Login/logout API routes
│   │   │   ├── health/       # Docker health check endpoint
│   │   │   └── security/     # Security events API
│   │   ├── dashboard/        # All dashboard pages
│   │   │   ├── loading.tsx   # Skeleton loading state
│   │   │   ├── layout.tsx    # Sidebar + error boundary + gateway banner
│   │   │   └── [page]/page.tsx
│   │   ├── login/            # Login page
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── ErrorBoundary.tsx  # Global error boundary
│   │   ├── GatewayStatusBanner.tsx  # Connection status banner
│   │   └── auth/             # Auth components
│   └── lib/
│       ├── agdi-client.ts    # WebSocket RPC client
│       ├── auth.ts           # JWT + session management
│       ├── csrf.ts           # CSRF protection
│       └── security-log.ts   # Security event buffer
├── Dockerfile                # Multi-stage production build
├── next.config.mjs           # Next.js config + security headers
├── vitest.config.ts          # Test configuration
└── package.json
```

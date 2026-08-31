# Sneaker Drop

A production-ready real-time inventory and reservation platform for limited-edition sneaker releases. It provides atomic PostgreSQL reservations, 60-second recovery, locked settlement, live Socket.IO updates, and a responsive React dashboard.

## Live links

- Application: _coming after deployment_
- API documentation: _coming after deployment_
- Socket service: _coming after deployment_

## Prerequisites

- Node.js 20.x (the supported production runtime)
- npm 10+

PostgreSQL is required for application state, the durable realtime outbox, and cross-instance Socket.IO broadcasts. Production runs the frontend, API, and WebSocket endpoint in one Vercel project without Redis.

## Install

```bash
git clone <your-repository-url>
cd sneaker-drop
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead.

## Start in development mode

Start the API, Socket.IO service, and Vite frontend together:

```bash
npm run dev
```

Or start one workspace at a time:

```bash
npm run dev:api
npm run dev:socket
npm run dev:web
```

Local endpoints:

- Frontend: http://localhost:5173
- API health: http://localhost:3000/api/v1/health
- Swagger UI: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/openapi.json
- Socket service health: http://localhost:3001/health

## Checks

```bash
npm test
npm run typecheck
```

Production deployment and final-unit concurrency instructions are documented in `docs/deployment.md`. Vercel WebSocket Function instances coordinate through Neon PostgreSQL; Redis is intentionally not used.

Database migrations will be the only supported schema-management mechanism. Runtime `sequelize.sync()` is intentionally not part of the project.

## Workspace layout

```text
apps/api       Express API and Vercel handler
apps/socket    Socket.IO service and PostgreSQL broadcast adapter
apps/web       React and Vite frontend
packages/contracts  Shared HTTP and real-time contracts
api            Vercel serverless entry point
```

## Architecture boundary

The stateless API commits inventory changes and durable outbox events in PostgreSQL. A Vercel WebSocket Function relays committed events, and the Socket.IO PostgreSQL adapter distributes broadcasts across active function instances. PostgreSQL server time remains authoritative for drop starts and hold expiration.

# Sneaker Drop

A real-time inventory and reservation platform for limited-edition sneaker releases. The project is currently at Phase 1: workspace, service contracts, health checks, Swagger, and the frontend foundation.

## Live links

- Application: _coming after deployment_
- API documentation: _coming after deployment_
- Socket service: _coming after deployment_

## Prerequisites

- Node.js 20.x (the supported production runtime)
- npm 10+

PostgreSQL is required for application state and the durable realtime outbox. The realtime service intentionally runs as one persistent instance without Redis.

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

Database migrations will be the only supported schema-management mechanism. Runtime `sequelize.sync()` is intentionally not part of the project.

## Workspace layout

```text
apps/api       Express API and Vercel handler
apps/socket    Persistent Socket.IO service
apps/web       React and Vite frontend
packages/contracts  Shared HTTP and real-time contracts
api            Vercel serverless entry point
```

## Architecture boundary

The stateless API will commit inventory changes and durable outbox events in PostgreSQL. The persistent socket service will relay committed events to clients. This keeps real-time delivery separate from short-lived Vercel request processes. PostgreSQL server time will be authoritative for drop starts and hold expiration.

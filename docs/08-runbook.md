# Runbook

## 1. Local dev
### Prerequisites
- Node (LTS)
- pnpm
- Docker

### Steps
1) `cp .env.example .env`
2) `docker compose -f infra/docker/docker-compose.yml up -d`
3) `pnpm db:generate`
4) `pnpm db:migrate`
5) `pnpm dev`

### Manual checks
- Health check:
  - `curl http://127.0.0.1:3000/api/health`
- Create room:
  - `curl -X POST http://127.0.0.1:3000/api/host/rooms -H "content-type: application/json" -d '{"title":"demo"}'`

## 2. Environments
- Development: local Postgres
- Production: managed Postgres (Neon/Supabase/Vercel Postgres)
- Required env:
  - DATABASE_URL
  - HOST_TOKEN_PEPPER
  - SSE_HEARTBEAT_MS (optional)
  - OPENAI_API_KEY (optional)

## 3. Deploy (Vercel)
- apps/web deployed as frontend
- apps/api deployed as serverless/edge (Node runtime recommended)
- Ensure env vars are set for both projects

## 4. Troubleshooting
### Symptoms: guests not updating
- Check SSE connection (network tab)
- Verify heartbeat events
- Verify server is pushing snapshot first

### Symptoms: answers rejected unexpectedly
- Verify questionStatus is accepting
- Check unique constraint conflicts (ALREADY_ANSWERED)
- Check participantId cookie is stable

### Symptoms: host cannot operate
- Authorization header exists
- token hash calculation consistent with HOST_TOKEN_PEPPER

## 5. Operational checks (event day)
- Create room, publish, join from 2 devices
- Start live, open accepting, submit, close, show results
- Next question works
- End works

# Runbook

## 1. Local dev
### Prerequisites
- Node (LTS)
- pnpm
- Docker

### Steps
1) `cp .env.example .env`
2) `docker compose up -d`
3) run migrations (tooling depends on chosen ORM/migration tool)
4) `pnpm dev`

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

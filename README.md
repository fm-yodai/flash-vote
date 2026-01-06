# Flash Vote

## Local Dev
1. `cp .env.example .env`
2. `docker compose -f infra/docker/docker-compose.yml up -d`
3. `pnpm i`
4. `pnpm db:generate`
5. `pnpm db:migrate`
6. `pnpm dev`

## Manual API checks
```bash
curl http://127.0.0.1:3000/api/health
```

```bash
curl -X POST http://127.0.0.1:3000/api/host/rooms \
  -H "content-type: application/json" \
  -d '{"title":"demo"}'
```

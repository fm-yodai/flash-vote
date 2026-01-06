# Repository Guidelines

## Project Structure & Module Organization
- `apps/api/`: Hono-based Node API service (TypeScript). Entry points live in `apps/api/src/`.
- `apps/web/`: Vue 3 + Vite frontend. Source code in `apps/web/src/`, static assets in `apps/web/public/`.
- `packages/shared/`: Shared TypeScript utilities/schemas (e.g., Zod types).
- `infra/docker/docker-compose.yml`: Local infrastructure for development services.

## Build, Test, and Development Commands
- `pnpm i`: Install workspace dependencies.
- `pnpm dev`: Run all workspace dev servers (delegates to each package’s `dev` script).
- `pnpm build`: Build/typecheck all packages in the workspace.
- `pnpm lint`: Run lint scripts across packages (if configured).
- `pnpm typecheck`: Run TypeScript checks across packages.
- `docker compose -f infra/docker/docker-compose.yml up -d`: Start local infra dependencies.

## Coding Style & Naming Conventions
- Language: TypeScript in all packages; Vue SFCs in `apps/web`.
- Formatting: No formatter config found. Match existing style and keep diffs minimal.
- Naming: Use descriptive, domain-focused names; align file names with exported symbols (e.g., `user-schema.ts` for Zod schemas).

## Testing Guidelines
- No test framework or test directories are present yet.
- If you add tests, document the runner and keep tests co-located or in a `tests/` folder per package.
- Provide a clear command (e.g., `pnpm -r test`) once tests exist.

## Commit & Pull Request Guidelines
- Git history is not initialized, so no commit conventions are established.
- Use clear, imperative messages (e.g., `Add vote tally endpoint`).
- PRs should include: summary, testing notes (commands + results), and any required screenshots for UI changes.

## Configuration & Local Setup
- Copy environment defaults: `cp .env.example .env`.
- Ensure Docker is running before starting infra for local dev.

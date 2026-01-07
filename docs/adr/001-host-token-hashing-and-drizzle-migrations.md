# ADR-001: Host token hashing and Drizzle migration workflow

## Status
- Accepted

## Context
Room creation must return a host token once, while storage requires a non-reversible representation.
Database schema changes must be reviewed and applied consistently across environments.

## Decision
- Host tokens are generated server-side and only the SHA-256 hash of `hostToken + HOST_TOKEN_PEPPER` is stored in `rooms.host_token_hash`.
- Database changes follow `drizzle-kit generate` to produce SQL, then `drizzle-kit migrate` to apply migrations.

## Consequences
- Pros: host tokens are never persisted in plaintext; migration SQL is reviewable and auditable.
- Cons: HOST_TOKEN_PEPPER must be present in every environment; migrations add an extra step before deploy.
- Follow-ups: document rotation strategy for pepper if needed.

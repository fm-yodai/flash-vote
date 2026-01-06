# Security

## 1. Host token
- Room creation returns hostToken in plaintext only once.
- DB stores: hash(hostToken + HOST_TOKEN_PEPPER)
- Host APIs require Authorization: Bearer hostToken

Pepper:
- `HOST_TOKEN_PEPPER` is required env var

## 2. Guest identity & privacy
- participantId is random UUID (no PII)
- store in cookie `fv_pid` (httpOnly recommended) + fallback localStorage
- do not collect email/phone

## 3. Rate limiting (anti-spam)
- Apply per-IP & per-room (e.g., 60 req/min baseline)
- Apply stricter limits on:
  - join
  - submit response
  - AI endpoints

## 4. Data validation
- All inputs validated with zod (packages/shared)
- Enforce max lengths:
  - title <= 100
  - prompt <= 200
  - option label <= 60
  - text answer <= 500 (MVP)

## 5. PII masking (text answers)
- Before AI clustering, perform lightweight masking:
  - emails
  - phone numbers
  - URLs (optional)
- Save raw text as-is in DB is acceptable for MVP, but ensure:
  - text is never shown publicly without context
  - prevent XSS via escaping in UI

## 6. CORS / CSRF
- Public GET allowed
- POST endpoints rely on same-origin; if cross-origin, consider CSRF tokens
- Authorization header for host reduces CSRF risk

## 7. Audit log
- Log host operations: publish/unpublish/start/close/show/next/end
- Include requestId and minimal meta
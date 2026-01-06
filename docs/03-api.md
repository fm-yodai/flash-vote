# API Spec (REST + SSE)

Base: `/api`
All responses are JSON unless SSE.

## 0. Auth
### Host auth
- Host token is issued at room creation (plain token returned once).
- DB stores only hash(token + pepper).
- Host API requires: `Authorization: Bearer <hostToken>`

### Guest identity
- participantId is stored in cookie `fv_pid` (httpOnly推奨) or localStorage fallback.
- Join endpoint ensures participantId exists.

---

## 1. Health
GET `/health`
- 200 `{ "ok": true }`

---

## 2. Room (Host)
POST `/host/rooms`
Request:
```json
{ "title": "string (optional)", "purposeText": "string (optional)" }
```
Response 201:
```json
{
  "room": { "id": "uuid", "status": "draft" },
  "hostToken": "plain-secret-return-once",
  "hostManagementUrl": "https://.../host/<roomId>?token=...",
  "publicUrl": "https://.../r/<roomId>"
}
```

GET `/host/rooms/:roomId`
Auth required.
Response 200:
```json
{ "room": { ... }, "questions": [ ... ], "guestCount": { "active": 0, "total": 0 } }
```

PATCH `/host/rooms/:roomId`
Auth required.
Request:
```json
{ "title": "string?", "purposeText": "string?" }
```
Respense 204

POST `/host/rooms/:roomId/publish`
Auth required.
Response 200:
```json
{ "roomStatus": "published" }
```

POST `/host/rooms/:roomId/unpublish`
Auth required.
Response 200:
```json
{ "roomStatus": "draft" }
```

POST `/host/rooms/:roomId/start-live`
Auth required.
Response 200:
```json
{ "roomStatus": "live", "currentQuestionIndex": 0 }
```

POST `/host/rooms/:roomId/end-live`
Auth required.
Response 200:
```json
{ "roomStatus": "ended" }
```

---

## 3. Question (Host)
POST `/host/rooms/:roomId/questions`
Auth required.
Request:
```json
{
  "type": "single_choice | multi_choice | text",
  "prompt": "string",
  "options": ["string", "..."]  // only for choice types
}
```
Response 201:
```json
{ "question": { ... } }
```

PATCH `/host/questions/:questionId`
Auth required.
Request:
```json
{ "prompt": "string?", "options": ["string"]?, "order": 0? }
```
Response 204

DELETE `/host/questions/:questionId`
Auth required.
Response 200:
```json
{ "deleted": true }
```

---

## 4. Live controls (Host)
POST `/host/rooms/:roomId/current/open`
- set current question status to accepting

POST `/host/rooms/:roomId/current/close`
- set current question status to closed

POST `/host/rooms/:roomId/current/show-results`
- set current question status to showing_results

POST `/host/rooms/:roomId/next`
- increment currentQuestionIndex, set next question status to accepting

---

## 5. Room (Public / Guest)
GET `/rooms/:roomId/public`
Response 200:
```json
{
  "room": { "id": "...", "title": "...", "status": "published|live|ended" },
  "current": {
    "questionId": "uuid|null",
    "index": 0,
    "status": "accepting|closed|showing_results|null"
  }
}
```

POST `/rooms/:roomId/join`
- ensures participantId exists (set cookie if needed) and records presence
Response 200:
```json
{ "participantId": "uuid", "roomStatus": "published|live|ended" }
```

GET `/rooms/:roomId/questions/current`
Response 200:
```json
{
  "question": {
    "id": "uuid",
    "type": "single_choice|multi_choice|text",
    "prompt": "string",
    "options": [{ "id":"uuid", "label":"string" }] // if choice
  },
  "status": "accepting|closed|showing_results"
}
```

POST `/rooms/:roomId/questions/:questionId/answer`
Request(choice):
```json
{ "type": "choice", "optionIds": ["uuid"] }
```
Request(text):
```json
{ "type": "text", "text": "string" }
```
Response 200:
```json
{ "accepted": true }
```
Errors:
- 409 ALREADY_ANSWERED
- 403 NOT_ACCEPTING

GET `/rooms/:roomId/questions/:questionId/results`
Response 200 (choice):
```json
{
  "type": "choice",
  "total": 123,
  "options": [{ "optionId":"uuid", "label":"A", "count": 40, "ratio": 0.325 }]
}
```
Response 200 (text clustered):
```json
{
  "type": "text",
  "total": 50,
  "clusters": [{ "label":"...", "count": 12, "examples": ["...", "..."] }]
}
```

---

## 6. Realtime (SSE)
GET `/rooms/:roomId/events` (Content-Type: text/event-stream)
- Guests and hosts can connect (public stream).
- Sends snapshots first, then incremental events.
Events are defined in `docs/05-realtime-sse.md`.
# Realtime via SSE

## 1. Endpoint
GET `/api/rooms/:roomId/events`
- Content-Type: text/event-stream
- Cache-Control: no-cache
- Connection: keep-alive

## 2. 送信順序（固定）
1) `event: snapshot` を必ず最初に送る
2) 以降、状態変化や結果更新を event で送る
3) heartbeatを一定間隔（例: 15s）で送る（接続維持）

## 3. Event types
### snapshot
data:
```json
{
  "room": { "id":"...", "status":"published|live|ended", "title":"..." },
  "current": { "index":0, "questionId":"...", "status":"accepting|closed|showing_results" },
  "question": { "id":"...", "type":"...", "prompt":"...", "options":[...] },
  "results": null | { ... }, 
  "guestCount": { "active": 0, "total": 0 }
}
```
### room_updated
- publish/unpublish/title change など
### current_question_changed
- next などで current question が変わった
### question_status_changed
- accepting/closed/showing_results への変更
### results_updated
- 結果が更新された（showing_results 時）
data:
```json
{ "questionId":"...", "results": { ... } }
```
### guest_count_updated
- 参加者数が変わった
data:
```json
{ "active": 12, "total": 57 }
```
### heartbeat
- 接続維持のための空イベント
data:
```json
{ "ts": "2026-01-01T00:00:00Z" }
```

## 4. 再接続
- クライアントは接続が切れたら自動的に再接続する
- 再接続後も snapshot を最初に受け取るため、Last-Event-IDは不要

## 5. 更新タイミング（指針）
- Host操作時: 必ず該当イベントをpush
- 回答受付中: results_updatedを高頻度でpushしない（負荷軽減）
  - showing_results 時にまとめて送る or 2～5秒に1回程度
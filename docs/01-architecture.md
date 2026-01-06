# Architecture

## 1. 技術スタック（固定）
- Hosting: Vercel
- API: Hono + TypeScript（Node runtime推奨）
- Web: Vue 3 + Vite + TypeScript
- Shared: zod schemas + shared types
- DB: Postgres（Neon / Supabase / Vercel Postgres 等）
- Realtime: SSE（Server-Sent Events）
- AI: OpenAI等（任意。設定なしでもアプリが成立する）

## 2. リポジトリ構成（推奨）
- apps/web: Vue UI（ホスト/ゲスト）
- apps/api: Hono API（REST + SSE）
- packages/shared: zod schemas, types, constants

## 3. 実行形態
### 3.1 ゲスト
- Public URLで参加
- participantIdをcookie/localStorageに保存
- SSEで状態（現在の質問、受付状態、結果）を購読

### 3.2 ホスト
- 管理URL（roomId + token）で操作
- tokenは初回アクセスで取得し、以降はAuthorizationヘッダで送る

## 4. データフロー
1) Host creates room -> returns hostManagementUrl + publicUrl
2) Host publishes room -> guests can join via publicUrl (QR)
3) Guest joins -> gets participantId cookie -> SSE connect
4) Host starts accepting answers -> guests submit answers
5) Host closes -> results snapshot computed -> SSE push
6) Host moves next / ends

## 5. Realtime方式（SSE採用理由）
- 実装が比較的シンプル（WebSocketより運用しやすい）
- Vercel環境での選択肢として現実的
- 書き込みはHTTP、配信はSSEに分離

## 6. エラーレスポンス標準
APIは常に以下のJSON形式で返す：
```json
{
  "error": {
    "code": "STRING_ENUM",
    "message": "human readable",
    "details": {}
  }
}
```

## 7. Observability
- requestIdをログに付与
- ホスト操作（state change）を監査ログとして保存
# ADR-002: Host token storage in web client

## Status
- Accepted

## Context
ホストは管理URLに含まれるトークンで認証される。毎回URLにトークンを残すと共有や再読み込み時に漏えいのリスクがあり、画面のリロード時にも認証情報を引き回す必要がある。

## Decision
ホスト画面 `/host/:roomId?token=...` に初回アクセスした際にトークンを `localStorage` に保存し、以降は `Authorization: Bearer <token>` を付与してAPIを呼び出す。URLからは token パラメータを除去して履歴に残さない。

## Consequences
- Pros
  - トークンの再入力が不要で、URL共有時の露出を抑制できる
  - API認証方式を統一できる
- Cons
  - 同一ブラウザにトークンが残るため、共有端末ではクリアが必要
- Follow-ups
  - 明示的なトークン削除UIの検討

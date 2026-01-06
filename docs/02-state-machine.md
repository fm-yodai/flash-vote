# State Machine

## 1. Room status
- draft: 作成直後。ホストのみ閲覧/編集。
- published: 公開中（ゲスト参加可）。ライブは未開始。
- live: ライブ進行中（質問の受付状態を制御）。
- ended: 終了（回答不可、結果のみ閲覧可）。

Allowed transitions:
- draft -> published (publish)
- published -> draft (unpublish) ※ゲスト流入停止。既存参加者は閲覧不可にする方針（固定）
- published -> live (start_live)
- live -> ended (end_live)

## 2. Question status (room内の進行)
- not_open: 未表示（将来の質問）
- accepting: 受付中
- closed: 受付終了（結果はまだ表示しない場合もある）
- showing_results: 結果表示中

Room has currentQuestionIndex (0-based). Only one "current" question is actively controlled.
固定ルール：
- live中は currentQuestionIndex の questionStatus のみ操作対象
- "次へ" で currentQuestionIndex++ に進み、次の質問を not_open -> accepting にする（またはホストが開始する）

## 3. Host operations and guards
### publish
- guard: roomStatus == draft
- effect: roomStatus = published, publishedAt = now

### unpublish
- guard: roomStatus == published
- effect: roomStatus = draft

### start_live
- guard: roomStatus == published AND questions.length > 0
- effect: roomStatus = live, currentQuestionIndex = 0, question[0].status = accepting

### open_accepting
- guard: roomStatus == live AND current question exists
- effect: current question status = accepting

### close_accepting
- guard: roomStatus == live AND current status == accepting
- effect: current status = closed

### show_results
- guard: roomStatus == live AND current status in (closed, accepting)
- effect: current status = showing_results

### next
- guard: roomStatus == live AND currentQuestionIndex < lastIndex
- effect: currentQuestionIndex++, next question status = accepting (固定)

### end_live
- guard: roomStatus in (live, published)
- effect: roomStatus = ended, endedAt = now, all questions status = closed/showing_results (実装裁量)

## 4. Guest behavior
- roomStatus != published/live/ended の場合、参加不可（404 or "not available"）
- questionStatus == accepting の時のみ回答送信可能
- showing_results の時は結果閲覧のみ
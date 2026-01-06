# AI Spec

## 0. 前提
- AIが失敗してもアプリは成立する（AIは上乗せ）
- AI生成は proposalVersion で管理し、承認/棄却の対象がぶれない
- 自由記述クラスタは誤りうるため、ホストが調整できる導線を用意する

---

## 1. 質問案生成（purpose -> proposal）
### Input
- room.purposeText: string
- optional context: room title, expected audience, timebox

### Output JSON schema（固定）
```json
{
  "version": 1,
  "questions": [
    {
      "tempId": "q1",
      "type": "single_choice | multi_choice | text",
      "prompt": "string",
      "options": ["string", "string"],  // choiceのみ
      "rationale": "string (why this question helps purpose)",
      "tags": ["string"]
    }
  ]
}
```

### Host decision model
- host can accept/reject per question (by tempId)
- accepted questions are converted into real questions in DB
- rejected questions are ignored
- after accept, host may edit/delete freely

### Proposal versioning
- Each generation increments version.
- Once a version is accepted, later versions must not overwrite existing accepted questions.
  - Later proposals are treated as "additional suggestions".

## 2. 自由記述クラスタリング（text answers -> clusters）
### Input
- questionId
- text answers array (after basic masking)
- desired number of clusters (optional)
- language: ja

### Output JSON schema（固定）
```json
{
  "questionId": "uuid",
  "total": 50,
  "clusters": [
    { "label": "string", "count": 12, "examples": ["...", "..."] }
  ],
  "noise": ["unclustered example", "..."]
}
```

### Host adjustment (minimum)
- rename cluster label
- merge/split clusters
- delete a cluster (fold into noise)
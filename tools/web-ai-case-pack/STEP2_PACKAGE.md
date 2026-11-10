# 第二步提示词：成品 JSON

把下面整段复制给网页 AI，把 `{{案件设计稿}}` 替换成第一步的输出。

```
你是「谜案重启」的成品打包工程师。请根据下面的案件设计稿，输出一个严格 JSON，包含 script、coach、closing 三部分。只输出 JSON，不要输出解释；JSON 后面另起一段输出自检清单。

【硬规则】
1. 玩家只能靠游戏内线索推出真相，不能要求读过原著。
2. 每句台词不超过 40 字；台词里的 s 必须存在于 speakers。
3. 灰羽（guide）冷静、话少、偶尔毒舌，绝不直接说出答案。
4. 副标题、summary、初始线索都不能剧透。
5. 所有拼图空始终可填；正确的拼图线索一开始隐藏，玩家和灰羽对话成立推理后才出现。
6. 如果玩家的推理逻辑上成立、但不在预设 deduction 里，灰羽也要正面回应，不能说“没有效果”；只有真正错误或证据不足才质疑。

【输出结构】
{
  "script": { ... },
  "coach": { ... },
  "closing": { ... }
}

━━ 一、script ━━
{
  "id": "英文短名_01",
  "title": "作品名",
  "subtitle": "四字副标题 | 第X案",
  "source": "改编自 作者《作品名》",
  "difficulty": "入门",
  "cover": "两位数字",
  "immersive": true,
  "summary": "案件概要 100–200 字，不剧透",
  "victim": "被害人（无死者写案件性质）",
  "speakers": {
    "narr": { "name": "", "voice": null },
    "guide": { "name": "灰羽", "voice": "guide" },
    "人物编号": { "name": "人物名", "voice": "high 或 mid 或 low" }
  },
  "characters": [
    { "id": "c1", "name": "", "title": "", "motive": "", "alibi": "", "aliases": [] }
  ],
  "clues": [
    { "id": "k1", "name": "6字以内", "text": "一句话" }
  ],
  "scenes": {
    "intro": [ { "s": "narr", "t": "" }, { "s": "guide", "t": "", "pose": "thinking" } ],
    "deduce": [ ... ],
    "truth": [ ... ]
  },
  "actions": [
    { "id": "a1", "type": "talk 或 search", "label": "按钮文字", "clueIds": ["k1"], "lines": [ ... ] }
  ],
  "questions": [
    {
      "id": "q1", "prompt": "", "kind": "character 或 clue",
      "choice": { "options": ["c1","c2","c3"], "answer": "c3" },
      "fill": { "sentence": "可选，带 {{0}}", "answers": [{ "text": "答案", "aliases": [] }] },
      "basedOn": ["k1"]
    }
  ],
  "solution": "真相一句话，80 字以内"
}
要求：嫌疑人 3–5 名且恰好 1 名真凶；线索 8–12 条；行动 7–10 个；题目 4–6 道；每条线索至少出现在一个行动的 clueIds 里。

━━ 二、coach ━━
{
  "facts": ["玩家会获知的既定事实1", "玩家会获知的既定事实2"],
  "clues": [
    { "id": "k1", "surface": "玩家看到的线索信息", "meaning": "这条线索实际意味着什么" }
  ],
  "deductions": [
    { "id": "D1", "text": "可推出的中间结论", "basis": ["k1", "k6"] }
  ],
  "redHerrings": ["误导线索为什么是误导"],
  "finalTruth": "一句话完整真相"
}
要求：
- facts 必须写全玩家会获知的所有既定事实（背景、人物关系、人物说过的话、看似矛盾但最终被解释的细节），防止 AI 编造或否认。
- clues 与 script.clues 一一对应。
- deductions 3–6 条，最终结论固定 C1；basis 只能引用 clues 的 id 或 facts 里的短语。

━━ 三、closing ━━
{
  "intro": "一句操作提示",
  "segments": [ { "text": "真相是：" }, { "slot": 0 }, { "text": "。" } ],
  "slots": [ { "id": 0, "answer": "正确答案" }, { "id": 1, "answer": "正确答案2" } ],
  "clues": [
    { "id": "m1", "text": "开局迷惑线索", "initial": true },
    { "id": "c1", "text": "正确答案", "requires": "D1" },
    { "id": "c2", "text": "干扰线索", "requires": "D1" }
  ]
}
要求：
- 空 2–4 个，所有空始终可以填；答案 2–6 字。
- segments 用 { "slot": 0 } 标记挖空位置。
- clues 是拼图线索池：initial 是开局就给的迷惑线索（不能是任何空的正确答案）；requires 是推理成立后才出现的线索。
- 每个 requires 组 2–3 条，至少 1 条是该 deduction 对应的正确线索，其余是迷惑线索。
- 每个空的正确答案必须出现在 clues 里，并挂在某条 deduction 的 requires 下。
- 未知线索在界面上显示为 ???，总量固定。

━━ 自检清单（JSON 之后另起一段）━━
- 每个推理节点是否都能由玩家拿到的线索推出？
- 每个正确线索是否都挂在对应 deduction 的 requires 下？
- 初始线索是否全是迷惑项？
- 副标题 / summary / 初始线索是否剧透？
- JSON 是否完整、可解析、没有多余文字？

---
案件设计稿：
{{案件设计稿}}
```

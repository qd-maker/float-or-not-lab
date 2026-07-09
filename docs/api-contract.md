# API Contract

本项目先写 API Contract，再写后端代码。

## Base URL

本地开发：

```text
http://localhost:8000
```

## 1. 健康检查

```http
GET /health
```

### Response 200

```json
{
  "status": "ok",
  "service": "float-or-not-lab-api"
}
```

## 2. 计算物体浮沉状态

```http
POST /api/buoyancy/calculate
```

### Request Body

```json
{
  "object_weight_n": 8,
  "displaced_water_weight_n": 10
}
```

### 字段说明

| 字段 | 类型 | 必填 | 规则 | 含义 |
| --- | --- | --- | --- | --- |
| object_weight_n | number | 是 | `>= 0` 且 `<= 10000` | 物体重量，单位 N |
| displaced_water_weight_n | number | 是 | `>= 0` 且 `<= 10000` | 物体完全浸没时排开水的重量，单位 N |

### 判断规则

| 条件 | state | state_text | 说明 |
| --- | --- | --- | --- |
| 完全浸没时排开水重量 > 物体重量 | float | 上浮 | 浮力更大，能托住物体 |
| 完全浸没时排开水重量 ≈ 物体重量 | suspend | 悬浮 | 浮力和重力差不多平衡 |
| 完全浸没时排开水重量 < 物体重量 | sink | 下沉 | 浮力不够，托不住物体 |

说明：实际输入小数时可能存在误差，因此后端会使用一个很小的容差判断「差不多相等」。

### Response 200：上浮

```json
{
  "state": "float",
  "state_text": "上浮",
  "object_weight_n": 8,
  "buoyancy_n": 10,
  "difference_n": 2,
  "explanation": "完全浸没时排开水的重量比物体重量大，浮力能托住物体，所以物体会上浮。",
  "student_tip": "看箭头：向上的浮力箭头更长，说明水给物体的托力更大。"
}
```

### Response 200：悬浮

```json
{
  "state": "suspend",
  "state_text": "悬浮",
  "object_weight_n": 8,
  "buoyancy_n": 8,
  "difference_n": 0,
  "explanation": "完全浸没时排开水的重量和物体重量差不多，浮力和重力平衡，所以物体会悬浮在水中。",
  "student_tip": "看箭头：向上和向下的箭头差不多长，说明两个力差不多平衡。"
}
```

### Response 200：下沉

```json
{
  "state": "sink",
  "state_text": "下沉",
  "object_weight_n": 10,
  "buoyancy_n": 6,
  "difference_n": -4,
  "explanation": "完全浸没时排开水的重量比物体重量小，浮力不够托住物体，所以物体会下沉。",
  "student_tip": "看箭头：向下的重力箭头更长，说明物体更容易往下运动。"
}
```

## 3. 公式计算接口，Day2 已实现

```http
POST /api/buoyancy/formula/calculate
```

该接口用于支持「公式实验室」，返回公式、代入步骤、结果和学生提示。

### 3.1 阿基米德原理模式

#### Request Body

```json
{
  "mode": "archimedes",
  "liquid_density_kg_m3": 1000,
  "displaced_volume_m3": 0.003,
  "g_n_kg": 10
}
```

说明：`g_n_kg` 只接受初中题常用的 `10` 或 `9.8`，避免学生随意输入非标准常数造成误导。

#### Response 200

```json
{
  "mode": "archimedes",
  "formula": "F浮 = ρ液 g V排",
  "result_n": 30,
  "steps": [
    "F浮 = ρ液 g V排",
    "F浮 = 1000 × 10 × 0.003",
    "F浮 = 30 N"
  ],
  "student_tip": "排开水的体积越大，液体给物体的浮力通常越大。"
}
```

### 3.2 称重法模式

#### Request Body

```json
{
  "mode": "weighing",
  "object_weight_n": 12,
  "spring_scale_reading_n": 7
}
```

#### Response 200

```json
{
  "mode": "weighing",
  "formula": "F浮 = G物 - F示",
  "result_n": 5,
  "steps": [
    "F浮 = G物 - F示",
    "F浮 = 12 - 7",
    "F浮 = 5 N"
  ],
  "student_tip": "物体放入水中后，测力计少显示的那部分力，就是水给它的浮力。"
}
```

### 3.3 漂浮平衡模式

#### Request Body

```json
{
  "mode": "floating_balance",
  "object_weight_n": 8
}
```

#### Response 200

```json
{
  "mode": "floating_balance",
  "formula": "漂浮时 F浮 = G物",
  "result_n": 8,
  "steps": [
    "物体漂浮时处于平衡状态",
    "F浮 = G物",
    "F浮 = 8 N"
  ],
  "student_tip": "漂浮不代表没有重力，而是浮力刚好托住了物体。"
}
```

## 4. 题目训练接口，Day3 已实现

### 4.1 获取题库

```http
GET /api/practice/questions
```

返回内置初中浮力题库。当前题库为代码内置，不依赖数据库，保证 demo 可以快速启动。

### Response 200

```json
{
  "questions": [
    {
      "id": "q-weighing-001",
      "type": "fill_blank",
      "topic": "称重法求浮力",
      "stem": "一个物体在空气中重 12 N，浸没在水中时弹簧测力计示数为 7 N，物体受到的浮力是多少？",
      "options": [],
      "answer": "5",
      "unit": "N",
      "analysis_steps": [
        "这道题使用称重法。",
        "F浮 = G物 - F示。",
        "F浮 = 12 - 7 = 5 N。"
      ],
      "mistake_tip": "不要把水中测力计示数 7 N 当成浮力，浮力是前后两次数值的差。"
    }
  ]
}
```

题目字段说明：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | string | 题目唯一标识 |
| type | string | `single_choice` 或 `fill_blank` |
| topic | string | 题型标签，例如判断浮沉、称重法求浮力 |
| stem | string | 题干 |
| options | array | 选择题选项，填空题为空数组 |
| answer | string | 标准答案原始值 |
| unit | string/null | 答案单位 |
| analysis_steps | string[] | 分步解析 |
| mistake_tip | string | 动态错因提示；未命中规则时回退题库内置提示 |

### 4.2 提交答案

```http
POST /api/practice/submit
```

提交学生答案，返回正误、标准答案、分步解析和错因提示。`mistake_tip` 会优先根据学生错误答案动态判断，未命中规则时回退题库内置提示。

### Request Body

```json
{
  "question_id": "q-weighing-001",
  "student_answer": "5"
}
```

### Response 200：答对

```json
{
  "question_id": "q-weighing-001",
  "correct": true,
  "correct_answer": "5 N",
  "student_answer": "5",
  "analysis_steps": [
    "这道题使用称重法。",
    "F浮 = G物 - F示。",
    "F浮 = 12 - 7 = 5 N。"
  ],
  "mistake_tip": ""
}
```

### Response 200：答错

```json
{
  "question_id": "q-weighing-001",
  "correct": false,
  "correct_answer": "5 N",
  "student_answer": "7",
  "analysis_steps": [
    "这道题使用称重法。",
    "F浮 = G物 - F示。",
    "F浮 = 12 - 7 = 5 N。"
  ],
  "mistake_tip": "不要把水中测力计示数 7 N 当成浮力，浮力是前后两次数值的差。"
}
```

## 5. AI 错因解释接口，Day3 已实现

```http
POST /api/ai/explain-mistake
```

该接口只做「答错后换一种说法解释」，不做开放聊天。

行为规则：

- `ENABLE_AI_TUTOR=true` 且存在 `OPENAI_API_KEY`：调用 OpenAI Responses API，并要求结构化 JSON 输出。
- 没有 API Key 或关闭 AI：返回本地模板解释，不影响 demo。
- 默认模型：`gpt-4o`，可以用 `OPENAI_MODEL` 覆盖。

### Request Body

```json
{
  "question": "一个物体在空气中重 12 N，浸没在水中时弹簧测力计示数为 7 N，物体受到的浮力是多少？",
  "standard_answer": "5 N",
  "student_answer": "7 N",
  "knowledge_scope": "只允许解释浮力、阿基米德原理、称重法、漂浮平衡和初中基础浮沉判断"
}
```

### Response 200

```json
{
  "short_explanation": "你把水中测力计示数当成了浮力，其实浮力是前后两次数值的差。",
  "hint": "称重法先找 G物 和 F示，再用 F浮 = G物 - F示。",
  "next_step": "回到题干，把空气中的重力和水中的示数圈出来，再重新算一遍。"
}
```


## 6. AI 自由提问接口，Day3 已实现

```http
POST /api/ai/ask
```

该接口用于「AI 小老师」自由提问，但 Prompt 被约束为只回答物理题目、物理概念、物理计算和物理实验现象相关内容。非物理问题会被要求拒答。

行为规则：

- 使用项目根目录 `.env` 中的 `OPENAI_BASE_URL`、`OPENAI_MODEL`、`OPENAI_API_KEY`。
- 默认模型：`gpt-4o`。
- 没有 API Key 或中转站不可用时，返回基础讲解兜底提示。
- 可以带上当前题目、题目选项、学生所选选项文本、标准答案和学生答案作为上下文。

### Request Body

```json
{
  "message": "为什么漂浮时浮力等于重力？",
  "current_question": "一块木块漂浮在水面上，木块重 5 N，它受到的浮力是多少？",
  "question_options": [
    { "id": "A", "text": "大于 5 N" },
    { "id": "B", "text": "等于 5 N" },
    { "id": "C", "text": "小于 5 N" }
  ],
  "correct_option": "B",
  "selected_option_text": "大于 5 N",
  "standard_answer": "5 N",
  "student_answer": "8 N",
  "analysis_steps": ["题目说木块漂浮。", "漂浮时 F浮 = G物。", "所以 F浮 = 5 N。"],
  "mistake_tip": "漂浮时物体处于平衡状态，浮力等于重力。"
}
```

### Response 200

```json
{
  "answer": "这题先判断状态：木块是漂浮。漂浮时物体处于受力平衡，向上的浮力等于向下的重力，所以 F浮 = G物 = 5 N。",
  "scope": "浮力 / 漂浮平衡",
  "next_prompt": "如果物体下沉，浮力和重力又是什么关系？"
}
```

### 6.1 AI 自由提问流式接口，Day3 优化已实现

```http
POST /api/ai/ask/stream
```

该接口使用 Server-Sent Events（SSE）返回流式文本，前端「AI 小老师」默认调用这个接口。请求体与 `/api/ai/ask` 相同。

行为规则：

- 使用项目根目录 `.env` 中的 `OPENAI_BASE_URL`、`OPENAI_MODEL`、`OPENAI_API_KEY`。
- 默认模型：`gpt-4o`。
- 有可用 AI key 时，后端调用 OpenAI-compatible Chat Completions `stream=true`。
- 没有 API Key、关闭 AI 或中转站不可用时，仍按 SSE 格式返回基础讲解兜底解释。
- Prompt 继续约束为只回答物理题目、物理概念、物理计算和物理实验现象相关内容。

### SSE Event：chunk

```text
event: chunk
data: {"delta":"这题先判断状态：木块是漂浮。"}
```

### SSE Event：done

```text
event: done
data: {"scope":"AI 小老师","next_prompt":"还能问：这道题还有什么易错点？"}
```

## Error Responses

### 404 Not Found

当提交不存在的题目 ID 时返回。

```json
{
  "detail": "Question not found"
}
```

### 422 Validation Error

当字段缺失、不是数字、小于 0 或过大时返回。

```json
{
  "detail": [
    {
      "type": "greater_than_equal",
      "loc": ["body", "object_weight_n"],
      "msg": "Input should be greater than or equal to 0",
      "input": -1,
      "ctx": { "ge": 0 }
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error"
}
```

## Day1 取舍

- 只提供一个核心计算接口，不做复杂课程接口。
- 不在 Day1 接入数据库，避免过早增加复杂度。
- Day3 后如果需要记录实验结果，再增加 PostgreSQL / Supabase 表结构。

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
| displaced_water_weight_n | number | 是 | `>= 0` 且 `<= 10000` | 物体排开水的重量，单位 N |

### 判断规则

| 条件 | state | state_text | 说明 |
| --- | --- | --- | --- |
| 排开水重量 > 物体重量 | float | 上浮 | 浮力更大，能托住物体 |
| 排开水重量 ≈ 物体重量 | suspend | 悬浮 | 浮力和重力差不多平衡 |
| 排开水重量 < 物体重量 | sink | 下沉 | 浮力不够，托不住物体 |

说明：实际输入小数时可能存在误差，因此后端会使用一个很小的容差判断「差不多相等」。

### Response 200：上浮

```json
{
  "state": "float",
  "state_text": "上浮",
  "object_weight_n": 8,
  "buoyancy_n": 10,
  "difference_n": 2,
  "explanation": "排开水的重量比物体重量大，浮力能托住物体，所以物体会上浮。",
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
  "explanation": "排开水的重量和物体重量差不多，浮力和重力平衡，所以物体会悬浮在水中。",
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
  "explanation": "排开水的重量比物体重量小，浮力不够托住物体，所以物体会下沉。",
  "student_tip": "看箭头：向下的重力箭头更长，说明物体更容易往下运动。"
}
```

## 3. 公式计算接口，Day2 计划

```http
POST /api/buoyancy/formula/calculate
```

该接口用于支持「公式实验室」。Day1 暂未实现，Day2 开发。

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

## 4. 题目训练接口，Day3 计划

```http
GET /api/practice/questions
```

返回初中浮力题库。

### Response 200

```json
{
  "questions": [
    {
      "id": "q-weighing-001",
      "type": "fill_blank",
      "topic": "称重法求浮力",
      "stem": "一个物体在空气中重 12 N，浸没在水中时弹簧测力计示数为 7 N，物体受到的浮力是多少？",
      "answer": "5",
      "unit": "N"
    }
  ]
}
```

```http
POST /api/practice/submit
```

提交答案并返回解析。

### Request Body

```json
{
  "question_id": "q-weighing-001",
  "student_answer": "5"
}
```

### Response 200

```json
{
  "correct": true,
  "correct_answer": "5 N",
  "analysis_steps": [
    "这道题使用称重法。",
    "F浮 = G物 - F示。",
    "F浮 = 12 - 7 = 5 N。"
  ],
  "mistake_tip": null
}
```

## Error Responses

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

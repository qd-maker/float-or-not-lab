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

# 浮不浮实验室 Float or Not Lab

一个面向小学高年级和初中生的浮力科普小工具。

学生输入「物体重量」和「排开水的重量」，观察物体在水中的上浮、悬浮或下沉结果，从而理解：

> 物体能不能浮起来，不是只看它重不重，而是看它受到的浮力能不能托住它。

## 当前阶段

Gate3 AI 协作挑战 Day1 首版仓库。

今天的重点不是做完整课程，而是先把项目范围、API Contract、工程骨架和每日进度记录搭起来，保证后续每天都能在 GitHub 上持续更新。

## 核心知识点

只讲一个知识点：

> 物体在水中会受到向上的浮力，浮力大小近似等于物体排开水的重量。

判断规则：

| 排开水的重量和物体重量关系 | 结果 |
| --- | --- |
| 排开水的重量 > 物体重量 | 上浮 |
| 排开水的重量 ≈ 物体重量 | 悬浮 |
| 排开水的重量 < 物体重量 | 下沉 |

## 目标用户

- 小学高年级学生
- 初中物理入门学生
- 需要快速理解「浮力为什么能托住物体」的学习者

## 技术栈

- Frontend：React + Vite + TypeScript
- Backend：FastAPI + Pydantic
- Data：PostgreSQL / Supabase 预留，Day3 后用于记录实验和答题结果
- Deploy：Docker 优先

## 项目结构

```text
float-or-not-lab/
├─ backend/                 # FastAPI 后端
├─ frontend/                # React 前端
├─ docs/
│  ├─ api-contract.md
│  ├─ product-plan.md
│  └─ gate3-daily-progress.md
├─ docker-compose.yml
├─ PRODUCT.md
├─ DESIGN.md
└─ README.md
```

## 本地运行

### 1. 启动后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

健康检查：

```bash
curl http://localhost:8000/health
```

测试浮力接口：

```bash
curl -X POST http://localhost:8000/api/buoyancy/calculate ^
  -H "Content-Type: application/json" ^
  -d "{\"object_weight_n\":8,\"displaced_water_weight_n\":10}"
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

### 3. Docker 运行

```bash
docker compose up --build
```

- 前端：http://localhost:5173
- 后端：http://localhost:8000

## Day1 产出

- [x] 确定选题：初中物理浮力
- [x] 确定项目名：浮不浮实验室
- [x] 明确学习目标
- [x] 写出 API Contract
- [x] 搭建 FastAPI 后端骨架
- [x] 搭建 React 前端骨架
- [x] 建立每日进度文档

详细记录见：[docs/gate3-daily-progress.md](docs/gate3-daily-progress.md)

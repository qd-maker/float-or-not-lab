# 浮不浮实验室 Float or Not Lab

一个面向小学高年级和初中生的浮力科普小工具。

学生输入「物体重量」和「完全浸没时排开水的重量」，观察物体在水中的上浮、悬浮或下沉结果，从而理解：

> 物体能不能浮起来，不是只看它重不重，而是看它受到的浮力能不能托住它。

## 当前阶段

Gate3 AI 协作挑战 Day4 可部署版本。

当前版本已经完成概念实验、公式实验室、真实题目训练、AI 小老师和 Docker 部署收口，可以本地运行，也可以部署到服务器演示。

经过 Day1 复盘，项目方向从「两个数判断浮不浮」升级为：

```text
概念演示 + 公式计算 + 真实题目训练
```

这样仍然只围绕「浮力」一个知识点，但能更贴近初中真实学习内容，让学生不只是看动画，还能练会公式和题型。

## 核心知识点

只讲一个知识点：

> 物体在水中会受到向上的浮力；物体完全浸没时，最大浮力近似等于它排开水的重量。

后续会补充初中常见计算公式：

```text
F浮 = G排
F浮 = ρ液 g V排
F浮 = G物 - F示
```

其中 Day1 已实现概念实验，Day2 已实现公式实验室，Day3 已实现真实题目训练和可选 AI 小老师，Day4 已完成 Docker 部署和演示文档收口。

判断规则：

概念实验比较的是物体刚完全浸没时的最大浮力；如果物体最终漂浮，浮力会重新等于物体重力。

| 完全浸没时排开水的重量和物体重量关系 | 结果 |
| --- | --- |
| 完全浸没时排开水的重量 > 物体重量 | 上浮 |
| 完全浸没时排开水的重量 ≈ 物体重量 | 悬浮 |
| 完全浸没时排开水的重量 < 物体重量 | 下沉 |

## 目标用户

- 小学高年级学生
- 初中物理入门学生
- 需要快速理解「浮力为什么能托住物体」的学习者

## 技术栈

- Frontend：React + Vite + TypeScript
- Backend：FastAPI + Pydantic
- Data：PostgreSQL / Supabase 预留，当前题库先内置在代码中
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

## 本地部署和启动

下面命令默认从项目根目录运行：

```text
C:\Users\qd\Documents\实习试用期
```

如果你的终端已经在 `backend` 目录里，就不要再执行 `cd backend`，否则会变成 `backend\backend`，导致路径不存在。

### 0. 准备环境变量

项目根目录提供 `.env.example`。第一次运行时复制一份为 `.env`：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

`.env` 示例：

```bash
ENABLE_AI_TUTOR=true
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
OPENAI_API_KEY=
```

说明：

- `.env` 放在项目根目录，不放进 GitHub。
- `OPENAI_BASE_URL`：OpenAI-compatible 中转站地址，通常以 `/v1` 结尾。
- `OPENAI_MODEL`：当前默认使用 `gpt-4o`。
- `OPENAI_API_KEY`：本地自己填写，不要提交到 GitHub。
- 没有 key 时，基础题库、判题、解析仍然可用，AI 提问会显示本地降级提示。

### 1. 启动后端

#### 方式 A：从项目根目录启动

```powershell
cd C:\Users\qd\Documents\实习试用期
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONPATH=(Get-Location).Path
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 方式 B：如果你已经在 backend 目录

你的提示符类似这样时：

```text
PS C:\Users\qd\Documents\实习试用期\backend>
```

直接运行下面这些，不要再 `cd backend`：

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONPATH=(Get-Location).Path
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

macOS / Linux：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=$(pwd)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

健康检查：

```bash
curl http://localhost:8000/health
```

### 2. 启动前端

另开一个终端，从项目根目录运行：

```bash
cd frontend
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

### 3. 推荐体验路径

1. 先看「概念实验区」：调整物体重量和完全浸没时排开水重量。
2. 再看「公式实验室」：练阿基米德公式、称重法、漂浮平衡。
3. 最后看「真实题目训练」：选择题型、提交答案、看分步解析。
4. 配好 `OPENAI_API_KEY` 后，在「AI 小老师」里直接提问物理题。

### 4. Docker 运行

Docker 方式更接近最终部署：前端会先构建为静态文件，再由 Nginx 托管；浏览器请求 `/api/...` 时由 Nginx 转发给 FastAPI。

```bash
docker compose up --build
```

- 前端：http://localhost:5173
- 后端：http://localhost:8000
- 健康检查：http://localhost:5173/health

更完整的服务器部署步骤见：[docs/deployment-guide.md](docs/deployment-guide.md)

### 5. AI 小老师说明

Day3 的 AI 功能是可选增强，不影响基础 demo。

它有两个入口：

- 答错后点「让 AI 针对我的错误讲一遍」。
- 在「AI 小老师」输入框里自由提问物理题，或者点击快捷提问按钮。

Prompt 约束：AI 只允许回答物理题目、物理概念、物理计算和物理实验现象相关内容。非物理问题会被要求拒答。快捷提问会根据学生当前答题状态动态变化。

前端默认使用 `POST /api/ai/ask/stream` 进行 Server-Sent Events 流式输出，所以长答案会像聊天产品一样逐段显示；如果没有配置 `OPENAI_API_KEY`，后端仍会用本地模板按同样格式返回。

## Day1 到 Day4 产出

- [x] 确定选题：初中物理浮力
- [x] 确定项目名：浮不浮实验室
- [x] 明确学习目标
- [x] 写出 API Contract
- [x] 搭建 FastAPI 后端骨架
- [x] 搭建 React 前端骨架
- [x] 建立每日进度文档
- [x] 复盘发现单纯判断浮沉偏单调，已调整 Day2 到 Day4 方向
- [x] Day2 完成公式实验室：阿基米德公式、称重法、漂浮平衡
- [x] Day3 完成真实题目训练：10 道题、判题、分步解析、错因提示
- [x] Day3 增加可选 AI 小老师：支持流式输出，无 key 自动降级，不影响演示
- [x] Day4 完成 Docker 部署收口：前端 Nginx 静态托管，后端 FastAPI 容器化
- [x] Day4 完成演示脚本、部署说明和项目总结

## Day4 交付文档

- 每日进度：[docs/gate3-daily-progress.md](docs/gate3-daily-progress.md)
- API Contract：[docs/api-contract.md](docs/api-contract.md)
- 四天计划：[docs/product-plan.md](docs/product-plan.md)
- 部署说明：[docs/deployment-guide.md](docs/deployment-guide.md)
- 演示脚本：[docs/demo-script.md](docs/demo-script.md)
- 项目总结：[docs/project-summary.md](docs/project-summary.md)

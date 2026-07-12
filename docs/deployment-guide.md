# Day4 部署说明

本文档用于把「浮不浮实验室」从本地 demo 收口成可以部署演示的版本。

已部署实例：

- 在线 Demo：[https://float.heyqi.xyz/](https://float.heyqi.xyz/)
- 健康检查：[https://float.heyqi.xyz/health](https://float.heyqi.xyz/health)

## 1. 部署方式选择

当前推荐使用 Docker Compose：

- `api`：FastAPI 后端，端口 `8000`。
- `web`：Nginx 托管前端静态文件，端口 `5173`。
- 前端访问 `/api/...` 时，由 Nginx 反向代理到后端容器。

这样做的好处：

- 浏览器不需要知道 Docker 内部服务名。
- 前端生产构建后是静态文件，更接近真实部署。
- AI Key 只放在后端环境变量里，不会被打进前端包。

## 2. 本地 Docker 启动

在项目根目录执行：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

如需启用真实 AI，把 `.env` 中的 `OPENAI_API_KEY` 填好。

启动：

```bash
docker compose up --build
```

访问：

```text
前端：http://localhost:5173
后端：http://localhost:8000/health
```

## 3. 服务器部署步骤

假设服务器已安装 Docker 和 Docker Compose 插件。

```bash
git clone https://github.com/qd-maker/float-or-not-lab.git
cd float-or-not-lab
cp .env.example .env
nano .env
```

`.env` 示例：

```bash
ENABLE_AI_TUTOR=true
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
OPENAI_API_KEY=
```

启动：

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

## 4. 端口和反向代理

默认端口：

| 服务 | 容器端口 | 宿主机端口 |
| --- | --- | --- |
| web | 80 | 5173 |
| api | 8000 | 8000 |

如果有域名和 Nginx，可以把域名反向代理到：

```text
http://127.0.0.1:5173
```

由于前端请求同源 `/api`，所以外层 Nginx 只需要代理前端入口即可。

## 5. AI 功能降级

AI 小老师是增强功能，不是基础功能依赖。

| 情况 | 页面表现 |
| --- | --- |
| 有 `OPENAI_API_KEY` | AI 小老师流式解释题目 |
| 无 `OPENAI_API_KEY` | 返回本地模板解释，题目训练仍可用 |
| 中转站临时不可用 | 自动降级，不影响基础 demo |

## 6. 常见问题

### 6.1 页面能打开，但 AI 没反应

检查：

```bash
docker compose logs -f api
```

确认 `.env` 中是否填写了：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o
```

### 6.2 前端访问不到后端

Docker 部署下前端会请求 `/api/...`，由前端容器内 Nginx 转发到 `api:8000`。

检查：

```bash
curl http://localhost:5173/health
curl http://localhost:8000/health
```

两个都应该返回后端健康信息。

### 6.3 修改前端环境变量后没生效

`VITE_API_BASE_URL` 是构建期变量，修改后需要重新构建前端镜像：

```bash
docker compose up -d --build web
```

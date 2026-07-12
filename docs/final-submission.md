# Gate3 Day7 最终提交清单

提交日期：2026-07-12
项目名称：浮不浮实验室 Float or Not Lab

## 1. README

- [项目 README](../README.md)
- 内容包括：项目定位、功能能力、截图、技术栈、本地启动、Docker 部署、API、测试方法和演示路径。

## 2. 可运行 Demo

- **在线 Demo：** [https://float.heyqi.xyz/](https://float.heyqi.xyz/)
- **健康检查：** [https://float.heyqi.xyz/health](https://float.heyqi.xyz/health)
- **GitHub：** [https://github.com/qd-maker/float-or-not-lab](https://github.com/qd-maker/float-or-not-lab)

2026-07-12 验证结果：在线首页和健康检查均返回 HTTP `200`。

### 截图证据

| 功能 | 截图 |
| --- | --- |
| 概念实验与水槽动画 | [float-lab-overview.png](images/float-lab-overview.png) |
| 三种公式计算 | [float-lab-formula.png](images/float-lab-formula.png) |
| 真实题训练与 AI 小老师 | [float-lab-practice-ai.png](images/float-lab-practice-ai.png) |
| 学习数据与错题订正 | [float-lab-learning-dashboard.png](images/float-lab-learning-dashboard.png) |
| AI 数学公式排版 | [float-lab-ai-math.png](images/float-lab-ai-math.png) |
| AI 同类强化题 | [float-lab-variant-practice.png](images/float-lab-variant-practice.png) |

### 推荐演示路径

1. 输入 `8 N` 和 `10 N`，观察物体上浮与力箭头变化。
2. 用阿基米德原理计算 `1000 × 10 × 0.003 = 30 N`。
3. 故意答错一道题，查看动态错因和错题本。
4. 点击「让 AI 针对我的错误讲一遍」，观察 SSE 流式输出和数学公式排版。
5. 点击「再练一道同类题」，完成针对当前错因生成的强化题。
6. 查看题库进度、正确率、待订正数量和强化次数。

完整讲述见：[最终演示脚本](demo-script.md)。

## 3. 七天每日小结

- [Day1-Day7 每日五问](gate3-daily-progress.md)

每天都包含：

1. 今天完成了什么。
2. 今天最大的困难是什么。
3. AI 帮了什么。
4. AI 哪里出错了，我怎么修正。
5. 明天计划是什么。

## 4. 最终复盘

- [七日最终复盘](final-retrospective.md)
- [AI 协作过程详细记录](ai-collaboration-notes.md)

复盘内容包括：

- AI 真正提高效率的环节。
- AI 最常出现的业务、学科、统计和布局错误。
- 如果重新开始会如何调整开发顺序。
- 对七日流程设计的三个回答。

## 5. 最终功能范围

```text
概念实验
→ 三种浮力公式
→ 10 道真实题训练
→ 动态错因诊断
→ AI 小老师 SSE 讲解
→ KaTeX 数学公式
→ 错题本和订正
→ AI 同类强化题
→ 学习进度与薄弱题型
```

## 6. 最终验证

- 前端生产构建通过。
- 后端 29 个测试通过。
- 概念实验、三种公式、题目判定、错题订正、AI SSE 和强化题路径完成回归。
- AI 缺少 Key 或生成内容不合格时均有本地降级。
- 1440px、1024px 和 390px 页面完成响应式检查，390px 无横向溢出。
- 仓库未提交 `.env`、API Key、运行日志或构建产物。

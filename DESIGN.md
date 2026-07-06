# DESIGN.md

## Design Direction

「浮不浮实验室」是一个给学生使用的轻量实验网页。界面应该像一个清爽的水槽实验台，而不是复杂后台。

## Scene

学生在家里或教室用电脑打开网页，跟着老师或自己输入数字，看水槽里的物体上浮、悬浮或下沉。环境是明亮教室，所以使用浅色主题和清晰高对比信息。

## Visual Principles

- 页面中心是水槽实验区。
- 输入区靠左或靠上，结果和解释靠右或靠下。
- 浮力箭头向上，重力箭头向下。
- 箭头长度和力的大小有关。
- 不用大段文字，优先用图形和短句。

## Color Tokens

使用轻量水实验室风格：

- Background：`oklch(0.985 0.01 220)`
- Surface：`oklch(0.965 0.018 220)`
- Water：`oklch(0.72 0.12 220)`
- Water Deep：`oklch(0.58 0.14 230)`
- Object：`oklch(0.67 0.13 55)`
- Float Force：`oklch(0.62 0.15 155)`
- Gravity Force：`oklch(0.58 0.18 25)`
- Text：`oklch(0.22 0.02 240)`
- Muted Text：`oklch(0.45 0.025 240)`

## Typography

- 中文优先使用系统字体：`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- 标题要短而明确。
- 正文控制在 65 字以内一行。
- 给学生看的解释避免连续长句。

## Interaction

- 输入后点击「开始实验」。
- 也可以点击预设例子快速体验。
- 结果出现时，物体位置和箭头同步变化。
- 悬浮状态要明显停在水中间，不要看起来像卡住。

## Avoid

- 不要做成只有表格和公式的计算器。
- 不要堆很多卡片。
- 不要一开始讲密度、体积和复杂公式。
- 不要让 AI 解释扩散到完整物理课程。

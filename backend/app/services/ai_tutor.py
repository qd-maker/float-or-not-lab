import json
import os
import re
from typing import Any, Iterator

from app.schemas import AiAskRequest, AiAskResponse, AiExplainMistakeRequest, AiExplainMistakeResponse


FALLBACK_PREFIX = "AI 小老师先用基础讲解告诉你："


def fallback_explanation(payload: AiExplainMistakeRequest) -> AiExplainMistakeResponse:
    return AiExplainMistakeResponse(
        short_explanation=f"{FALLBACK_PREFIX}你这题需要先判断题目属于哪种浮力题型，再套对应公式。标准答案是 {payload.standard_answer}。",
        hint="如果题目给了空气中重力和水中测力计示数，用称重法；如果给了密度和排开体积，用阿基米德公式；如果说漂浮，就用 F浮 = G物。",
        next_step="回到题干，把已知量圈出来，再按解析步骤重新算一遍。",
    )


def _extract_json_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text
    return str(response)


def _build_client(api_key: str) -> Any:
    from openai import OpenAI

    client_kwargs = {"api_key": api_key}
    base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_BASE")
    if base_url:
        client_kwargs["base_url"] = base_url.rstrip("/")
    return OpenAI(**client_kwargs)


def _parse_ai_json(raw_text: str) -> AiExplainMistakeResponse:
    data = json.loads(raw_text)
    return AiExplainMistakeResponse(**data)


def _parse_ask_json(raw_text: str) -> AiAskResponse:
    data = json.loads(raw_text)
    return AiAskResponse(**data)


def _explain_with_responses(client: Any, model: str, payload: AiExplainMistakeRequest) -> AiExplainMistakeResponse:
    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": (
                    "你是初中物理浮力小老师。只解释浮力、阿基米德原理、称重法、漂浮平衡和基础浮沉判断。"
                    "不要扩展到高中流体力学，不要开放聊天。输出必须是 JSON。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "question": payload.question,
                        "standard_answer": payload.standard_answer,
                        "student_answer": payload.student_answer,
                        "knowledge_scope": payload.knowledge_scope,
                        "output_schema": {
                            "short_explanation": "一句话指出学生错在哪里，适合初中生",
                            "hint": "一个下一次解题时可执行的提示",
                            "next_step": "一个建议学生马上做的小动作",
                        },
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "buoyancy_mistake_explanation",
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "short_explanation": {"type": "string"},
                        "hint": {"type": "string"},
                        "next_step": {"type": "string"},
                    },
                    "required": ["short_explanation", "hint", "next_step"],
                },
                "strict": True,
            }
        },
    )
    return _parse_ai_json(_extract_json_text(response))


def _explain_with_chat_completions(client: Any, model: str, payload: AiExplainMistakeRequest) -> AiExplainMistakeResponse:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是初中物理浮力小老师。只解释浮力、阿基米德原理、称重法、漂浮平衡和基础浮沉判断。"
                    "输出 JSON，字段只能包含 short_explanation、hint、next_step。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "question": payload.question,
                        "standard_answer": payload.standard_answer,
                        "student_answer": payload.student_answer,
                        "knowledge_scope": payload.knowledge_scope,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    raw_text = response.choices[0].message.content or "{}"
    return _parse_ai_json(raw_text)


def explain_mistake(payload: AiExplainMistakeRequest) -> AiExplainMistakeResponse:
    enabled = os.getenv("ENABLE_AI_TUTOR", "true").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")
    if not enabled or not api_key:
        return fallback_explanation(payload)

    try:
        client = _build_client(api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o")
        try:
            return _explain_with_responses(client, model, payload)
        except Exception:
            return _explain_with_chat_completions(client, model, payload)
    except Exception:
        return fallback_explanation(payload)


def fallback_ask_response() -> AiAskResponse:
    return AiAskResponse(
        answer=(
            "**先判断题型：** 做浮力题时，先找已知量，再选择公式。"
            "例如阿基米德原理是 $F_{\\text{浮}} = \\rho_{\\text{液}} g V_{\\text{排}}$。"
        ),
        scope="基础讲解",
        next_prompt="可以问：这道题应该先找哪些已知量？",
    )


def _options_text(payload: AiAskRequest) -> str:
    if not payload.question_options:
        return "无"
    return "；".join(f"{option.id}. {option.text}" for option in payload.question_options)


def _ask_messages(payload: AiAskRequest, stream: bool = False) -> list[dict[str, str]]:
    output_rule = (
        "不要输出 JSON，不要加字段名。使用简洁 Markdown 分段，可以使用粗体和列表，但不要使用一级或二级标题。"
        "所有物理量、公式和单位都使用 LaTeX：行内公式必须写在 $...$ 中，独立公式必须写在 $$...$$ 中。"
        "不要使用 \\(...\\) 或 \\[...\\] 作为数学分隔符。"
        if stream
        else "输出 JSON，字段只能包含 answer、scope、next_prompt。"
    )
    if stream:
        user_content = "\n".join(
            [
                f"学生问题：{payload.message}",
                f"当前题目：{payload.current_question or '无'}",
                f"题目选项：{_options_text(payload)}",
                f"学生所选选项文本：{payload.selected_option_text or '无'}",
                f"标准答案：{payload.standard_answer or '无'}",
                f"正确选项：{payload.correct_option or '无'}",
                f"正确答案文本：{payload.correct_answer_text or '无'}",
                f"学生答案：{payload.student_answer or '无'}",
                f"标准解析：{'；'.join(payload.analysis_steps) if payload.analysis_steps else '无'}",
                f"系统错因提示：{payload.mistake_tip or '无'}",
                "如果学生选错了选择题，必须点名学生选项的具体文字，并说明它为什么不对。",
                "如果有标准解析和错因提示，优先贴合这些内容，不要泛泛改写成别的选项。",
                "请直接回答学生，不要复述这些字段名。",
            ]
        )
    else:
        user_payload: dict[str, Any] = {
            "student_question": payload.message,
            "current_question_context": payload.current_question,
            "question_options": _options_text(payload),
            "selected_option_text": payload.selected_option_text,
            "standard_answer": payload.standard_answer,
            "correct_option": payload.correct_option,
            "correct_answer_text": payload.correct_answer_text,
            "student_answer": payload.student_answer,
            "analysis_steps": payload.analysis_steps,
            "mistake_tip": payload.mistake_tip,
        }
        user_payload["output_schema"] = {
            "answer": "对学生问题的物理讲解；非物理问题只拒绝并说明只能答物理题",
            "scope": "本次回答涉及的物理知识点，例如浮力/力学/电学/光学/非物理问题",
            "next_prompt": "建议学生继续追问的一个物理问题",
        }
        user_content = json.dumps(user_payload, ensure_ascii=False)

    return [
        {
            "role": "system",
            "content": (
                "你是面向初中生的物理题目辅导小老师。"
                "只回答物理题目、物理概念、物理计算、物理实验现象相关的问题。"
                "重点用初中生能听懂的语言解释，不要闲聊，不要回答与物理学习无关的问题。"
                "如果用户问的不是物理题或物理学习内容，必须只说明：我只能回答物理题目相关的问题。"
                "回答物理题时按这个顺序：先判断题型，再列已知量，再写公式，再代入或解释原因，最后给一个下一步练习建议。"
                "如果当前题是选择题，必须阅读题目选项原文；学生选错时，要针对学生选中的具体选项文字进行反驳。"
                "不得把选项内容改写成题目中没有出现过的说法。"
                "控制在 5 到 8 句话内，每句话短一点，适合初中生阅读。"
                "公式中的中文下标可使用 \\text{}，单位优先使用 \\mathrm{}，并保证 LaTeX 括号成对闭合。"
                f"{output_rule}"
            ),
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]


def _sse(event: str, data: dict[str, str]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _fallback_stream(payload: AiAskRequest | None = None) -> Iterator[str]:
    fallback = fallback_ask_response()
    text = fallback.answer
    if payload and payload.current_question:
        text = (
            "**先判断题型：** 先把题干里的已知量圈出来。\n\n"
            "如果是浮力题，优先比较 $F_{\\text{浮}}$ 和 $G_{\\text{物}}$；"
            "如果要计算，再判断使用 $F_{\\text{浮}} = \\rho_{\\text{液}} g V_{\\text{排}}$、称重法还是漂浮平衡。"
        )
    for chunk in [text[i : i + 24] for i in range(0, len(text), 24)]:
        yield _sse("chunk", {"delta": chunk})
    yield _sse("done", {"scope": fallback.scope, "next_prompt": fallback.next_prompt})


def _strip_stream_preamble(text: str) -> str:
    """Remove common model-generated headings before sending text to students."""

    return re.sub(r"^\s*\*{0,2}\s*对学生问题的物理讲解\s*[:：]\s*\*{0,2}\s*", "", text)


def ask_physics_question(payload: AiAskRequest) -> AiAskResponse:
    enabled = os.getenv("ENABLE_AI_TUTOR", "true").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")
    if not enabled or not api_key:
        return fallback_ask_response()

    try:
        client = _build_client(api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o")
        response = client.chat.completions.create(
            model=model,
            messages=_ask_messages(payload),
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        raw_text = response.choices[0].message.content or "{}"
        return _parse_ask_json(raw_text)
    except Exception:
        return fallback_ask_response()


def stream_physics_question(payload: AiAskRequest) -> Iterator[str]:
    yield _sse("status", {"scope": "正在组织思路"})
    enabled = os.getenv("ENABLE_AI_TUTOR", "true").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")
    if not enabled or not api_key:
        yield from _fallback_stream(payload)
        return

    try:
        client = _build_client(api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o")
        stream = client.chat.completions.create(
            model=model,
            messages=_ask_messages(payload, stream=True),
            temperature=0.2,
            stream=True,
        )
        has_chunk = False
        started = False
        pending_text = ""
        for chunk in stream:
            choices = getattr(chunk, "choices", None) or []
            if not choices:
                continue
            delta = getattr(choices[0].delta, "content", None) or ""
            if not delta:
                continue
            if not started:
                pending_text += delta
                if len(pending_text) < 48 and "\n\n" not in pending_text:
                    continue
                pending_text = _strip_stream_preamble(pending_text)
                if not pending_text:
                    continue
                started = True
                has_chunk = True
                yield _sse("chunk", {"delta": pending_text})
                pending_text = ""
                continue
            has_chunk = True
            yield _sse("chunk", {"delta": delta})
        if not started and pending_text:
            pending_text = _strip_stream_preamble(pending_text)
            if pending_text:
                has_chunk = True
                yield _sse("chunk", {"delta": pending_text})
        if not has_chunk:
            yield from _fallback_stream(payload)
            return
        yield _sse("done", {"scope": "AI 小老师", "next_prompt": "还能问：这道题还有什么易错点？"})
    except Exception:
        yield from _fallback_stream(payload)

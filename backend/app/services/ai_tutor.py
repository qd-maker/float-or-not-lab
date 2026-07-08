import json
import os
import re
from typing import Any, Iterator

from app.schemas import AiAskRequest, AiAskResponse, AiExplainMistakeRequest, AiExplainMistakeResponse


FALLBACK_PREFIX = "AI 小老师暂时使用本地解释："


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
        answer="AI 小老师还没有配置密钥或中转站暂时不可用。你可以先看题目的标准解析；配置 OPENAI_API_KEY 后，这里会按你的问题实时讲解物理题。",
        scope="本地降级",
        next_prompt="可以问：这道题应该先找哪些已知量？",
    )


def _ask_messages(payload: AiAskRequest, stream: bool = False) -> list[dict[str, str]]:
    output_rule = (
        "不要输出 JSON，不要加字段名，不要加 Markdown 标题，直接输出给学生看的讲解文本。"
        if stream
        else "输出 JSON，字段只能包含 answer、scope、next_prompt。"
    )
    if stream:
        user_content = "\n".join(
            [
                f"学生问题：{payload.message}",
                f"当前题目：{payload.current_question or '无'}",
                f"标准答案：{payload.standard_answer or '无'}",
                f"学生答案：{payload.student_answer or '无'}",
                "请直接回答学生，不要复述这些字段名。",
            ]
        )
    else:
        user_payload: dict[str, str | None | dict[str, str]] = {
            "student_question": payload.message,
            "current_question_context": payload.current_question,
            "standard_answer": payload.standard_answer,
            "student_answer": payload.student_answer,
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
                "控制在 5 到 8 句话内，每句话短一点，适合初中生阅读。"
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
            "AI 小老师暂时使用本地解释：先看这道题属于哪类物理问题，再把题干里的已知量圈出来。"
            "如果是浮力题，优先比较 F浮 和 G物；如果要计算，就看题目给的是密度体积、测力计示数，还是漂浮条件。"
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

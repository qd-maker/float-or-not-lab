import json
import os
from uuid import uuid4

from app.schemas import (
    AiVariantGenerateRequest,
    AiVariantGenerateResponse,
    QuestionOption,
    QuestionType,
    VariantQuestion,
)
from app.services.ai_tutor import _build_client


def _variant_id(original_id: str) -> str:
    return f"variant-{original_id}-{uuid4().hex[:8]}"


def _fallback_question(payload: AiVariantGenerateRequest) -> VariantQuestion:
    topic = payload.original_question.topic
    common = {
        "id": _variant_id(payload.original_question.id),
        "topic": topic,
    }

    if topic == "判断浮沉":
        return VariantQuestion(
            **common,
            type=QuestionType.SINGLE_CHOICE,
            stem="一个物体重 9 N，完全浸没时受到的浮力为 12 N，松手后物体会怎样？",
            options=[
                QuestionOption(id="A", text="上浮"),
                QuestionOption(id="B", text="悬浮"),
                QuestionOption(id="C", text="下沉"),
            ],
            answer="A",
            unit=None,
            analysis_steps=["比较浮力和重力。", "F浮 = 12 N，G物 = 9 N。", "F浮 > G物，所以物体会上浮。"],
            mistake_tip="不要只看物体重不重，要比较 F浮 和 G物。",
        )

    if topic == "称重法求浮力":
        return VariantQuestion(
            **common,
            type=QuestionType.FILL_BLANK,
            stem="一个物体在空气中重 15 N，浸没在水中时测力计示数为 9 N，它受到的浮力是多少？",
            options=[],
            answer="6",
            unit="N",
            analysis_steps=["使用称重法 F浮 = G物 - F示。", "代入 15 N 和 9 N。", "F浮 = 15 - 9 = 6 N。"],
            mistake_tip="浮力是空气中重力与水中示数的差，不是水中示数本身。",
        )

    if topic == "阿基米德公式":
        return VariantQuestion(
            **common,
            type=QuestionType.FILL_BLANK,
            stem="物体排开水的体积为 0.0025 m³，水的密度取 1000 kg/m³，g 取 10 N/kg，浮力是多少？",
            options=[],
            answer="25",
            unit="N",
            analysis_steps=["写出 F浮 = ρ液 g V排。", "代入 1000、10 和 0.0025。", "F浮 = 1000 × 10 × 0.0025 = 25 N。"],
            mistake_tip="检查 ρ液、g 和 V排 是否都已经代入。",
        )

    if topic == "漂浮平衡":
        return VariantQuestion(
            **common,
            type=QuestionType.FILL_BLANK,
            stem="一个重 7 N 的小球静止漂浮在水面上，它受到的浮力是多少？",
            options=[],
            answer="7",
            unit="N",
            analysis_steps=["小球处于漂浮平衡状态。", "漂浮时 F浮 = G物。", "所以小球受到的浮力为 7 N。"],
            mistake_tip="漂浮时浮力不是大于重力，而是刚好等于重力。",
        )

    return VariantQuestion(
        **common,
        type=QuestionType.SINGLE_CHOICE,
        stem="同一个鸡蛋先后放入清水和浓盐水中，在浓盐水中更容易浮起，主要原因是什么？",
        options=[
            QuestionOption(id="A", text="浓盐水密度更大，同样排开体积产生的浮力更大"),
            QuestionOption(id="B", text="鸡蛋在盐水中的重力消失了"),
            QuestionOption(id="C", text="盐水不受地球引力"),
        ],
        answer="A",
        unit=None,
        analysis_steps=["鸡蛋重力基本不变。", "浓盐水的密度比清水大。", "由 F浮 = ρ液 g V排 可知，液体密度增大时浮力更容易增大。"],
        mistake_tip="液体没有消除重力，变化的是液体密度和浮力。",
    )


def fallback_variant(payload: AiVariantGenerateRequest) -> AiVariantGenerateResponse:
    short_tip = payload.mistake_tip.strip()[:120]
    return AiVariantGenerateResponse(
        question=_fallback_question(payload),
        focus=f"针对「{short_tip}」再练一道同知识点题。",
        source="fallback",
    )


def _generate_with_ai(payload: AiVariantGenerateRequest) -> AiVariantGenerateResponse:
    api_key = os.environ["OPENAI_API_KEY"]
    client = _build_client(api_key)
    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是初中物理浮力出题老师。根据原题和学生错因生成一道同知识点、同难度的变式题。"
                    "范围只能是判断浮沉、称重法求浮力、阿基米德公式、漂浮平衡、生活应用。"
                    "不要照抄原题，不要超出初中物理，不要使用开放题。"
                    "选择题必须有且只有一个正确选项；填空题答案必须是数值。"
                    "数值要便于初中生口算，解析必须逐步验证答案。只输出 JSON。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "original_question": payload.original_question.model_dump(mode="json"),
                        "student_answer": payload.student_answer,
                        "mistake_tip": payload.mistake_tip,
                        "output_schema": {
                            "question": {
                                "type": "single_choice 或 fill_blank",
                                "topic": "必须和原题 topic 完全一致",
                                "stem": "新题题干",
                                "options": [{"id": "A", "text": "选项文本"}],
                                "answer": "选择题填选项 ID，填空题填数值",
                                "unit": "N 或 null",
                                "analysis_steps": ["2 到 5 步解析"],
                                "mistake_tip": "新题易错提示",
                            },
                            "focus": "这道题针对学生哪个错误进行强化",
                        },
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    data = json.loads(response.choices[0].message.content or "{}")
    question_data = data["question"]
    question_data["id"] = _variant_id(payload.original_question.id)
    question = VariantQuestion.model_validate(question_data)
    if question.topic != payload.original_question.topic:
        raise ValueError("AI 生成题的知识点与原题不一致。")
    if question.stem.strip() == payload.original_question.stem.strip():
        raise ValueError("AI 生成题不能照抄原题。")
    focus = str(data.get("focus", "针对当前错因进行同类强化练习。")).strip()
    return AiVariantGenerateResponse(question=question, focus=focus, source="ai")


def generate_variant(payload: AiVariantGenerateRequest) -> AiVariantGenerateResponse:
    enabled = os.getenv("ENABLE_AI_TUTOR", "true").lower() == "true"
    if not enabled or not os.getenv("OPENAI_API_KEY"):
        return fallback_variant(payload)
    try:
        return _generate_with_ai(payload)
    except Exception:
        return fallback_variant(payload)

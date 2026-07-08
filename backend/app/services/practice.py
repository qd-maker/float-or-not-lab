from fastapi import HTTPException

from app.schemas import (
    PracticeQuestion,
    PracticeQuestionsResponse,
    PracticeSubmitRequest,
    PracticeSubmitResponse,
    QuestionOption,
    QuestionType,
)


ARCHIMEDES_KNOWN_VALUES = {
    "q-archimedes-001": {"density": 1000, "g": 10, "volume": 0.003},
    "q-archimedes-002": {"density": 1000, "g": 10, "volume": 0.0015},
}

WEIGHING_KNOWN_VALUES = {
    "q-weighing-001": {"weight": 12, "reading": 7},
    "q-weighing-002": {"weight": 9, "reading": 4},
}


QUESTIONS: list[PracticeQuestion] = [
    PracticeQuestion(
        id="q-float-001",
        type=QuestionType.SINGLE_CHOICE,
        topic="判断浮沉",
        stem="一个物体重 10 N，受到的浮力是 6 N，它在水中会怎样？",
        options=[
            QuestionOption(id="A", text="上浮"),
            QuestionOption(id="B", text="悬浮"),
            QuestionOption(id="C", text="下沉"),
        ],
        answer="C",
        unit=None,
        analysis_steps=["比较浮力和物体重力。", "F浮 = 6 N，G物 = 10 N。", "F浮 < G物，所以物体会下沉。"],
        mistake_tip="先比较 F浮 和 G物，不要只看物体重不重。",
    ),
    PracticeQuestion(
        id="q-float-002",
        type=QuestionType.SINGLE_CHOICE,
        topic="判断浮沉",
        stem="一个物体重 8 N，受到的浮力也是 8 N，它可能处于什么状态？",
        options=[
            QuestionOption(id="A", text="受力平衡，可能悬浮"),
            QuestionOption(id="B", text="一定快速上浮"),
            QuestionOption(id="C", text="一定下沉"),
        ],
        answer="A",
        unit=None,
        analysis_steps=["比较 F浮 和 G物。", "F浮 = G物 = 8 N。", "两个力平衡，所以物体可能悬浮或保持平衡状态。"],
        mistake_tip="相等时不是上浮也不是下沉，而是受力平衡。",
    ),
    PracticeQuestion(
        id="q-weighing-001",
        type=QuestionType.FILL_BLANK,
        topic="称重法求浮力",
        stem="一个物体在空气中重 12 N，浸没在水中时弹簧测力计示数为 7 N，物体受到的浮力是多少？",
        options=[],
        answer="5",
        unit="N",
        analysis_steps=["这道题使用称重法。", "F浮 = G物 - F示。", "F浮 = 12 - 7 = 5 N。"],
        mistake_tip="不要把水中测力计示数 7 N 当成浮力，浮力是前后两次数值的差。",
    ),
    PracticeQuestion(
        id="q-weighing-002",
        type=QuestionType.FILL_BLANK,
        topic="称重法求浮力",
        stem="物体重 9 N，浸入水中后测力计示数为 4 N，浮力是多少？",
        options=[],
        answer="5",
        unit="N",
        analysis_steps=["使用称重法。", "F浮 = G物 - F示。", "F浮 = 9 - 4 = 5 N。"],
        mistake_tip="看到空气中重力和水中示数，就优先想到称重法。",
    ),
    PracticeQuestion(
        id="q-archimedes-001",
        type=QuestionType.FILL_BLANK,
        topic="阿基米德公式",
        stem="物体排开水的体积为 0.003 m³，水的密度取 1000 kg/m³，g 取 10 N/kg，浮力是多少？",
        options=[],
        answer="30",
        unit="N",
        analysis_steps=["使用阿基米德公式。", "F浮 = ρ液 g V排。", "F浮 = 1000 × 10 × 0.003 = 30 N。"],
        mistake_tip="V排 的单位是 m³，代入时不要漏乘 g。",
    ),
    PracticeQuestion(
        id="q-archimedes-002",
        type=QuestionType.FILL_BLANK,
        topic="阿基米德公式",
        stem="物体排开水的体积为 0.0015 m³，水的密度取 1000 kg/m³，g 取 10 N/kg，浮力是多少？",
        options=[],
        answer="15",
        unit="N",
        analysis_steps=["使用 F浮 = ρ液 g V排。", "代入：1000 × 10 × 0.0015。", "F浮 = 15 N。"],
        mistake_tip="小数体积计算时注意 1000 × 0.0015 = 1.5。",
    ),
    PracticeQuestion(
        id="q-floating-001",
        type=QuestionType.FILL_BLANK,
        topic="漂浮平衡",
        stem="一块木块漂浮在水面上，木块重 5 N，它受到的浮力是多少？",
        options=[],
        answer="5",
        unit="N",
        analysis_steps=["木块漂浮，说明它处于平衡状态。", "漂浮时 F浮 = G物。", "所以 F浮 = 5 N。"],
        mistake_tip="漂浮时不是浮力更大，而是浮力刚好等于重力。",
    ),
    PracticeQuestion(
        id="q-floating-002",
        type=QuestionType.SINGLE_CHOICE,
        topic="漂浮平衡",
        stem="轮船漂浮在水面上时，它受到的浮力和重力关系是什么？",
        options=[
            QuestionOption(id="A", text="浮力大于重力"),
            QuestionOption(id="B", text="浮力等于重力"),
            QuestionOption(id="C", text="浮力小于重力"),
        ],
        answer="B",
        unit=None,
        analysis_steps=["轮船漂浮，说明受力平衡。", "平衡时向上的浮力等于向下的重力。", "所以 F浮 = G物。"],
        mistake_tip="漂浮是平衡状态，不是因为浮力一直比重力大。",
    ),
    PracticeQuestion(
        id="q-life-001",
        type=QuestionType.SINGLE_CHOICE,
        topic="生活应用",
        stem="轮船从河水驶入海水后仍然漂浮。海水密度更大，船身通常会怎样？",
        options=[
            QuestionOption(id="A", text="上浮一些，排开更少的海水就能平衡重力"),
            QuestionOption(id="B", text="下沉更多，因为海水更重"),
            QuestionOption(id="C", text="一定完全不变"),
        ],
        answer="A",
        unit=None,
        analysis_steps=["轮船始终漂浮，所以浮力等于重力。", "海水密度比河水大。", "需要排开的海水体积更小，所以船身会上浮一些。"],
        mistake_tip="漂浮时浮力仍等于船重，变化的是排开液体的体积。",
    ),
    PracticeQuestion(
        id="q-life-002",
        type=QuestionType.SINGLE_CHOICE,
        topic="生活应用",
        stem="潜水艇想下潜时，通常会向水舱中加水。这样做主要是为了什么？",
        options=[
            QuestionOption(id="A", text="增大自身重力，使重力大于浮力"),
            QuestionOption(id="B", text="让水没有浮力"),
            QuestionOption(id="C", text="减小地球引力"),
        ],
        answer="A",
        unit=None,
        analysis_steps=["潜水艇下潜需要重力大于浮力。", "向水舱加水会增大潜水艇整体重力。", "当 G物 > F浮 时，潜水艇会下潜。"],
        mistake_tip="潜水艇不是消除浮力，而是通过改变自身重力来控制浮沉。",
    ),
]


def list_questions() -> PracticeQuestionsResponse:
    return PracticeQuestionsResponse(questions=QUESTIONS)


def get_question(question_id: str) -> PracticeQuestion:
    for question in QUESTIONS:
        if question.id == question_id:
            return question
    raise HTTPException(status_code=404, detail="Question not found")


def _normalize_answer(value: str) -> str:
    return value.strip().replace(" ", "").replace("Ｎ", "N").upper()


def _numeric_value(value: str) -> float | None:
    try:
        return float(_normalize_answer(value).replace("N", ""))
    except ValueError:
        return None


def _near(left: float | None, right: float, tolerance: float = 0.01) -> bool:
    if left is None:
        return False
    return abs(left - right) <= tolerance


def _is_numeric_match(student_answer: str, correct_answer: str) -> bool:
    student = _numeric_value(student_answer)
    correct = _numeric_value(correct_answer)
    if student is None or correct is None:
        return False
    return abs(student - correct) <= 0.01


def _diagnose_archimedes_mistake(question: PracticeQuestion, student_answer: str) -> str | None:
    values = ARCHIMEDES_KNOWN_VALUES.get(question.id)
    if not values:
        return None

    student = _numeric_value(student_answer)
    if student is None:
        return "这题需要填写数值结果。先写公式 F浮 = ρ液 g V排，再把 ρ、g、V 三个量都代入。"

    density = values["density"]
    gravity = values["g"]
    volume = values["volume"]
    correct = density * gravity * volume

    if _near(student, density * volume):
        return "你算成了 ρ液 × V排，漏乘了重力加速度 g。阿基米德公式要写完整：F浮 = ρ液 g V排。"
    if _near(student, gravity * volume):
        return "你算成了 g × V排，漏乘了液体密度 ρ液。水的密度 1000 kg/m³ 也必须代入。"
    if _near(student, volume):
        return "你只写了排开液体的体积 V排。体积不是浮力，还要乘 ρ液 和 g，结果单位才是 N。"
    if student >= correct * 100 or student <= correct / 100:
        return "你的结果和正确数量级差很多，优先检查 V排 是否用 m³，以及小数点有没有看错。"
    return None


def _diagnose_weighing_mistake(question: PracticeQuestion, student_answer: str) -> str | None:
    values = WEIGHING_KNOWN_VALUES.get(question.id)
    if not values:
        return None

    student = _numeric_value(student_answer)
    if student is None:
        return "这题需要填写数值结果。看到空气中重力和水中测力计示数，先用 F浮 = G物 - F示。"

    weight = values["weight"]
    reading = values["reading"]

    if _near(student, reading):
        return "你把水中弹簧测力计示数当成了浮力。称重法中，浮力是前后两次示数的差：F浮 = G物 - F示。"
    if _near(student, weight + reading):
        return "这类题不是把两个力相加。物体浸入水中后少显示的那部分，才是浮力。"
    if _near(student, reading - weight):
        return "你把减法顺序写反了。称重法应使用空气中重力减去水中示数：F浮 = G物 - F示。"
    if _near(student, weight):
        return "你只写了物体在空气中的重力。题目问的是浮力，要看测力计减少了多少。"
    return None


def _diagnose_floating_mistake(question: PracticeQuestion, student_answer: str, normalized_student: str) -> str | None:
    if question.id == "q-floating-001":
        student = _numeric_value(student_answer)
        correct = _numeric_value(question.answer)
        if student is not None and correct is not None and student > correct:
            return "漂浮时不是浮力大于重力，而是物体受力平衡：F浮 = G物。"
        if student is not None and correct is not None and student < correct:
            return "物体已经漂浮，说明浮力刚好托住重力，所以不能小于物体重力。"

    if question.id == "q-floating-002" and normalized_student == "A":
        return "漂浮不是一直向上加速。漂浮在水面上时物体处于平衡状态，所以 F浮 = G物。"
    return None


def _diagnose_float_judgement_mistake(question: PracticeQuestion, normalized_student: str) -> str | None:
    if question.topic != "判断浮沉":
        return None
    if question.id == "q-float-001" and normalized_student in {"A", "B", "上浮", "悬浮"}:
        return "判断浮沉要比较 F浮 和 G物：这题 F浮 = 6 N，小于 G物 = 10 N，所以会下沉。"
    if question.id == "q-float-002" and normalized_student in {"B", "C", "一定快速上浮", "一定下沉"}:
        return "这题 F浮 和 G物 相等，物体受力平衡，不会因为浮力方向向上就一定快速上浮。"
    return None


def _build_mistake_tip(question: PracticeQuestion, student_answer: str, normalized_student: str) -> str:
    for diagnose in (
        lambda: _diagnose_archimedes_mistake(question, student_answer),
        lambda: _diagnose_weighing_mistake(question, student_answer),
        lambda: _diagnose_floating_mistake(question, student_answer, normalized_student),
        lambda: _diagnose_float_judgement_mistake(question, normalized_student),
    ):
        tip = diagnose()
        if tip:
            return tip
    return question.mistake_tip


def submit_answer(payload: PracticeSubmitRequest) -> PracticeSubmitResponse:
    question = get_question(payload.question_id)
    normalized_student = _normalize_answer(payload.student_answer)
    normalized_correct = _normalize_answer(question.answer)

    if question.type == QuestionType.FILL_BLANK:
        correct = _is_numeric_match(payload.student_answer, question.answer)
    else:
        option_text_match = any(
            option.id.upper() == normalized_correct and _normalize_answer(option.text) == normalized_student
            for option in question.options
        )
        correct = normalized_student == normalized_correct or option_text_match

    correct_answer = f"{question.answer} {question.unit}" if question.unit else question.answer
    return PracticeSubmitResponse(
        question_id=question.id,
        correct=correct,
        correct_answer=correct_answer,
        student_answer=payload.student_answer,
        analysis_steps=question.analysis_steps,
        mistake_tip="" if correct else _build_mistake_tip(question, payload.student_answer, normalized_student),
    )

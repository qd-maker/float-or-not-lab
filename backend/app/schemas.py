from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class BuoyancyState(str, Enum):
    FLOAT = "float"
    SUSPEND = "suspend"
    SINK = "sink"


class FormulaMode(str, Enum):
    ARCHIMEDES = "archimedes"
    WEIGHING = "weighing"
    FLOATING_BALANCE = "floating_balance"


class BuoyancyRequest(BaseModel):
    object_weight_n: float = Field(
        ...,
        ge=0,
        le=10000,
        description="物体重量，单位 N",
        examples=[8],
    )
    displaced_water_weight_n: float = Field(
        ...,
        ge=0,
        le=10000,
        description="物体完全浸没时排开水的重量，单位 N。根据阿基米德原理，它近似等于此时的最大浮力。",
        examples=[10],
    )


class BuoyancyResponse(BaseModel):
    state: BuoyancyState
    state_text: str
    object_weight_n: float
    buoyancy_n: float
    difference_n: float
    explanation: str
    student_tip: str


class FormulaCalculateRequest(BaseModel):
    mode: FormulaMode = Field(..., description="公式计算模式")
    liquid_density_kg_m3: Optional[float] = Field(
        default=None,
        ge=0,
        le=30000,
        description="液体密度，单位 kg/m³，阿基米德模式必填",
        examples=[1000],
    )
    displaced_volume_m3: Optional[float] = Field(
        default=None,
        ge=0,
        le=1000,
        description="排开液体体积，单位 m³，阿基米德模式必填",
        examples=[0.003],
    )
    g_n_kg: float = Field(
        default=10,
        description="重力常数，初中题通常只取 10 N/kg，少数题取 9.8 N/kg",
        examples=[10],
    )
    object_weight_n: Optional[float] = Field(
        default=None,
        ge=0,
        le=10000,
        description="物体重力，单位 N，称重法和漂浮平衡模式使用",
        examples=[12],
    )
    spring_scale_reading_n: Optional[float] = Field(
        default=None,
        ge=0,
        le=10000,
        description="物体浸入液体后弹簧测力计示数，单位 N，称重法必填",
        examples=[7],
    )

    @model_validator(mode="after")
    def validate_by_mode(self) -> "FormulaCalculateRequest":
        if self.mode == FormulaMode.ARCHIMEDES:
            if self.liquid_density_kg_m3 is None or self.displaced_volume_m3 is None:
                raise ValueError("阿基米德模式需要填写液体密度和排开液体体积。")
            if self.g_n_kg not in (10, 9.8):
                raise ValueError("初中浮力题中 g 通常只取 10 N/kg 或 9.8 N/kg。")

        if self.mode == FormulaMode.WEIGHING:
            if self.object_weight_n is None or self.spring_scale_reading_n is None:
                raise ValueError("称重法模式需要填写物体重力和弹簧测力计示数。")
            if self.spring_scale_reading_n > self.object_weight_n:
                raise ValueError("弹簧测力计示数不能大于物体在空气中的重力。")

        if self.mode == FormulaMode.FLOATING_BALANCE:
            if self.object_weight_n is None:
                raise ValueError("漂浮平衡模式需要填写物体重力。")

        return self


class FormulaCalculateResponse(BaseModel):
    mode: FormulaMode
    formula: str
    result_n: float
    steps: list[str]
    student_tip: str



class QuestionType(str, Enum):
    SINGLE_CHOICE = "single_choice"
    FILL_BLANK = "fill_blank"


class QuestionOption(BaseModel):
    id: str
    text: str


class PracticeQuestion(BaseModel):
    id: str
    type: QuestionType
    topic: str
    stem: str
    options: list[QuestionOption] = Field(default_factory=list)
    answer: str
    unit: Optional[str] = None
    analysis_steps: list[str]
    mistake_tip: str


class PracticeQuestionsResponse(BaseModel):
    questions: list[PracticeQuestion]


class PracticeSubmitRequest(BaseModel):
    question_id: str = Field(..., min_length=1)
    student_answer: str = Field(..., min_length=1, max_length=100)


class PracticeSubmitResponse(BaseModel):
    question_id: str
    correct: bool
    correct_answer: str
    student_answer: str
    analysis_steps: list[str]
    mistake_tip: str


class AiExplainMistakeRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    standard_answer: str = Field(..., min_length=1, max_length=200)
    student_answer: str = Field(..., min_length=1, max_length=200)
    knowledge_scope: str = Field(
        default="只允许解释浮力、阿基米德原理、称重法、漂浮平衡和初中基础浮沉判断",
        max_length=300,
    )


class AiExplainMistakeResponse(BaseModel):
    short_explanation: str
    hint: str
    next_step: str


class AiAskRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=1000)
    current_question: Optional[str] = Field(default=None, max_length=1000)
    standard_answer: Optional[str] = Field(default=None, max_length=200)
    student_answer: Optional[str] = Field(default=None, max_length=200)
    question_options: Optional[list[QuestionOption]] = Field(default=None, max_length=6)
    correct_option: Optional[str] = Field(default=None, max_length=20)
    selected_option_text: Optional[str] = Field(default=None, max_length=300)
    correct_answer_text: Optional[str] = Field(default=None, max_length=300)
    analysis_steps: list[str] = Field(default_factory=list, max_length=8)
    mistake_tip: Optional[str] = Field(default=None, max_length=500)


class AiAskResponse(BaseModel):
    answer: str
    scope: str
    next_prompt: str


VARIANT_TOPICS = {"判断浮沉", "称重法求浮力", "阿基米德公式", "漂浮平衡", "生活应用"}


class VariantQuestion(PracticeQuestion):
    id: str = Field(..., min_length=1, max_length=100)
    topic: str = Field(..., min_length=2, max_length=30)
    stem: str = Field(..., min_length=8, max_length=500)
    options: list[QuestionOption] = Field(default_factory=list, max_length=4)
    answer: str = Field(..., min_length=1, max_length=50)
    analysis_steps: list[str] = Field(..., min_length=2, max_length=5)
    mistake_tip: str = Field(..., min_length=4, max_length=300)

    @model_validator(mode="after")
    def validate_variant_structure(self) -> "VariantQuestion":
        if self.topic not in VARIANT_TOPICS:
            raise ValueError("变式题只能使用项目内置的五类浮力知识点。")
        if any(not step.strip() or len(step) > 300 for step in self.analysis_steps):
            raise ValueError("每一步解析都必须是 1 到 300 字的有效文本。")

        if self.type == QuestionType.SINGLE_CHOICE:
            if not 3 <= len(self.options) <= 4:
                raise ValueError("变式选择题必须包含 3 到 4 个选项。")
            option_ids = [option.id.strip().upper() for option in self.options]
            option_texts = [option.text.strip() for option in self.options]
            if any(option_id not in {"A", "B", "C", "D"} for option_id in option_ids):
                raise ValueError("选择题选项 ID 只能使用 A、B、C、D。")
            if any(not text or len(text) > 200 for text in option_texts):
                raise ValueError("选择题选项必须是 1 到 200 字的有效文本。")
            if len(set(option_ids)) != len(option_ids) or len(set(option_texts)) != len(option_texts):
                raise ValueError("选择题选项不能重复。")
            if self.answer.strip().upper() not in option_ids:
                raise ValueError("选择题答案必须对应一个有效选项 ID。")
            for option, option_id, option_text in zip(self.options, option_ids, option_texts):
                option.id = option_id
                option.text = option_text
            self.answer = self.answer.strip().upper()
        else:
            if self.options:
                raise ValueError("填空题不能包含选择题选项。")
            try:
                float(self.answer.strip().upper().replace("N", ""))
            except ValueError as exc:
                raise ValueError("变式填空题答案必须是数值。") from exc

        return self


class AiVariantGenerateRequest(BaseModel):
    original_question: PracticeQuestion
    student_answer: str = Field(..., min_length=1, max_length=100)
    mistake_tip: str = Field(..., min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_original_scope(self) -> "AiVariantGenerateRequest":
        if self.original_question.topic not in VARIANT_TOPICS:
            raise ValueError("原题不属于允许生成变式题的浮力知识范围。")
        return self


class AiVariantGenerateResponse(BaseModel):
    question: VariantQuestion
    focus: str = Field(..., min_length=4, max_length=200)
    source: Literal["ai", "fallback"]


class VariantSubmitRequest(BaseModel):
    question: VariantQuestion
    student_answer: str = Field(..., min_length=1, max_length=100)

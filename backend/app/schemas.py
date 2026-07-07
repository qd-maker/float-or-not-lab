from enum import Enum
from typing import Optional

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
        description="物体排开水的重量，单位 N。根据阿基米德原理，它近似等于浮力大小。",
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
        gt=0,
        le=20,
        description="重力常数，初中题常取 10 N/kg",
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

from enum import Enum

from pydantic import BaseModel, Field


class BuoyancyState(str, Enum):
    FLOAT = "float"
    SUSPEND = "suspend"
    SINK = "sink"


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

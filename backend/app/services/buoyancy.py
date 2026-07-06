from app.schemas import BuoyancyRequest, BuoyancyResponse, BuoyancyState


def _almost_equal(left: float, right: float) -> bool:
    """教育场景下的近似相等判断，避免小数输入导致悬浮很难触发。"""
    tolerance = max(0.05, max(abs(left), abs(right), 1.0) * 0.02)
    return abs(left - right) <= tolerance


def calculate_buoyancy(payload: BuoyancyRequest) -> BuoyancyResponse:
    object_weight = round(payload.object_weight_n, 3)
    buoyancy = round(payload.displaced_water_weight_n, 3)
    difference = round(buoyancy - object_weight, 3)

    if _almost_equal(buoyancy, object_weight):
        return BuoyancyResponse(
            state=BuoyancyState.SUSPEND,
            state_text="悬浮",
            object_weight_n=object_weight,
            buoyancy_n=buoyancy,
            difference_n=difference,
            explanation="排开水的重量和物体重量差不多，浮力和重力平衡，所以物体会悬浮在水中。",
            student_tip="看箭头：向上和向下的箭头差不多长，说明两个力差不多平衡。",
        )

    if buoyancy > object_weight:
        return BuoyancyResponse(
            state=BuoyancyState.FLOAT,
            state_text="上浮",
            object_weight_n=object_weight,
            buoyancy_n=buoyancy,
            difference_n=difference,
            explanation="排开水的重量比物体重量大，浮力能托住物体，所以物体会上浮。",
            student_tip="看箭头：向上的浮力箭头更长，说明水给物体的托力更大。",
        )

    return BuoyancyResponse(
        state=BuoyancyState.SINK,
        state_text="下沉",
        object_weight_n=object_weight,
        buoyancy_n=buoyancy,
        difference_n=difference,
        explanation="排开水的重量比物体重量小，浮力不够托住物体，所以物体会下沉。",
        student_tip="看箭头：向下的重力箭头更长，说明物体更容易往下运动。",
    )

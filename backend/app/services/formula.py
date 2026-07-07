from app.schemas import FormulaCalculateRequest, FormulaCalculateResponse, FormulaMode


def _format_number(value: float) -> str:
    rounded = round(value, 4)
    if rounded == int(rounded):
        return str(int(rounded))
    return str(rounded).rstrip("0").rstrip(".")


def _round_force(value: float) -> float:
    return round(value, 4)


def calculate_formula(payload: FormulaCalculateRequest) -> FormulaCalculateResponse:
    if payload.mode == FormulaMode.ARCHIMEDES:
        density = payload.liquid_density_kg_m3 or 0
        volume = payload.displaced_volume_m3 or 0
        result = _round_force(density * payload.g_n_kg * volume)
        return FormulaCalculateResponse(
            mode=payload.mode,
            formula="F浮 = ρ液 g V排",
            result_n=result,
            steps=[
                "F浮 = ρ液 g V排",
                f"F浮 = {_format_number(density)} × {_format_number(payload.g_n_kg)} × {_format_number(volume)}",
                f"F浮 = {_format_number(result)} N",
            ],
            student_tip="排开液体的体积越大，液体密度越大，物体受到的浮力通常越大。",
        )

    if payload.mode == FormulaMode.WEIGHING:
        object_weight = payload.object_weight_n or 0
        reading = payload.spring_scale_reading_n or 0
        result = _round_force(object_weight - reading)
        return FormulaCalculateResponse(
            mode=payload.mode,
            formula="F浮 = G物 - F示",
            result_n=result,
            steps=[
                "F浮 = G物 - F示",
                f"F浮 = {_format_number(object_weight)} - {_format_number(reading)}",
                f"F浮 = {_format_number(result)} N",
            ],
            student_tip="物体浸入水中后，测力计少显示的那部分力，就是水给物体的浮力。",
        )

    object_weight = payload.object_weight_n or 0
    result = _round_force(object_weight)
    return FormulaCalculateResponse(
        mode=payload.mode,
        formula="漂浮时 F浮 = G物",
        result_n=result,
        steps=[
            "物体漂浮时处于平衡状态",
            "F浮 = G物",
            f"F浮 = {_format_number(result)} N",
        ],
        student_tip="漂浮不代表没有重力，而是浮力刚好托住了物体。",
    )

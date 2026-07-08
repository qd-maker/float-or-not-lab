from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_calculate_float():
    response = client.post(
        "/api/buoyancy/calculate",
        json={"object_weight_n": 8, "displaced_water_weight_n": 10},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "float"
    assert data["state_text"] == "上浮"


def test_calculate_suspend():
    response = client.post(
        "/api/buoyancy/calculate",
        json={"object_weight_n": 8, "displaced_water_weight_n": 8},
    )
    assert response.status_code == 200
    assert response.json()["state"] == "suspend"


def test_calculate_sink():
    response = client.post(
        "/api/buoyancy/calculate",
        json={"object_weight_n": 10, "displaced_water_weight_n": 6},
    )
    assert response.status_code == 200
    assert response.json()["state"] == "sink"


def test_reject_negative_weight():
    response = client.post(
        "/api/buoyancy/calculate",
        json={"object_weight_n": -1, "displaced_water_weight_n": 6},
    )
    assert response.status_code == 422


def test_formula_archimedes():
    response = client.post(
        "/api/buoyancy/formula/calculate",
        json={
            "mode": "archimedes",
            "liquid_density_kg_m3": 1000,
            "displaced_volume_m3": 0.003,
            "g_n_kg": 10,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result_n"] == 30
    assert data["formula"] == "F浮 = ρ液 g V排"
    assert len(data["steps"]) == 3


def test_formula_weighing():
    response = client.post(
        "/api/buoyancy/formula/calculate",
        json={
            "mode": "weighing",
            "object_weight_n": 12,
            "spring_scale_reading_n": 7,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result_n"] == 5
    assert data["formula"] == "F浮 = G物 - F示"


def test_formula_floating_balance():
    response = client.post(
        "/api/buoyancy/formula/calculate",
        json={"mode": "floating_balance", "object_weight_n": 8},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result_n"] == 8
    assert data["formula"] == "漂浮时 F浮 = G物"


def test_formula_reject_invalid_weighing_reading():
    response = client.post(
        "/api/buoyancy/formula/calculate",
        json={
            "mode": "weighing",
            "object_weight_n": 6,
            "spring_scale_reading_n": 8,
        },
    )
    assert response.status_code == 422



def test_get_practice_questions():
    response = client.get("/api/practice/questions")
    assert response.status_code == 200
    data = response.json()
    assert len(data["questions"]) >= 10
    topics = {question["topic"] for question in data["questions"]}
    assert "判断浮沉" in topics
    assert "称重法求浮力" in topics
    assert "阿基米德公式" in topics
    assert "漂浮平衡" in topics
    assert "生活应用" in topics


def test_submit_practice_answer_correct():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-weighing-001", "student_answer": "5 N"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is True
    assert data["correct_answer"] == "5 N"
    assert data["mistake_tip"] == ""


def test_submit_practice_answer_wrong():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-weighing-001", "student_answer": "7"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert data["correct_answer"] == "5 N"
    assert len(data["analysis_steps"]) == 3
    assert data["mistake_tip"]


def test_submit_practice_answer_invalid_question():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "missing", "student_answer": "A"},
    )
    assert response.status_code == 404


def test_ai_explain_mistake_fallback(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/api/ai/explain-mistake",
        json={
            "question": "一个物体在空气中重 12 N，浸没在水中时弹簧测力计示数为 7 N，物体受到的浮力是多少？",
            "standard_answer": "5 N",
            "student_answer": "7 N",
            "knowledge_scope": "只允许解释浮力、阿基米德原理、称重法、漂浮平衡",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["short_explanation"]
    assert data["hint"]
    assert data["next_step"]


def test_ai_ask_fallback(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/api/ai/ask",
        json={
            "message": "为什么漂浮时浮力等于重力？",
            "current_question": "一块木块漂浮在水面上，木块重 5 N，它受到的浮力是多少？",
            "standard_answer": "5 N",
            "student_answer": "8 N",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]
    assert data["scope"]
    assert data["next_prompt"]


def test_ai_ask_stream_fallback(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/api/ai/ask/stream",
        json={
            "message": "为什么漂浮时浮力等于重力？",
            "current_question": "一块木块漂浮在水面上，木块重 5 N，它受到的浮力是多少？",
            "standard_answer": "5 N",
            "student_answer": "8 N",
        },
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "event: chunk" in response.text
    assert "event: done" in response.text


def test_archimedes_mistake_missing_g():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-archimedes-001", "student_answer": "3"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert "漏乘" in data["mistake_tip"]
    assert "g" in data["mistake_tip"]


def test_archimedes_mistake_missing_density():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-archimedes-001", "student_answer": "0.03"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert "漏乘" in data["mistake_tip"]
    assert "密度" in data["mistake_tip"]


def test_archimedes_mistake_unit_scale():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-archimedes-001", "student_answer": "30000"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert "m³" in data["mistake_tip"]


def test_weighing_mistake_uses_reading_as_buoyancy():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-weighing-001", "student_answer": "7"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert "测力计示数" in data["mistake_tip"]


def test_weighing_mistake_adds_two_forces():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-weighing-001", "student_answer": "19"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert "相加" in data["mistake_tip"]


def test_floating_mistake_thinks_buoyancy_greater_than_weight():
    response = client.post(
        "/api/practice/submit",
        json={"question_id": "q-floating-001", "student_answer": "8"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert "F浮 = G物" in data["mistake_tip"]

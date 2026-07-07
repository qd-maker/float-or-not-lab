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

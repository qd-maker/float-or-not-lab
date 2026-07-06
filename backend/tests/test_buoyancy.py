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

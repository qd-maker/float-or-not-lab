import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    BuoyancyRequest,
    BuoyancyResponse,
    FormulaCalculateRequest,
    FormulaCalculateResponse,
)
from app.services.buoyancy import calculate_buoyancy
from app.services.formula import calculate_formula


app = FastAPI(
    title="Float or Not Lab API",
    description="浮不浮实验室后端 API",
    version="0.2.0",
)

cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
cors_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "float-or-not-lab-api"}


@app.post("/api/buoyancy/calculate", response_model=BuoyancyResponse)
def calculate(payload: BuoyancyRequest) -> BuoyancyResponse:
    return calculate_buoyancy(payload)


@app.post("/api/buoyancy/formula/calculate", response_model=FormulaCalculateResponse)
def calculate_formula_endpoint(payload: FormulaCalculateRequest) -> FormulaCalculateResponse:
    return calculate_formula(payload)

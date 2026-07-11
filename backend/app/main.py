import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import load_env_files
from app.schemas import (
    AiAskRequest,
    AiAskResponse,
    AiVariantGenerateRequest,
    AiVariantGenerateResponse,
    AiExplainMistakeRequest,
    AiExplainMistakeResponse,
    BuoyancyRequest,
    BuoyancyResponse,
    FormulaCalculateRequest,
    FormulaCalculateResponse,
    PracticeQuestionsResponse,
    PracticeSubmitRequest,
    PracticeSubmitResponse,
    VariantSubmitRequest,
)
from app.services.ai_tutor import ask_physics_question, explain_mistake, stream_physics_question
from app.services.buoyancy import calculate_buoyancy
from app.services.formula import calculate_formula
from app.services.practice import list_questions, submit_answer, submit_variant_answer
from app.services.variant import generate_variant


load_env_files()

app = FastAPI(
    title="Float or Not Lab API",
    description="浮不浮实验室后端 API",
    version="0.6.0",
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



@app.get("/api/practice/questions", response_model=PracticeQuestionsResponse)
def get_practice_questions() -> PracticeQuestionsResponse:
    return list_questions()


@app.post("/api/practice/submit", response_model=PracticeSubmitResponse)
def submit_practice_answer(payload: PracticeSubmitRequest) -> PracticeSubmitResponse:
    return submit_answer(payload)


@app.post("/api/ai/explain-mistake", response_model=AiExplainMistakeResponse)
def explain_mistake_endpoint(payload: AiExplainMistakeRequest) -> AiExplainMistakeResponse:
    return explain_mistake(payload)


@app.post("/api/ai/ask", response_model=AiAskResponse)
def ask_ai_tutor_endpoint(payload: AiAskRequest) -> AiAskResponse:
    return ask_physics_question(payload)


@app.post("/api/ai/ask/stream")
def ask_ai_tutor_stream_endpoint(payload: AiAskRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_physics_question(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/ai/generate-variant", response_model=AiVariantGenerateResponse)
def generate_ai_variant_endpoint(payload: AiVariantGenerateRequest) -> AiVariantGenerateResponse:
    return generate_variant(payload)


@app.post("/api/practice/variant/submit", response_model=PracticeSubmitResponse)
def submit_variant_answer_endpoint(payload: VariantSubmitRequest) -> PracticeSubmitResponse:
    return submit_variant_answer(payload)

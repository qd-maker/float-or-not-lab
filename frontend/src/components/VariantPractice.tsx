import { useState } from "react";
import {
  AiVariantGenerateResult,
  localSubmitPractice,
  localVariantQuestion,
  PracticeQuestion,
  PracticeSubmitResult,
} from "../lib/practice";

interface VariantPracticeProps {
  apiBaseUrl: string;
  originalQuestion: PracticeQuestion;
  originalResult: PracticeSubmitResult;
  onResult: (result: PracticeSubmitResult, question: PracticeQuestion) => void;
}

export function VariantPractice({ apiBaseUrl, originalQuestion, originalResult, onResult }: VariantPracticeProps) {
  const [generated, setGenerated] = useState<AiVariantGenerateResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<PracticeSubmitResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function generateVariant() {
    setGenerating(true);
    setError("");
    setAnswer("");
    setResult(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/generate-variant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_question: originalQuestion,
          student_answer: originalResult.student_answer,
          mistake_tip: originalResult.mistake_tip,
        }),
      });
      if (!response.ok) {
        throw new Error("Variant generation failed");
      }
      setGenerated((await response.json()) as AiVariantGenerateResult);
    } catch {
      setGenerated(localVariantQuestion(originalQuestion));
    } finally {
      setGenerating(false);
    }
  }

  function updateAnswer(nextAnswer: string) {
    setAnswer(nextAnswer);
    setResult(null);
    setError("");
  }

  async function submitVariant() {
    if (!generated) {
      return;
    }
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      setError("先完成这道强化题，再提交答案。");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/practice/variant/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: generated.question, student_answer: trimmedAnswer }),
      });
      if (!response.ok) {
        throw new Error("Variant submit failed");
      }
      const nextResult = (await response.json()) as PracticeSubmitResult;
      setResult(nextResult);
      onResult(nextResult, generated.question);
    } catch {
      const nextResult = localSubmitPractice(generated.question, trimmedAnswer);
      setResult(nextResult);
      onResult(nextResult, generated.question);
    } finally {
      setSubmitting(false);
    }
  }

  if (!generated) {
    return (
      <div className="variant-entry">
        <div>
          <strong>讲完马上练，才更容易记住</strong>
          <p>根据刚才的错因，换一组条件再做一次。</p>
        </div>
        <button className="secondary-action" type="button" onClick={generateVariant} disabled={generating}>
          {generating && <span className="loading-dot" aria-hidden="true" />}
          {generating ? "正在准备同类题..." : "再练一道同类题"}
        </button>
      </div>
    );
  }

  const question = generated.question;
  return (
    <section className="variant-practice" aria-labelledby="variant-question-title">
      <div className="variant-heading">
        <span>针对性强化</span>
        <strong>{question.topic}</strong>
      </div>
      <p className="variant-focus">{generated.focus}</p>
      <h4 id="variant-question-title">{question.stem}</h4>

      {question.type === "single_choice" ? (
        <div className="answer-options" role="group" aria-label="选择强化题答案">
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={answer === option.id ? "answer-option is-selected" : "answer-option"}
              aria-pressed={answer === option.id}
              onClick={() => updateAnswer(option.id)}
            >
              <span>{option.id}</span>
              <strong>{option.text}</strong>
            </button>
          ))}
        </div>
      ) : (
        <label className="field variant-answer-field" htmlFor={`variant-answer-${question.id}`}>
          <span>你的答案{question.unit ? `（单位：${question.unit}，可只填数字）` : ""}</span>
          <input
            id={`variant-answer-${question.id}`}
            type="text"
            inputMode="decimal"
            value={answer}
            placeholder="写下你的答案"
            onChange={(event) => updateAnswer(event.target.value)}
          />
        </label>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {!result && (
        <button className="primary-action variant-submit" type="button" onClick={submitVariant} disabled={submitting}>
          {submitting && <span className="loading-dot" aria-hidden="true" />}
          {submitting ? "正在判断..." : "提交强化题"}
        </button>
      )}

      {result && (
        <div className="variant-result" aria-live="polite">
          <div className={result.correct ? "variant-result-title is-correct" : "variant-result-title is-wrong"}>
            <strong>{result.correct ? "强化完成" : "再检查一次"}</strong>
            <span>标准答案：{result.correct_answer}</span>
          </div>
          <ol>
            {result.analysis_steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {!result.correct && <p>{result.mistake_tip}</p>}
          <button className="text-action" type="button" onClick={generateVariant} disabled={generating}>
            {generating ? "正在换题..." : "换一道同类题"}
          </button>
        </div>
      )}
    </section>
  );
}

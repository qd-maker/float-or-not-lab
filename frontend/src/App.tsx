import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  BuoyancyResult,
  FormulaMode,
  FormulaResult,
  FormulaValues,
  localCalculate,
  localCalculateFormula,
  presets,
} from "./lib/buoyancy";
import {
  AiAskResult,
  fallbackPracticeQuestions,
  localAiAskResult,
  localSubmitPractice,
  PracticeQuestion,
  PracticeSubmitResult,
} from "./lib/practice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const MathMarkdown = lazy(() =>
  import("./components/MathMarkdown").then((module) => ({ default: module.MathMarkdown }))
);

const formulaModeLabels: Record<FormulaMode, { title: string; subtitle: string; when: string }> = {
  archimedes: { title: "阿基米德原理", subtitle: "F浮 = ρ液 g V排", when: "看到液体密度、排开体积时用" },
  weighing: { title: "称重法", subtitle: "F浮 = G物 - F示", when: "看到空气中重力、水中测力计示数时用" },
  floating_balance: { title: "漂浮平衡", subtitle: "F浮 = G物", when: "题目明确说物体漂浮时用" },
};

const defaultAiQuickPrompts = ["这题先找哪些已知量？", "为什么要用 m³ 作单位？", "如果换成盐水，浮力会怎样？"];
const PRACTICE_STATS_STORAGE_KEY = "float-lab-practice-stats";

interface PracticeRecord {
  questionId: string;
  attempts: number;
  correctAttempts: number;
  lastCorrect: boolean;
  everWrong: boolean;
  lastAnswer: string;
  updatedAt: string;
}

interface PracticeStats {
  version: 2;
  totalAttempts: number;
  correctAttempts: number;
  records: Record<string, PracticeRecord>;
}

const emptyPracticeStats: PracticeStats = {
  version: 2,
  totalAttempts: 0,
  correctAttempts: 0,
  records: {},
};

const formulaExamples: Record<FormulaMode, Array<{ label: string; values: Partial<FormulaValues> }>> = {
  archimedes: [
    { label: "水中排开 0.003 m³", values: { liquidDensity: 1000, displacedVolume: 0.003, g: 10 } },
    { label: "盐水中排开 0.002 m³", values: { liquidDensity: 1100, displacedVolume: 0.002, g: 10 } },
  ],
  weighing: [
    { label: "12 N 物体，水中示数 7 N", values: { weighingObjectWeight: 12, springScaleReading: 7 } },
    { label: "8 N 物体，水中示数 5 N", values: { weighingObjectWeight: 8, springScaleReading: 5 } },
  ],
  floating_balance: [
    { label: "5 N 木块漂浮", values: { floatingObjectWeight: 5 } },
    { label: "8000 N 小船漂浮", values: { floatingObjectWeight: 8000 } },
  ],
};

function getQuestionNavLabel(question: PracticeQuestion, index: number) {
  return `${question.topic} - ${String(index + 1).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadPracticeStats(): PracticeStats {
  try {
    const raw = window.localStorage.getItem(PRACTICE_STATS_STORAGE_KEY);
    if (!raw) {
      return emptyPracticeStats;
    }
    const parsed = JSON.parse(raw) as Partial<PracticeStats> & {
      answered?: number;
      correct?: number;
      wrongQuestionIds?: string[];
    };

    if (parsed.version === 2 && parsed.records && typeof parsed.records === "object") {
      return {
        version: 2,
        totalAttempts: Number.isFinite(parsed.totalAttempts) ? Number(parsed.totalAttempts) : 0,
        correctAttempts: Number.isFinite(parsed.correctAttempts) ? Number(parsed.correctAttempts) : 0,
        records: parsed.records,
      };
    }

    const migratedRecords = Object.fromEntries(
      (Array.isArray(parsed.wrongQuestionIds) ? parsed.wrongQuestionIds : []).map((questionId) => [
        questionId,
        {
          questionId,
          attempts: 1,
          correctAttempts: 0,
          lastCorrect: false,
          everWrong: true,
          lastAnswer: "",
          updatedAt: new Date(0).toISOString(),
        },
      ])
    );
    return {
      version: 2,
      totalAttempts: Number.isFinite(parsed.answered) ? Number(parsed.answered) : 0,
      correctAttempts: Number.isFinite(parsed.correct) ? Number(parsed.correct) : 0,
      records: migratedRecords,
    };
  } catch {
    return emptyPracticeStats;
  }
}

function formatAccuracy(stats: PracticeStats) {
  if (stats.totalAttempts === 0) {
    return "还没开始";
  }
  return `${Math.round((stats.correctAttempts / stats.totalAttempts) * 100)}%`;
}

function App() {
  const [objectWeight, setObjectWeight] = useState(8);
  const [displacedWaterWeight, setDisplacedWaterWeight] = useState(10);
  const [result, setResult] = useState<BuoyancyResult>(() => localCalculate(8, 10));
  const [isLoading, setIsLoading] = useState(false);

  const [formulaMode, setFormulaMode] = useState<FormulaMode>("archimedes");
  const [formulaValues, setFormulaValues] = useState<FormulaValues>({
    liquidDensity: 1000,
    displacedVolume: 0.003,
    g: 10,
    weighingObjectWeight: 12,
    springScaleReading: 7,
    floatingObjectWeight: 8,
  });
  const [formulaResult, setFormulaResult] = useState<FormulaResult>(() =>
    localCalculateFormula("archimedes", {
      liquidDensity: 1000,
      displacedVolume: 0.003,
      g: 10,
      weighingObjectWeight: 12,
      springScaleReading: 7,
      floatingObjectWeight: 8,
    })
  );
  const [formulaLoading, setFormulaLoading] = useState(false);
  const [formulaError, setFormulaError] = useState("");

  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>(fallbackPracticeQuestions);
  const [activePracticeTopic, setActivePracticeTopic] = useState(fallbackPracticeQuestions[0]?.topic ?? "");
  const [selectedQuestionId, setSelectedQuestionId] = useState(fallbackPracticeQuestions[0]?.id ?? "");
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceResult, setPracticeResult] = useState<PracticeSubmitResult | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [practiceStats, setPracticeStats] = useState<PracticeStats>(() => loadPracticeStats());
  const [practiceView, setPracticeView] = useState<"all" | "mistakes">("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAskResult, setAiAskResult] = useState<AiAskResult | null>(null);
  const [aiAskLoading, setAiAskLoading] = useState(false);
  const [aiAskError, setAiAskError] = useState("");

  const forceScale = useMemo(() => {
    const maxForce = Math.max(objectWeight, displacedWaterWeight, 1);
    return {
      gravityHeight: clamp((objectWeight / maxForce) * 120, 34, 130),
      buoyancyHeight: clamp((displacedWaterWeight / maxForce) * 120, 34, 130),
    };
  }, [objectWeight, displacedWaterWeight]);

  const selectedQuestion = useMemo(
    () => practiceQuestions.find((question) => question.id === selectedQuestionId) ?? practiceQuestions[0],
    [practiceQuestions, selectedQuestionId]
  );

  const groupedPracticeQuestions = useMemo(() => {
    const groups = new Map<string, PracticeQuestion[]>();
    for (const question of practiceQuestions) {
      const current = groups.get(question.topic) ?? [];
      current.push(question);
      groups.set(question.topic, current);
    }
    return Array.from(groups.entries());
  }, [practiceQuestions]);

  const mistakeQuestionIds = useMemo(
    () =>
      new Set(
        Object.values(practiceStats.records)
          .filter((record) => record.everWrong)
          .map((record) => record.questionId)
      ),
    [practiceStats.records]
  );

  const pendingCorrectionIds = useMemo(
    () =>
      new Set(
        Object.values(practiceStats.records)
          .filter((record) => record.everWrong && !record.lastCorrect)
          .map((record) => record.questionId)
      ),
    [practiceStats.records]
  );

  const visiblePracticeQuestions = useMemo(() => {
    if (practiceView === "mistakes") {
      return practiceQuestions.filter((question) => mistakeQuestionIds.has(question.id));
    }
    if (!activePracticeTopic) {
      return practiceQuestions;
    }
    return practiceQuestions.filter((question) => question.topic === activePracticeTopic);
  }, [activePracticeTopic, mistakeQuestionIds, practiceQuestions, practiceView]);

  const learningSummary = useMemo(() => {
    const records = Object.values(practiceStats.records);
    const topicMap = new Map<string, { attempts: number; correct: number }>();

    for (const record of records) {
      const question = practiceQuestions.find((item) => item.id === record.questionId);
      if (!question) {
        continue;
      }
      const current = topicMap.get(question.topic) ?? { attempts: 0, correct: 0 };
      current.attempts += record.attempts;
      current.correct += record.correctAttempts;
      topicMap.set(question.topic, current);
    }

    const topics = Array.from(topicMap.entries()).map(([topic, value]) => ({
      topic,
      attempts: value.attempts,
      accuracy: value.attempts === 0 ? 0 : value.correct / value.attempts,
    }));
    const weakest = [...topics].sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts)[0];
    const strongest = [...topics].sort((left, right) => right.accuracy - left.accuracy || right.attempts - left.attempts)[0];

    return {
      completed: records.length,
      pending: pendingCorrectionIds.size,
      weakest: weakest?.topic ?? "等待练习",
      strongest: strongest?.topic ?? "等待练习",
      topicCount: topics.length,
      progress: practiceQuestions.length === 0 ? 0 : Math.round((records.length / practiceQuestions.length) * 100),
    };
  }, [pendingCorrectionIds, practiceQuestions, practiceStats.records]);

  const aiQuickPrompts = useMemo(() => {
    if (!selectedQuestion) {
      return defaultAiQuickPrompts;
    }

    if (practiceResult && !practiceResult.correct) {
      return [
        `我答成了 ${practiceResult.student_answer}，为什么不对？`,
        "请只提示我这道题的易错点",
        "这题下一步应该先算什么？",
      ];
    }

    if (practiceResult?.correct) {
      return ["帮我总结这题的解题模板", "出一道相似的浮力题", "如果条件变一下，答案会怎么变？"];
    }

    return defaultAiQuickPrompts;
  }, [practiceResult, selectedQuestion]);

  const dynamicAiPrompts = useMemo(() => {
    if (practiceResult && !practiceResult.correct) {
      return [
        `我选了${practiceResult.student_answer}，为什么不对？`,
        "请提示我这道题的易错点",
        "能换个生活中的例子解释吗？"
      ];
    }
    return aiQuickPrompts;
  }, [practiceResult, aiQuickPrompts]);

  const objectClassName = `lab-object lab-object--${result.state}`;
  const practiceAccuracy = formatAccuracy(practiceStats);

  useEffect(() => {
    let cancelled = false;

    async function loadPracticeQuestions() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/practice/questions`);
        if (!response.ok) {
          throw new Error("Practice API request failed");
        }
        const data = (await response.json()) as { questions: PracticeQuestion[] };
        if (!data.questions?.length || cancelled) {
          return;
        }
        setPracticeQuestions(data.questions);
        setActivePracticeTopic(data.questions[0].topic);
        setSelectedQuestionId(data.questions[0].id);
      } catch {
        // 后端不可用时继续使用内置题库。
      }
    }

    loadPracticeQuestions();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateFormulaValue(key: keyof FormulaValues, value: number) {
    setFormulaValues((current) => ({ ...current, [key]: value }));
  }

  function applyFormulaExample(values: Partial<FormulaValues>) {
    const nextValues = { ...formulaValues, ...values };
    setFormulaValues(nextValues);
    setFormulaError("");
    setFormulaResult(localCalculateFormula(formulaMode, nextValues));
  }

  function buildFormulaPayload() {
    if (formulaMode === "archimedes") {
      return {
        mode: formulaMode,
        liquid_density_kg_m3: formulaValues.liquidDensity,
        displaced_volume_m3: formulaValues.displacedVolume,
        g_n_kg: formulaValues.g,
      };
    }

    if (formulaMode === "weighing") {
      return {
        mode: formulaMode,
        object_weight_n: formulaValues.weighingObjectWeight,
        spring_scale_reading_n: formulaValues.springScaleReading,
      };
    }

    return {
      mode: formulaMode,
      object_weight_n: formulaValues.floatingObjectWeight,
    };
  }

  async function runExperiment(nextObjectWeight = objectWeight, nextDisplacedWaterWeight = displacedWaterWeight) {
    setObjectWeight(nextObjectWeight);
    setDisplacedWaterWeight(nextDisplacedWaterWeight);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/buoyancy/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object_weight_n: nextObjectWeight,
          displaced_water_weight_n: nextDisplacedWaterWeight,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = (await response.json()) as BuoyancyResult;
      setResult(data);
    } catch {
      setResult(localCalculate(nextObjectWeight, nextDisplacedWaterWeight));
    } finally {
      setIsLoading(false);
    }
  }

  async function runFormula() {
    setFormulaLoading(true);
    setFormulaError("");

    if (formulaMode === "weighing" && formulaValues.springScaleReading > formulaValues.weighingObjectWeight) {
      setFormulaError("称重法中，弹簧测力计示数不能大于物体在空气中的重力。");
      setFormulaLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/buoyancy/formula/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildFormulaPayload()),
      });

      if (!response.ok) {
        throw new Error("Formula API request failed");
      }

      const data = (await response.json()) as FormulaResult;
      setFormulaResult(data);
    } catch {
      setFormulaResult(localCalculateFormula(formulaMode, formulaValues));
    } finally {
      setFormulaLoading(false);
    }
  }

  function selectPracticeQuestion(questionId: string) {
    const nextQuestion = practiceQuestions.find((question) => question.id === questionId);
    if (nextQuestion) {
      setActivePracticeTopic(nextQuestion.topic);
    }
    setSelectedQuestionId(questionId);
    setPracticeAnswer("");
    setPracticeResult(null);
    setPracticeError("");
    setAiQuestion("");
    setAiAskResult(null);
    setAiAskError("");
  }

  function selectPracticeTopic(topic: string) {
    const firstQuestion = practiceQuestions.find((question) => question.topic === topic);
    setPracticeView("all");
    setActivePracticeTopic(topic);
    if (firstQuestion) {
      selectPracticeQuestion(firstQuestion.id);
    }
  }

  function updatePracticeAnswer(nextAnswer: string) {
    setPracticeAnswer(nextAnswer);
    setPracticeError("");
    if (practiceResult) {
      setPracticeResult(null);
      setAiAskResult(null);
    }
  }

  function selectNextPracticeQuestion() {
    if (!selectedQuestion || practiceQuestions.length === 0) {
      return;
    }

    const visibleIndex = visiblePracticeQuestions.findIndex((question) => question.id === selectedQuestion.id);
    if (visibleIndex >= 0 && visibleIndex < visiblePracticeQuestions.length - 1) {
      selectPracticeQuestion(visiblePracticeQuestions[visibleIndex + 1].id);
      return;
    }

    const currentIndex = practiceQuestions.findIndex((question) => question.id === selectedQuestion.id);
    const nextQuestion = practiceQuestions[(currentIndex + 1) % practiceQuestions.length] ?? practiceQuestions[0];
    selectPracticeQuestion(nextQuestion.id);
  }

  function resetPracticeStats() {
    setPracticeStats(emptyPracticeStats);
    setPracticeView("all");
    window.localStorage.removeItem(PRACTICE_STATS_STORAGE_KEY);
  }

  function selectPracticeView(view: "all" | "mistakes") {
    setPracticeView(view);
    if (view === "mistakes") {
      const firstMistake = practiceQuestions.find((question) => mistakeQuestionIds.has(question.id));
      if (firstMistake) {
        selectPracticeQuestion(firstMistake.id);
        setPracticeView("mistakes");
      }
      return;
    }

    const firstQuestion = practiceQuestions.find((question) => question.topic === activePracticeTopic) ?? practiceQuestions[0];
    if (firstQuestion) {
      selectPracticeQuestion(firstQuestion.id);
    }
  }

  function recordPracticeResult(nextResult: PracticeSubmitResult) {
    setPracticeStats((current) => {
      const previous = current.records[nextResult.question_id];
      const nextRecord: PracticeRecord = {
        questionId: nextResult.question_id,
        attempts: (previous?.attempts ?? 0) + 1,
        correctAttempts: (previous?.correctAttempts ?? 0) + (nextResult.correct ? 1 : 0),
        lastCorrect: nextResult.correct,
        everWrong: (previous?.everWrong ?? false) || !nextResult.correct,
        lastAnswer: nextResult.student_answer,
        updatedAt: new Date().toISOString(),
      };
      const nextStats: PracticeStats = {
        version: 2,
        totalAttempts: current.totalAttempts + 1,
        correctAttempts: current.correctAttempts + (nextResult.correct ? 1 : 0),
        records: {
          ...current.records,
          [nextResult.question_id]: nextRecord,
        },
      };
      window.localStorage.setItem(PRACTICE_STATS_STORAGE_KEY, JSON.stringify(nextStats));
      return nextStats;
    });
  }

  function selectedOptionText(question: PracticeQuestion | undefined, answer: string) {
    if (!question || question.type !== "single_choice") {
      return undefined;
    }
    const option = question.options.find((item) => item.id === answer);
    return option ? `${option.id}. ${option.text}` : answer;
  }

  function correctAnswerText(question: PracticeQuestion | undefined) {
    if (!question) {
      return undefined;
    }
    if (question.type !== "single_choice") {
      return question.unit ? `${question.answer} ${question.unit}` : question.answer;
    }
    const option = question.options.find((item) => item.id === question.answer);
    return option ? `${option.id}. ${option.text}` : question.answer;
  }

  async function submitPracticeAnswer() {
    if (!selectedQuestion) {
      return;
    }

    const trimmedAnswer = practiceAnswer.trim();
    setPracticeError("");
    if (!trimmedAnswer) {
      setPracticeError("先写下你的答案，再提交。选择题可以直接点选项。");
      return;
    }

    setPracticeLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/practice/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: selectedQuestion.id, student_answer: trimmedAnswer }),
      });

      if (!response.ok) {
        throw new Error("Practice submit request failed");
      }

      const data = (await response.json()) as PracticeSubmitResult;
      setPracticeResult(data);
      recordPracticeResult(data);
    } catch {
      const localResult = localSubmitPractice(selectedQuestion, trimmedAnswer);
      setPracticeResult(localResult);
      recordPracticeResult(localResult);
    } finally {
      setPracticeLoading(false);
    }
  }

  async function askPhysicsTutor(messageOverride?: string) {
    if (!selectedQuestion) {
      return;
    }

    const message = (messageOverride ?? aiQuestion).trim();
    setAiAskError("");

    if (!message) {
      setAiAskError("先写下你想问 AI 小老师的物理问题。");
      return;
    }

    setAiQuestion(message);
    setAiAskLoading(true);
    setAiAskResult({
      answer: "",
      scope: "AI 小老师",
      next_prompt: "还能问：这道题还有什么易错点？",
    });

    function applySseEvent(rawEvent: string) {
      const dataLines = rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      if (dataLines.length === 0) {
        return;
      }

      try {
        const data = JSON.parse(dataLines.join("\n")) as Partial<AiAskResult> & { delta?: string };
        if (typeof data.delta === "string") {
          setAiAskResult((current) => ({
            answer: `${current?.answer ?? ""}${data.delta}`,
            scope: current?.scope ?? "AI 小老师",
            next_prompt: current?.next_prompt ?? "还能问：这道题还有什么易错点？",
          }));
        }
        if (data.scope || data.next_prompt) {
          setAiAskResult((current) => ({
            answer: current?.answer ?? "",
            scope: data.scope ?? current?.scope ?? "AI 小老师",
            next_prompt: data.next_prompt ?? current?.next_prompt ?? "还能问：这道题还有什么易错点？",
          }));
        }
      } catch {
        // 忽略单个格式异常的流片段，保留已经显示出来的内容。
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          current_question: selectedQuestion.stem,
          question_options: selectedQuestion.options,
          standard_answer: practiceResult?.correct_answer,
          student_answer: practiceResult?.student_answer,
          correct_option: selectedQuestion.answer,
          selected_option_text: selectedOptionText(selectedQuestion, practiceResult?.student_answer ?? practiceAnswer),
          correct_answer_text: correctAnswerText(selectedQuestion),
          analysis_steps: practiceResult?.analysis_steps ?? selectedQuestion.analysis_steps,
          mistake_tip: practiceResult?.mistake_tip,
        }),
      });

      if (!response.ok) {
        throw new Error("AI ask request failed");
      }

      if (!response.body) {
        throw new Error("Browser does not support streaming response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        events.forEach(applySseEvent);
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        applySseEvent(buffer);
      }
    } catch {
      setAiAskResult(localAiAskResult());
    } finally {
      setAiAskLoading(false);
    }
  }

  async function askAiTutor() {
    if (!selectedQuestion || !practiceResult || practiceResult.correct) {
      return;
    }
    setAiLoading(true);
    const message = `我这道题答成了 ${practiceResult.student_answer}，标准答案是 ${practiceResult.correct_answer}。请结合题目给我讲清楚为什么错，以及下次怎么判断。`;
    await askPhysicsTutor(message);
    setAiLoading(false);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">初中物理 · 单一知识点实验</p>
        <h1>浮不浮实验室</h1>
        <p className="hero-copy">
          先看物体完全浸没时最大浮力和重力的比较，再用初中公式算出浮力，最后用真实题目练到会用。
        </p>
      </section>

      <section className="workspace" aria-label="浮力概念实验区">
        <aside className="control-panel">
          <div className="panel-heading">
            <span>概念实验输入</span>
            <strong>单位：N</strong>
          </div>

          <label className="field">
            <span>物体重量</span>
            <input
              type="number"
              min="0"
              max="10000"
              value={objectWeight}
              onChange={(event) => setObjectWeight(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>完全浸没时排开水的重量</span>
            <input
              type="number"
              min="0"
              max="10000"
              value={displacedWaterWeight}
              onChange={(event) => setDisplacedWaterWeight(Number(event.target.value))}
            />
          </label>

          <button className="primary-action" onClick={() => runExperiment()} disabled={isLoading}>
            {isLoading && <span className="loading-dot" aria-hidden="true" />}
            {isLoading ? "实验中..." : "开始实验"}
          </button>

          <div className="preset-list" aria-label="预设实验">
            {presets.map((preset) => (
              <button
                key={preset.name}
                className="preset-button"
                onClick={() => runExperiment(preset.objectWeight, preset.displacedWaterWeight)}
              >
                <span>{preset.name}</span>
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="tank-card">
          <div className="tank-header">
            <div>
              <p>观察水槽</p>
              <h2>{result.state_text}</h2>
            </div>
          </div>

          <div className="tank-stage">
            <div className="force-column force-column--left">
              <div className="force-label">浮力</div>
              <div className="force-arrow force-arrow--up" style={{ height: forceScale.buoyancyHeight }} />
              <strong>{result.buoyancy_n} N</strong>
            </div>

            <div className="water-tank">
              <div className="water-surface" />
              <div className="water-fill" />
              <div className={objectClassName} aria-label={`物体状态：${result.state_text}`}>
                <span />
              </div>
              <div className="bubble bubble-a" />
              <div className="bubble bubble-b" />
              <div className="bubble bubble-c" />
            </div>

            <div className="force-column force-column--right">
              <div className="force-label">重力</div>
              <div className="force-arrow force-arrow--down" style={{ height: forceScale.gravityHeight }} />
              <strong>{result.object_weight_n} N</strong>
            </div>
          </div>
        </section>

        <section className="explain-panel">
          <p className="eyebrow">实验结论</p>
          <h2>{result.explanation}</h2>
          <p>{result.student_tip}</p>
          <p className="concept-note">这里比较的是物体刚完全浸没时的最大浮力；如果物体最终漂浮，浮力会重新等于物体重力。</p>
          <div className="formula-strip">
            <span>浮力大小</span>
            <strong>≈</strong>
            <span>物体完全浸没时排开水的重量</span>
          </div>
        </section>
      </section>

      <section className="formula-lab" aria-labelledby="formula-lab-title">
        <div className="formula-lab-header">
          <div>
            <h2 id="formula-lab-title">从看懂浮力，到会算浮力</h2>
            <p>
              先选题型，再填数据，最后看分步解析。每一步都按初中物理题的写法来，不直接跳答案。
            </p>
          </div>
        </div>

        <ol className="learning-steps" aria-label="公式实验室操作步骤">
          <li><strong>1</strong><span>选公式</span></li>
          <li><strong>2</strong><span>填数据</span></li>
          <li><strong>3</strong><span>看解析</span></li>
        </ol>

        <div className="formula-mode-group" role="group" aria-label="选择浮力计算公式">
          {(Object.keys(formulaModeLabels) as FormulaMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={mode === formulaMode ? "formula-mode is-active" : "formula-mode"}
              aria-pressed={mode === formulaMode}
              onClick={() => {
                setFormulaMode(mode);
                setFormulaError("");
                setFormulaResult(localCalculateFormula(mode, formulaValues));
              }}
            >
              <span>{formulaModeLabels[mode].title}</span>
              <small>{formulaModeLabels[mode].subtitle}</small>
              <em>{formulaModeLabels[mode].when}</em>
            </button>
          ))}
        </div>

        <div className="formula-workspace">
          <form className="formula-panel" onSubmit={(event) => { event.preventDefault(); runFormula(); }}>
            <div className="panel-heading">
              <span>公式输入</span>
              <strong>{formulaModeLabels[formulaMode].subtitle}</strong>
            </div>

            <div className="example-box" aria-label="一键例题">
              <span>不知道填什么？先试一个例题：</span>
              <div>
                {formulaExamples[formulaMode].map((example) => (
                  <button key={example.label} type="button" onClick={() => applyFormulaExample(example.values)}>
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            {formulaMode === "archimedes" && (
              <div className="formula-fields">
                <label className="field">
                  <span>液体密度 ρ液，kg/m³</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formulaValues.liquidDensity}
                    onChange={(event) => updateFormulaValue("liquidDensity", Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>排开液体体积 V排，m³</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={formulaValues.displacedVolume}
                    onChange={(event) => updateFormulaValue("displacedVolume", Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>g，N/kg（初中题通常取 10）</span>
                  <select value={formulaValues.g} onChange={(event) => updateFormulaValue("g", Number(event.target.value))}>
                    <option value={10}>10 N/kg（常用）</option>
                    <option value={9.8}>9.8 N/kg（更精确）</option>
                  </select>
                </label>
              </div>
            )}

            {formulaMode === "weighing" && (
              <div className="formula-fields">
                <label className="field">
                  <span>空气中物体重力 G物，N</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formulaValues.weighingObjectWeight}
                    aria-describedby={formulaError ? "formula-error" : undefined}
                    aria-invalid={Boolean(formulaError)}
                    onChange={(event) => updateFormulaValue("weighingObjectWeight", Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>浸入水后测力计示数 F示，N</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formulaValues.springScaleReading}
                    aria-describedby={formulaError ? "formula-error" : undefined}
                    aria-invalid={Boolean(formulaError)}
                    onChange={(event) => updateFormulaValue("springScaleReading", Number(event.target.value))}
                  />
                </label>
              </div>
            )}

            {formulaMode === "floating_balance" && (
              <div className="formula-fields">
                <label className="field">
                  <span>漂浮物体重力 G物，N</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formulaValues.floatingObjectWeight}
                    onChange={(event) => updateFormulaValue("floatingObjectWeight", Number(event.target.value))}
                  />
                </label>
              </div>
            )}

            {formulaError && (
              <p id="formula-error" className="form-error" role="alert">
                {formulaError}
              </p>
            )}

            <button className="primary-action" type="submit" disabled={formulaLoading}>
              {formulaLoading && <span className="loading-dot" aria-hidden="true" />}
              {formulaLoading ? "计算中..." : "计算浮力"}
            </button>
          </form>

          <section className="formula-result" aria-live="polite" aria-busy={formulaLoading}>
            <div className="result-kicker">分步解析</div>
            <h3>{formulaResult.formula}</h3>
            <ol className="step-list">
              {formulaResult.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="answer-card">
              <span>计算结果</span>
              <strong>{formulaResult.result_n} N</strong>
            </div>
            <p>{formulaResult.student_tip}</p>
          </section>
        </div>
      </section>

      <section className="practice-lab" aria-labelledby="practice-lab-title">
        <div className="practice-lab-header">
          <div>
            <p className="eyebrow">真实题目训练</p>
            <h2 id="practice-lab-title">把浮力题真正练会</h2>
            <p>
              选一道题，先自己作答，再看正误、标准答案、分步解析和错因提示。答错时可以让 AI 小老师换一种说法讲一遍。
            </p>
          </div>
        </div>

        <section className="learning-dashboard" aria-labelledby="learning-dashboard-title">
          <div className="learning-dashboard-copy">
            <span className="topic-pill">我的学习情况</span>
            <h3 id="learning-dashboard-title">
              {practiceStats.totalAttempts === 0
                ? "从第一题开始，实验室会帮你记录进步"
                : learningSummary.pending > 0
                  ? `还有 ${learningSummary.pending} 道错题等待订正`
                  : "目前没有待订正错题，继续挑战下一类"}
            </h3>
            <p>
              {practiceStats.totalAttempts === 0
                ? "记录只保存在当前浏览器，不需要登录。"
                : learningSummary.topicCount < 2
                  ? `目前练习了「${learningSummary.weakest}」，再完成其他题型后会生成薄弱项建议。`
                  : `建议优先练习「${learningSummary.weakest}」，当前掌握最好的是「${learningSummary.strongest}」。`}
            </p>
          </div>

          <div className="learning-metrics" aria-label="学习数据">
            <div>
              <span>题库进度</span>
              <strong>{learningSummary.completed}/{practiceQuestions.length}</strong>
              <small>{learningSummary.progress}% 已完成</small>
            </div>
            <div>
              <span>提交次数</span>
              <strong>{practiceStats.totalAttempts}</strong>
              <small>包含重新练习</small>
            </div>
            <div>
              <span>正确率</span>
              <strong>{practiceAccuracy}</strong>
              <small>按提交次数计算</small>
            </div>
            <div>
              <span>待订正</span>
              <strong>{learningSummary.pending}</strong>
              <small>答对后自动订正</small>
            </div>
          </div>

          <div className="learning-progress" aria-label={`题库完成进度 ${learningSummary.progress}%`}>
            <span style={{ width: `${learningSummary.progress}%` }} />
          </div>

          <div className="learning-actions">
            <button
              type="button"
              className={practiceView === "all" ? "learning-filter is-active" : "learning-filter"}
              aria-pressed={practiceView === "all"}
              onClick={() => selectPracticeView("all")}
            >
              全部题目
            </button>
            <button
              type="button"
              className={practiceView === "mistakes" ? "learning-filter is-active" : "learning-filter"}
              aria-pressed={practiceView === "mistakes"}
              onClick={() => selectPracticeView("mistakes")}
            >
              错题本 {mistakeQuestionIds.size}
            </button>
            {practiceStats.totalAttempts > 0 && (
              <button type="button" className="learning-reset" onClick={resetPracticeStats}>
                清空学习记录
              </button>
            )}
          </div>
        </section>

        <div className="practice-workspace">
          <aside className="question-list" aria-label="题目列表">
            <div className="question-list-title">
              <span>{practiceView === "mistakes" ? "错题本" : "题库"}</span>
              <strong>{visiblePracticeQuestions.length} 题</strong>
            </div>

            {practiceView === "all" && (
              <div className="topic-filter" role="tablist" aria-label="按题型筛选">
                {groupedPracticeQuestions.map(([topic, questions]) => (
                  <button
                    key={topic}
                    type="button"
                    role="tab"
                    className={topic === activePracticeTopic ? "topic-filter-button is-active" : "topic-filter-button"}
                    aria-selected={topic === activePracticeTopic}
                    onClick={() => selectPracticeTopic(topic)}
                  >
                    <span>{topic}</span>
                    <strong>{questions.length}</strong>
                  </button>
                ))}
              </div>
            )}

            <div className="question-group compact">
              <h3>{practiceView === "mistakes" ? "曾经答错的题" : activePracticeTopic || "全部题目"}</h3>
              {visiblePracticeQuestions.length > 0 ? (
                <ul>
                  {visiblePracticeQuestions.map((question, index) => {
                    const record = practiceStats.records[question.id];
                    return (
                  <li key={question.id}>
                    <button
                      type="button"
                      className={question.id === selectedQuestion?.id ? "question-button is-active" : "question-button"}
                      aria-pressed={question.id === selectedQuestion?.id}
                      onClick={() => selectPracticeQuestion(question.id)}
                    >
                      <span>{question.type === "single_choice" ? "选择" : "填空"}</span>
                      {record && (
                        <i className={record.lastCorrect ? "question-status is-correct" : "question-status is-pending"}>
                          {record.everWrong && record.lastCorrect ? "已订正" : record.lastCorrect ? "已完成" : "待订正"}
                        </i>
                      )}
                      <strong>{getQuestionNavLabel(question, index)}</strong>
                      <small>{question.stem}</small>
                    </button>
                  </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mistake-empty">
                  <strong>错题本还是空的</strong>
                  <p>先完成几道题，答错的题会自动收进这里。</p>
                </div>
              )}
            </div>
          </aside>

          {selectedQuestion && (practiceView === "all" || mistakeQuestionIds.has(selectedQuestion.id)) && (
            <div className="practice-study-grid">
              <section className="practice-card" aria-labelledby="current-question-title">
                <div className="practice-card-header">
                  <span className="topic-pill">{selectedQuestion.topic}</span>
                  <span>{selectedQuestion.type === "single_choice" ? "选择题" : "填空题"}</span>
                </div>

                <h3 id="current-question-title">{selectedQuestion.stem}</h3>

                {selectedQuestion.type === "single_choice" ? (
                  <div className="answer-options" role="group" aria-label="选择你的答案">
                    {selectedQuestion.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={practiceAnswer === option.id ? "answer-option is-selected" : "answer-option"}
                        aria-pressed={practiceAnswer === option.id}
                        onClick={() => {
                          updatePracticeAnswer(option.id);
                        }}
                      >
                        <span>{option.id}</span>
                        <strong>{option.text}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <label className="field practice-answer-field" htmlFor="practice-answer">
                    <span>你的答案{selectedQuestion.unit ? `（单位：${selectedQuestion.unit}，可只填数字）` : ""}</span>
                    <input
                      id="practice-answer"
                      type="text"
                      inputMode="decimal"
                      placeholder={selectedQuestion.unit ? `例如：${selectedQuestion.answer}` : "写下你的答案"}
                      value={practiceAnswer}
                      aria-describedby={practiceError ? "practice-error" : undefined}
                      aria-invalid={Boolean(practiceError)}
                      onChange={(event) => {
                        updatePracticeAnswer(event.target.value);
                      }}
                    />
                  </label>
                )}

                {practiceError && (
                  <p id="practice-error" className="form-error" role="alert">
                    {practiceError}
                  </p>
                )}

                {practiceResult ? (
                  <button className="primary-action submitted-action" type="button" disabled>
                    已提交，先看下方解析
                  </button>
                ) : (
                  <button className="primary-action" type="button" onClick={submitPracticeAnswer} disabled={practiceLoading}>
                    {practiceLoading && <span className="loading-dot" aria-hidden="true" />}
                    {practiceLoading ? "判题中..." : "提交答案"}
                  </button>
                )}

                {practiceResult && (
                  <section className="practice-result" aria-live="polite">
                    <div className={practiceResult.correct ? "result-banner is-correct" : "result-banner is-wrong"}>
                      <span>{practiceResult.correct ? "答对了" : "再想一步"}</span>
                      <strong>{practiceResult.correct ? "浮力思路正确" : "这题暂时答错了"}</strong>
                    </div>

                    <div className="standard-answer">
                      <span>标准答案</span>
                      <strong>{practiceResult.correct_answer}</strong>
                    </div>

                    <div className="analysis-box">
                      <h4>分步解析</h4>
                      <ol className="step-list">
                        {practiceResult.analysis_steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {!practiceResult.correct && (
                      <div className="mistake-box">
                        <h4>错因提示</h4>
                        <p>{practiceResult.mistake_tip}</p>
                        <button className="secondary-action" type="button" onClick={askAiTutor} disabled={aiLoading || aiAskLoading}>
                          {(aiLoading || aiAskLoading) && <span className="loading-dot" aria-hidden="true" />}
                          {aiLoading || aiAskLoading ? "AI 小老师思考中..." : "让 AI 针对我的错误讲一遍"}
                        </button>
                      </div>
                    )}

                    <button className="primary-action next-practice-action" type="button" onClick={selectNextPracticeQuestion}>
                      看完解析，下一题
                    </button>
                  </section>
                )}
              </section>

              <aside className="ai-tutor-panel" aria-labelledby="ai-free-ask-title">
                <div className="ai-tutor-heading">
                  <span className="topic-pill">AI 小老师</span>
                  <h3 id="ai-free-ask-title">问一道物理题</h3>
                  <p>可以追问当前题，也可以问其它物理题。系统提示已限制为只回答物理学习相关内容。</p>
                </div>

                <div className="quick-prompt-group" aria-label="AI 小老师快捷提问">
                  {dynamicAiPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="quick-prompt"
                      onClick={() => askPhysicsTutor(prompt)}
                      disabled={aiAskLoading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <label className="field ai-question-field" htmlFor="ai-question-input">
                  <span>你的问题</span>
                  <div className="ai-input-shell">
                    <textarea
                      id="ai-question-input"
                      rows={4}
                      placeholder="输入你的疑问，按 Enter 发送..."
                      value={aiQuestion}
                      aria-describedby={aiAskError ? "ai-question-error" : undefined}
                      aria-invalid={Boolean(aiAskError)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          askPhysicsTutor();
                        }
                      }}
                      onChange={(event) => {
                        setAiQuestion(event.target.value);
                        setAiAskError("");
                      }}
                    />
                    <button
                      className="ai-send-button"
                      type="button"
                      aria-label="发送问题给 AI 小老师"
                      onClick={() => askPhysicsTutor()}
                      disabled={aiAskLoading}
                    >
                      {aiAskLoading ? <span className="loading-dot" aria-hidden="true" /> : "↗"}
                    </button>
                  </div>
                </label>

                {aiAskError && (
                  <p id="ai-question-error" className="form-error" role="alert">
                    {aiAskError}
                  </p>
                )}

                {aiAskResult && (
                  <section className="ai-answer-card" aria-live="polite" aria-busy={aiAskLoading}>
                    <Suspense fallback={<p className="math-loading">正在准备公式排版...</p>}>
                      <MathMarkdown>
                        {aiAskResult.answer || "AI 小老师正在组织语言..."}
                      </MathMarkdown>
                    </Suspense>
                    {!aiAskLoading && aiAskResult.next_prompt && (
                      <button className="text-action" type="button" onClick={() => setAiQuestion(aiAskResult.next_prompt)}>
                        继续追问：{aiAskResult.next_prompt}
                      </button>
                    )}
                  </section>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;

import { useMemo, useState } from "react";
import {
  BuoyancyResult,
  FormulaMode,
  FormulaResult,
  FormulaValues,
  localCalculate,
  localCalculateFormula,
  presets,
} from "./lib/buoyancy";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const formulaModeLabels: Record<FormulaMode, { title: string; subtitle: string }> = {
  archimedes: { title: "阿基米德原理", subtitle: "F浮 = ρ液 g V排" },
  weighing: { title: "称重法", subtitle: "F浮 = G物 - F示" },
  floating_balance: { title: "漂浮平衡", subtitle: "F浮 = G物" },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function App() {
  const [objectWeight, setObjectWeight] = useState(8);
  const [displacedWaterWeight, setDisplacedWaterWeight] = useState(10);
  const [result, setResult] = useState<BuoyancyResult>(() => localCalculate(8, 10));
  const [source, setSource] = useState("本地初始实验");
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
  const [formulaSource, setFormulaSource] = useState("本地初始计算");
  const [formulaLoading, setFormulaLoading] = useState(false);
  const [formulaError, setFormulaError] = useState("");

  const forceScale = useMemo(() => {
    const maxForce = Math.max(objectWeight, displacedWaterWeight, 1);
    return {
      gravityHeight: clamp((objectWeight / maxForce) * 120, 34, 130),
      buoyancyHeight: clamp((displacedWaterWeight / maxForce) * 120, 34, 130),
    };
  }, [objectWeight, displacedWaterWeight]);

  const objectClassName = `lab-object lab-object--${result.state}`;

  function updateFormulaValue(key: keyof FormulaValues, value: number) {
    setFormulaValues((current) => ({ ...current, [key]: value }));
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
      setSource("后端 API 计算");
    } catch {
      setResult(localCalculate(nextObjectWeight, nextDisplacedWaterWeight));
      setSource("后端未启动，已使用前端本地计算");
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
      setFormulaSource("后端 API 计算");
    } catch {
      setFormulaResult(localCalculateFormula(formulaMode, formulaValues));
      setFormulaSource("后端未启动，已使用前端本地计算");
    } finally {
      setFormulaLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">初中物理 · 单一知识点实验</p>
        <h1>浮不浮实验室</h1>
        <p className="hero-copy">
          先用水槽看懂浮力和重力的比较，再用初中公式算出浮力，最后为真实题目训练做准备。
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
            <span>排开水的重量</span>
            <input
              type="number"
              min="0"
              max="10000"
              value={displacedWaterWeight}
              onChange={(event) => setDisplacedWaterWeight(Number(event.target.value))}
            />
          </label>

          <button className="primary-action" onClick={() => runExperiment()} disabled={isLoading}>
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
            <span className="source-pill">{source}</span>
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
          <div className="formula-strip">
            <span>浮力大小</span>
            <strong>≈</strong>
            <span>物体排开水的重量</span>
          </div>
        </section>
      </section>

      <section className="formula-lab" aria-labelledby="formula-lab-title">
        <div className="formula-lab-header">
          <div>
            <p className="eyebrow">Day2 · 公式实验室</p>
            <h2 id="formula-lab-title">从看懂浮力，到会算浮力</h2>
            <p>
              选择一种初中常见题型，输入数据后查看公式、代入过程和结果。这里先练基础公式，不扩展到复杂综合题。
            </p>
          </div>
          <span className="source-pill">{formulaSource}</span>
        </div>

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
                setFormulaSource("本地预览计算");
              }}
            >
              <span>{formulaModeLabels[mode].title}</span>
              <small>{formulaModeLabels[mode].subtitle}</small>
            </button>
          ))}
        </div>

        <div className="formula-workspace">
          <form className="formula-panel" onSubmit={(event) => { event.preventDefault(); runFormula(); }}>
            <div className="panel-heading">
              <span>公式输入</span>
              <strong>{formulaModeLabels[formulaMode].subtitle}</strong>
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
                  <span>g，N/kg</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.1"
                    value={formulaValues.g}
                    onChange={(event) => updateFormulaValue("g", Number(event.target.value))}
                  />
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
              {formulaLoading ? "计算中..." : "计算浮力"}
            </button>
          </form>

          <section className="formula-result" aria-live="polite" aria-busy={formulaLoading}>
            <p className="eyebrow">分步解析</p>
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
    </main>
  );
}

export default App;

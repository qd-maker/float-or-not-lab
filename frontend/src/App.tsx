import { useMemo, useState } from "react";
import { BuoyancyResult, localCalculate, presets } from "./lib/buoyancy";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function App() {
  const [objectWeight, setObjectWeight] = useState(8);
  const [displacedWaterWeight, setDisplacedWaterWeight] = useState(10);
  const [result, setResult] = useState<BuoyancyResult>(() => localCalculate(8, 10));
  const [source, setSource] = useState("本地初始实验");
  const [isLoading, setIsLoading] = useState(false);

  const forceScale = useMemo(() => {
    const maxForce = Math.max(objectWeight, displacedWaterWeight, 1);
    return {
      gravityHeight: clamp((objectWeight / maxForce) * 120, 34, 130),
      buoyancyHeight: clamp((displacedWaterWeight / maxForce) * 120, 34, 130),
    };
  }, [objectWeight, displacedWaterWeight]);

  const objectClassName = `lab-object lab-object--${result.state}`;

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

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">初中物理 · 单一知识点实验</p>
        <h1>浮不浮实验室</h1>
        <p className="hero-copy">
          输入两个数字，看水能不能把物体托起来。这里先不背复杂公式，只观察浮力和物体重量谁更大。
        </p>
      </section>

      <section className="workspace" aria-label="浮力实验区">
        <aside className="control-panel">
          <div className="panel-heading">
            <span>实验输入</span>
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
    </main>
  );
}

export default App;

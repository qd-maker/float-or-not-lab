export type BuoyancyState = "float" | "suspend" | "sink";
export type FormulaMode = "archimedes" | "weighing" | "floating_balance";

export interface BuoyancyResult {
  state: BuoyancyState;
  state_text: string;
  object_weight_n: number;
  buoyancy_n: number;
  difference_n: number;
  explanation: string;
  student_tip: string;
}

export interface FormulaResult {
  mode: FormulaMode;
  formula: string;
  result_n: number;
  steps: string[];
  student_tip: string;
}

export interface FormulaValues {
  liquidDensity: number;
  displacedVolume: number;
  g: number;
  weighingObjectWeight: number;
  springScaleReading: number;
  floatingObjectWeight: number;
}

export interface PresetExperiment {
  name: string;
  objectWeight: number;
  displacedWaterWeight: number;
  description: string;
}

export const presets: PresetExperiment[] = [
  {
    name: "小木块",
    objectWeight: 3,
    displacedWaterWeight: 5,
    description: "木块排开的水能给它足够的托力，所以容易浮起来。",
  },
  {
    name: "小石头",
    objectWeight: 9,
    displacedWaterWeight: 4,
    description: "石头比较容易沉，是因为它得到的浮力不够托住它。",
  },
  {
    name: "小船",
    objectWeight: 20,
    displacedWaterWeight: 28,
    description: "船能排开很多水，所以可以获得很大的浮力。",
  },
  {
    name: "潜水艇悬停",
    objectWeight: 18,
    displacedWaterWeight: 18,
    description: "当浮力和重力差不多平衡时，潜水艇可以悬浮在水中。",
  },
];

function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(4));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

export function localCalculate(objectWeight: number, displacedWaterWeight: number): BuoyancyResult {
  const difference = Number((displacedWaterWeight - objectWeight).toFixed(3));
  const tolerance = Math.max(0.05, Math.max(Math.abs(objectWeight), Math.abs(displacedWaterWeight), 1) * 0.02);

  if (Math.abs(difference) <= tolerance) {
    return {
      state: "suspend",
      state_text: "悬浮",
      object_weight_n: objectWeight,
      buoyancy_n: displacedWaterWeight,
      difference_n: difference,
      explanation: "排开水的重量和物体重量差不多，浮力和重力平衡，所以物体会悬浮在水中。",
      student_tip: "看箭头：向上和向下的箭头差不多长，说明两个力差不多平衡。",
    };
  }

  if (displacedWaterWeight > objectWeight) {
    return {
      state: "float",
      state_text: "上浮",
      object_weight_n: objectWeight,
      buoyancy_n: displacedWaterWeight,
      difference_n: difference,
      explanation: "排开水的重量比物体重量大，浮力能托住物体，所以物体会上浮。",
      student_tip: "看箭头：向上的浮力箭头更长，说明水给物体的托力更大。",
    };
  }

  return {
    state: "sink",
    state_text: "下沉",
    object_weight_n: objectWeight,
    buoyancy_n: displacedWaterWeight,
    difference_n: difference,
    explanation: "排开水的重量比物体重量小，浮力不够托住物体，所以物体会下沉。",
    student_tip: "看箭头：向下的重力箭头更长，说明物体更容易往下运动。",
  };
}

export function localCalculateFormula(mode: FormulaMode, values: FormulaValues): FormulaResult {
  if (mode === "archimedes") {
    const result = Number((values.liquidDensity * values.g * values.displacedVolume).toFixed(4));
    return {
      mode,
      formula: "F浮 = ρ液 g V排",
      result_n: result,
      steps: [
        "F浮 = ρ液 g V排",
        `F浮 = ${formatNumber(values.liquidDensity)} × ${formatNumber(values.g)} × ${formatNumber(values.displacedVolume)}`,
        `F浮 = ${formatNumber(result)} N`,
      ],
      student_tip: "排开液体的体积越大，液体密度越大，物体受到的浮力通常越大。",
    };
  }

  if (mode === "weighing") {
    const result = Number((values.weighingObjectWeight - values.springScaleReading).toFixed(4));
    return {
      mode,
      formula: "F浮 = G物 - F示",
      result_n: result,
      steps: [
        "F浮 = G物 - F示",
        `F浮 = ${formatNumber(values.weighingObjectWeight)} - ${formatNumber(values.springScaleReading)}`,
        `F浮 = ${formatNumber(result)} N`,
      ],
      student_tip: "物体浸入水中后，测力计少显示的那部分力，就是水给它的浮力。",
    };
  }

  return {
    mode,
    formula: "漂浮时 F浮 = G物",
    result_n: values.floatingObjectWeight,
    steps: ["物体漂浮时处于平衡状态", "F浮 = G物", `F浮 = ${formatNumber(values.floatingObjectWeight)} N`],
    student_tip: "漂浮不代表没有重力，而是浮力刚好托住了物体。",
  };
}

export type PracticeQuestionType = "single_choice" | "fill_blank";

export interface PracticeOption {
  id: string;
  text: string;
}

export interface PracticeQuestion {
  id: string;
  type: PracticeQuestionType;
  topic: string;
  stem: string;
  options: PracticeOption[];
  answer: string;
  unit?: string | null;
  analysis_steps: string[];
  mistake_tip: string;
}

export interface PracticeSubmitResult {
  question_id: string;
  correct: boolean;
  correct_answer: string;
  student_answer: string;
  analysis_steps: string[];
  mistake_tip: string;
}

export interface AiExplanation {
  short_explanation: string;
  hint: string;
  next_step: string;
}

export interface AiAskResult {
  answer: string;
  scope: string;
  next_prompt: string;
}

export const fallbackPracticeQuestions: PracticeQuestion[] = [
  {
    id: "q-float-001",
    type: "single_choice",
    topic: "判断浮沉",
    stem: "一个物体重 10 N，受到的浮力是 6 N，它在水中会怎样？",
    options: [
      { id: "A", text: "上浮" },
      { id: "B", text: "悬浮" },
      { id: "C", text: "下沉" },
    ],
    answer: "C",
    analysis_steps: ["比较浮力和物体重力。", "F浮 = 6 N，G物 = 10 N。", "F浮 < G物，所以物体会下沉。"],
    mistake_tip: "先比较 F浮 和 G物，不要只看物体重不重。",
  },
  {
    id: "q-float-002",
    type: "single_choice",
    topic: "判断浮沉",
    stem: "一个物体重 8 N，受到的浮力也是 8 N，它可能处于什么状态？",
    options: [
      { id: "A", text: "受力平衡，可能悬浮" },
      { id: "B", text: "一定快速上浮" },
      { id: "C", text: "一定下沉" },
    ],
    answer: "A",
    analysis_steps: ["比较 F浮 和 G物。", "F浮 = G物 = 8 N。", "两个力平衡，所以物体可能悬浮或保持平衡状态。"],
    mistake_tip: "相等时不是上浮也不是下沉，而是受力平衡。",
  },
  {
    id: "q-weighing-001",
    type: "fill_blank",
    topic: "称重法求浮力",
    stem: "一个物体在空气中重 12 N，浸没在水中时弹簧测力计示数为 7 N，物体受到的浮力是多少？",
    options: [],
    answer: "5",
    unit: "N",
    analysis_steps: ["这道题使用称重法。", "F浮 = G物 - F示。", "F浮 = 12 - 7 = 5 N。"],
    mistake_tip: "不要把水中测力计示数 7 N 当成浮力，浮力是前后两次数值的差。",
  },
  {
    id: "q-weighing-002",
    type: "fill_blank",
    topic: "称重法求浮力",
    stem: "物体重 9 N，浸入水中后测力计示数为 4 N，浮力是多少？",
    options: [],
    answer: "5",
    unit: "N",
    analysis_steps: ["使用称重法。", "F浮 = G物 - F示。", "F浮 = 9 - 4 = 5 N。"],
    mistake_tip: "看到空气中重力和水中示数，就优先想到称重法。",
  },
  {
    id: "q-archimedes-001",
    type: "fill_blank",
    topic: "阿基米德公式",
    stem: "物体排开水的体积为 0.003 m³，水的密度取 1000 kg/m³，g 取 10 N/kg，浮力是多少？",
    options: [],
    answer: "30",
    unit: "N",
    analysis_steps: ["使用阿基米德公式。", "F浮 = ρ液 g V排。", "F浮 = 1000 × 10 × 0.003 = 30 N。"],
    mistake_tip: "V排 的单位是 m³，代入时不要漏乘 g。",
  },
  {
    id: "q-archimedes-002",
    type: "fill_blank",
    topic: "阿基米德公式",
    stem: "物体排开水的体积为 0.0015 m³，水的密度取 1000 kg/m³，g 取 10 N/kg，浮力是多少？",
    options: [],
    answer: "15",
    unit: "N",
    analysis_steps: ["使用 F浮 = ρ液 g V排。", "代入：1000 × 10 × 0.0015。", "F浮 = 15 N。"],
    mistake_tip: "小数体积计算时注意 1000 × 0.0015 = 1.5。",
  },
  {
    id: "q-floating-001",
    type: "fill_blank",
    topic: "漂浮平衡",
    stem: "一块木块漂浮在水面上，木块重 5 N，它受到的浮力是多少？",
    options: [],
    answer: "5",
    unit: "N",
    analysis_steps: ["木块漂浮，说明它处于平衡状态。", "漂浮时 F浮 = G物。", "所以 F浮 = 5 N。"],
    mistake_tip: "漂浮时不是浮力更大，而是浮力刚好等于重力。",
  },
  {
    id: "q-floating-002",
    type: "single_choice",
    topic: "漂浮平衡",
    stem: "轮船漂浮在水面上时，它受到的浮力和重力关系是什么？",
    options: [
      { id: "A", text: "浮力大于重力" },
      { id: "B", text: "浮力等于重力" },
      { id: "C", text: "浮力小于重力" },
    ],
    answer: "B",
    analysis_steps: ["轮船漂浮，说明受力平衡。", "平衡时向上的浮力等于向下的重力。", "所以 F浮 = G物。"],
    mistake_tip: "漂浮是平衡状态，不是因为浮力一直比重力大。",
  },
  {
    id: "q-life-001",
    type: "single_choice",
    topic: "生活应用",
    stem: "轮船从河水驶入海水后仍然漂浮。海水密度更大，船身通常会怎样？",
    options: [
      { id: "A", text: "上浮一些，排开更少的海水就能平衡重力" },
      { id: "B", text: "下沉更多，因为海水更重" },
      { id: "C", text: "一定完全不变" },
    ],
    answer: "A",
    analysis_steps: ["轮船始终漂浮，所以浮力等于重力。", "海水密度比河水大。", "需要排开的海水体积更小，所以船身会上浮一些。"],
    mistake_tip: "漂浮时浮力仍等于船重，变化的是排开液体的体积。",
  },
  {
    id: "q-life-002",
    type: "single_choice",
    topic: "生活应用",
    stem: "潜水艇想下潜时，通常会向水舱中加水。这样做主要是为了什么？",
    options: [
      { id: "A", text: "增大自身重力，使重力大于浮力" },
      { id: "B", text: "让水没有浮力" },
      { id: "C", text: "减小地球引力" },
    ],
    answer: "A",
    analysis_steps: ["潜水艇下潜需要重力大于浮力。", "向水舱加水会增大潜水艇整体重力。", "当 G物 > F浮 时，潜水艇会下潜。"],
    mistake_tip: "潜水艇不是消除浮力，而是通过改变自身重力来控制浮沉。",
  },
];

function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s/g, "").toUpperCase().replace("Ｎ", "N");
}

function numericMatch(studentAnswer: string, correctAnswer: string): boolean {
  const student = Number(normalizeAnswer(studentAnswer).replace("N", ""));
  const correct = Number(normalizeAnswer(correctAnswer).replace("N", ""));
  return Number.isFinite(student) && Number.isFinite(correct) && Math.abs(student - correct) <= 0.01;
}

function numericValue(answer: string): number | null {
  const value = Number(normalizeAnswer(answer).replace("N", ""));
  return Number.isFinite(value) ? value : null;
}

function near(left: number | null, right: number): boolean {
  return left !== null && Math.abs(left - right) <= 0.01;
}

function dynamicMistakeTip(question: PracticeQuestion, studentAnswer: string, normalizedStudent: string): string {
  const student = numericValue(studentAnswer);

  if (question.id === "q-archimedes-001" || question.id === "q-archimedes-002") {
    const values =
      question.id === "q-archimedes-001"
        ? { density: 1000, g: 10, volume: 0.003 }
        : { density: 1000, g: 10, volume: 0.0015 };
    const correct = values.density * values.g * values.volume;

    if (student === null) {
      return "这题需要填写数值结果。先写公式 F浮 = ρ液 g V排，再把 ρ、g、V 三个量都代入。";
    }
    if (near(student, values.density * values.volume)) {
      return "你算成了 ρ液 × V排，漏乘了重力加速度 g。阿基米德公式要写完整：F浮 = ρ液 g V排。";
    }
    if (near(student, values.g * values.volume)) {
      return "你算成了 g × V排，漏乘了液体密度 ρ液。水的密度 1000 kg/m³ 也必须代入。";
    }
    if (near(student, values.volume)) {
      return "你只写了排开液体的体积 V排。体积不是浮力，还要乘 ρ液 和 g，结果单位才是 N。";
    }
    if (student >= correct * 100 || student <= correct / 100) {
      return "你的结果和正确数量级差很多，优先检查 V排 是否用 m³，以及小数点有没有看错。";
    }
  }

  if (question.id === "q-weighing-001" || question.id === "q-weighing-002") {
    const values = question.id === "q-weighing-001" ? { weight: 12, reading: 7 } : { weight: 9, reading: 4 };
    if (student === null) {
      return "这题需要填写数值结果。看到空气中重力和水中测力计示数，先用 F浮 = G物 - F示。";
    }
    if (near(student, values.reading)) {
      return "你把水中弹簧测力计示数当成了浮力。称重法中，浮力是前后两次示数的差：F浮 = G物 - F示。";
    }
    if (near(student, values.weight + values.reading)) {
      return "这类题不是把两个力相加。物体浸入水中后少显示的那部分，才是浮力。";
    }
    if (near(student, values.reading - values.weight)) {
      return "你把减法顺序写反了。称重法应使用空气中重力减去水中示数：F浮 = G物 - F示。";
    }
  }

  if (question.id === "q-floating-001") {
    const correct = numericValue(question.answer);
    if (student !== null && correct !== null && student > correct) {
      return "漂浮时不是浮力大于重力，而是物体受力平衡：F浮 = G物。";
    }
    if (student !== null && correct !== null && student < correct) {
      return "物体已经漂浮，说明浮力刚好托住重力，所以不能小于物体重力。";
    }
  }

  if (question.id === "q-floating-002" && normalizedStudent === "A") {
    return "漂浮不是一直向上加速。漂浮在水面上时物体处于平衡状态，所以 F浮 = G物。";
  }

  if (question.id === "q-float-001" && ["A", "B", "上浮", "悬浮"].includes(normalizedStudent)) {
    return "判断浮沉要比较 F浮 和 G物：这题 F浮 = 6 N，小于 G物 = 10 N，所以会下沉。";
  }

  if (question.id === "q-float-002" && ["B", "C", "一定快速上浮", "一定下沉"].includes(normalizedStudent)) {
    return "这题 F浮 和 G物 相等，物体受力平衡，不会因为浮力方向向上就一定快速上浮。";
  }

  return question.mistake_tip;
}

export function localSubmitPractice(question: PracticeQuestion, studentAnswer: string): PracticeSubmitResult {
  const normalizedStudent = normalizeAnswer(studentAnswer);
  const normalizedCorrect = normalizeAnswer(question.answer);
  const correct =
    question.type === "fill_blank"
      ? numericMatch(studentAnswer, question.answer)
      : normalizedStudent === normalizedCorrect ||
        question.options.some((option) => option.id === normalizedCorrect && normalizeAnswer(option.text) === normalizedStudent);

  return {
    question_id: question.id,
    correct,
    correct_answer: question.unit ? `${question.answer} ${question.unit}` : question.answer,
    student_answer: studentAnswer,
    analysis_steps: question.analysis_steps,
    mistake_tip: correct ? "" : dynamicMistakeTip(question, studentAnswer, normalizedStudent),
  };
}

export function localAiExplanation(result: PracticeSubmitResult): AiExplanation {
  return {
    short_explanation: `AI 小老师先用基础讲解告诉你：这题的标准答案是 ${result.correct_answer}，你需要先判断题型再套公式。`,
    hint: "称重法看 G物 和 F示，阿基米德公式看 ρ液、g、V排，漂浮题直接看 F浮 = G物。",
    next_step: "把题干里的已知量圈出来，再跟着标准解析重新做一遍。",
  };
}

export function localAiAskResult(): AiAskResult {
  return {
    answer: "AI 小老师暂时不能连上在线讲解，但你仍然可以先看标准解析。做浮力题时，先判断题型，再找已知量，最后套对应公式。",
    scope: "基础讲解",
    next_prompt: "可以问：这道题应该先找哪些已知量？",
  };
}

import type {
  DietMode,
  TrainingFrequency,
  TrainingGoal,
  TrainingLocation,
  WeightClass,
} from "../enums/training";
import type { ExperienceLevel } from "../enums/experience";
import type { PlanGender } from "../enums/gender";
import type { Bi, DietGuidance } from "./plan-types";

/**
 * Authored content for the Personalized Workout Plan Generator (Beta).
 * Plain, beginner-safe language, authored zh-TW first with an English pair
 * for every string. This is curated content, not the full ≥80-exercise
 * database (A-7) — that's a separate, larger content-authoring pass; this
 * gives every goal×location combination in the current 4×4 matrix a
 * complete, non-empty session so the structured data model (A-2) has real
 * content to assemble into weeks.
 */

/* ---------------------------------------------------------------- labels */

export const GOAL_TITLE: Record<TrainingGoal, Bi> = {
  muscle_gain: { zh: "增肌訓練", en: "Muscle Gain" },
  fat_loss: { zh: "減脂塑形", en: "Fat Loss" },
  functional: { zh: "功能性表現", en: "Functional Performance" },
  general_fitness: { zh: "綜合體能", en: "General Fitness" },
};

export const GOAL_INTRO: Record<TrainingGoal, Bi> = {
  muscle_gain: {
    zh: "以基本肌力動作為主，循序加重，穩穩把肌肉練起來",
    en: "core strength moves with steady, gradual overload to build muscle the safe way",
  },
  fat_loss: {
    zh: "有氧與肌力交替，提高心跳、多消耗熱量，同時保住肌肉",
    en: "alternating cardio and strength work to raise your heart rate and burn more calories while keeping your muscle",
  },
  functional: {
    zh: "Hyrox / CrossFit 式混合訓練，心肺與爆發力一起練",
    en: "Hyrox / CrossFit-style mixed training combining cardio and explosive power",
  },
  general_fitness: {
    zh: "均衡訓練心肺、肌力與柔軟度，全面提升日常體能",
    en: "a balanced mix of cardio, strength, and mobility work to build well-rounded everyday fitness",
  },
};

export const GENDER_LABEL: Record<PlanGender, Bi> = {
  male: { zh: "男性", en: "male" },
  female: { zh: "女性", en: "female" },
};

export const LEVEL_LABEL: Record<ExperienceLevel, Bi> = {
  beginner: { zh: "初學者", en: "beginners" },
  intermediate: { zh: "中級", en: "intermediate trainees" },
  advanced: { zh: "進階", en: "advanced trainees" },
};

export const LOCATION_LABEL: Record<TrainingLocation, Bi> = {
  gym: { zh: "健身房（全功能器材）", en: "Gym (Full Equipment)" },
  home: { zh: "居家（啞鈴＋彈力帶）", en: "Home (Dumbbells + Bands)" },
  bodyweight: { zh: "純徒手", en: "Bodyweight Only" },
  outdoor: { zh: "戶外", en: "Outdoor" },
};

/* ----------------------------------------------- weight-class guidance */

/** Body-type guidance, interpreted per gender. Unchanged by the A-1 re-scope
 *  — weight class is still input #5, paired with gender. */
export const WEIGHT_NOTE: Record<PlanGender, Record<WeightClass, Bi>> = {
  male: {
    slim: {
      zh: "**體型提醒（纖細）：** 目標是把訓練重量與食量一起慢慢加上去。動作標準的前提下，每 1～2 週小幅加重；正餐吃足，不要空腹訓練。",
      en: "**Body-type note (Slim):** Aim to gradually raise both your training load and food intake. With good form, add a little weight every 1–2 weeks; eat proper meals and don't train on an empty stomach.",
    },
    medium: {
      zh: "**體型提醒（中等）：** 維持目前節奏即可，重點放在動作品質與每週穩定出席，強度循序漸進。",
      en: "**Body-type note (Medium):** Keep your current pace — focus on movement quality and showing up consistently each week, raising intensity gradually.",
    },
    heavy: {
      zh: "**體型提醒（肥胖）：** 先以低衝擊動作為主，菜單中的跳躍動作一律可以改成踏步版本，保護膝蓋與腳踝；強度以「能講話但微喘」為準。",
      en: "**Body-type note (Heavier):** Start with low-impact moves — any jump in this menu can be swapped for a stepping version to protect your knees and ankles. Keep intensity at \"can talk but slightly breathless.\"",
    },
  },
  female: {
    slim: {
      zh: "**體型提醒（纖細）：** 不用擔心「練壯」——肌力訓練只會讓線條更好看。重點是蛋白質吃足、循序加重，避免長時間空腹做有氧。",
      en: "**Body-type note (Slim):** Don't worry about \"bulking up\" — strength training only improves your shape. Focus on eating enough protein and adding weight gradually; avoid long fasted-cardio sessions.",
    },
    medium: {
      zh: "**體型提醒（中等）：** 維持穩定的訓練頻率，重量或次數每 1～2 週小幅增加，搭配充足睡眠效果最好。",
      en: "**Body-type note (Medium):** Keep a steady training frequency, bumping weight or reps slightly every 1–2 weeks — pair it with enough sleep for the best results.",
    },
    heavy: {
      zh: "**體型提醒（肥胖）：** 以低衝擊動作為主，菜單中的跳躍動作一律可以改成踏步版本；先建立規律再談強度，關節不舒服就立刻換動作。",
      en: "**Body-type note (Heavier):** Stick to low-impact moves — any jump in this menu can be swapped for a stepping version. Build a routine first before pushing intensity, and switch moves right away if a joint feels off.",
    },
  },
};

/* -------------------------------------------------- weekly schedule */

export const FREQUENCY_LABEL: Record<TrainingFrequency, Bi> = {
  every_day: { zh: "每天", en: "Every day" },
  every_2_days: { zh: "每 2 天", en: "Every 2 days" },
  "3x": { zh: "一週 3 次", en: "3x a week" },
  "2x": { zh: "一週 2 次", en: "2x a week" },
  "1x": { zh: "一週 1 次", en: "1x a week" },
};

interface WeeklyScheduleDef {
  /** true = training day, at each of the 7 weekday positions. */
  trainingDays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  note: Bi;
}

/** Which weekdays are training days for each frequency, and the framing
 *  note shown under the weekly table. Same pattern repeats for all 4 weeks
 *  — the spec has no requirement that content vary week to week, only that
 *  all 4 weeks are generated and visible (A-2/A-3). */
export const WEEKLY_SCHEDULE: Record<TrainingFrequency, WeeklyScheduleDef> = {
  every_day: {
    trainingDays: [true, true, true, true, true, true, true],
    note: {
      zh: "每天都排了菜單，但身體需要恢復——任一天感覺特別疲勞時，把當天改成散步或伸展也沒關係。",
      en: "Every day has a session, but your body still needs recovery — if any day feels especially rough, swap it for a walk or a stretch instead.",
    },
  },
  every_2_days: {
    trainingDays: [true, false, true, false, true, false, true],
    note: {
      zh: "訓練與休息交替是最穩的節奏；下週會從休息日接續，讓訓練與恢復持續交替。",
      en: "Alternating a training day with a rest day is the steadiest rhythm — next week picks up from a rest day so the alternation keeps going.",
    },
  },
  "3x": {
    trainingDays: [true, false, true, false, true, false, false],
    note: {
      zh: "訓練日之間至少間隔一天，讓身體有時間恢復；週末完全休息。",
      en: "Leave at least a day between training days so your body has time to recover; take the weekend fully off.",
    },
  },
  "2x": {
    trainingDays: [false, true, false, false, true, false, false],
    note: {
      zh: "一週 2 次也能穩定進步，重點是每次都完整做完 60 分鐘，並在非訓練日多走動。",
      en: "Twice a week is still enough to make steady progress — the key is completing the full 60 minutes each time, and staying active on off days.",
    },
  },
  "1x": {
    trainingDays: [false, false, true, false, false, false, false],
    note: {
      zh: "一週僅 1 次時，請務必完整做完全部 60 分鐘；其餘時間盡量增加日常活動量（走路、爬樓梯）補足。",
      en: "With just 1 session a week, make sure to complete the full 60 minutes every time — fill the rest of the week with daily activity like walking and taking the stairs.",
    },
  },
};

/* --------------------------------------------------------- warm-ups */

/** 10-minute warm-up, constrained by where the user trains. */
export const WARMUP: Record<TrainingLocation, Bi[]> = {
  gym: [
    {
      zh: "固定式單車或跑步機快走 — 4 分鐘（輕鬆、能聊天的強度）",
      en: "Stationary bike or brisk treadmill walk — 4 min (easy, conversational pace)",
    },
    {
      zh: "動態伸展：手臂繞環、髖部畫圈、腿部擺動 — 3 分鐘",
      en: "Dynamic stretches: arm circles, hip circles, leg swings — 3 min",
    },
    { zh: "今天第一個動作的輕重量練習 1～2 組 — 3 分鐘", en: "1–2 light warm-up sets of today's first exercise — 3 min" },
  ],
  home: [
    {
      zh: "跳繩或原地開合跳（膝蓋不適改踏步）— 3 分鐘",
      en: "Jump rope or jumping jacks (step in place if your knees are sensitive) — 3 min",
    },
    {
      zh: "動態伸展：手臂繞環、髖部畫圈、腿部擺動 — 3 分鐘",
      en: "Dynamic stretches: arm circles, hip circles, leg swings — 3 min",
    },
    { zh: "彈力帶或輕啞鈴肩膀啟動 — 2 分鐘", en: "Resistance band or light dumbbell shoulder activation — 2 min" },
    { zh: "今天第一個動作的輕重量練習 1 組 — 2 分鐘", en: "1 light warm-up set of today's first exercise — 2 min" },
  ],
  bodyweight: [
    {
      zh: "原地快走或輕鬆踏步 — 3 分鐘（讓身體熱起來、微微出汗）",
      en: "Brisk marching in place — 3 min (warm up until you break a light sweat)",
    },
    { zh: "手臂繞環＋肩膀前後轉動 — 2 分鐘", en: "Arm circles + shoulder rolls — 2 min" },
    { zh: "徒手深蹲（慢速、蹲到舒服的深度）— 2 分鐘", en: "Bodyweight squats (slow, to a comfortable depth) — 2 min" },
    {
      zh: "髖部畫圈＋腿部前後擺動（扶牆保持平衡）— 2 分鐘",
      en: "Hip circles + leg swings (hold a wall for balance) — 2 min",
    },
    { zh: "手腕、腳踝繞環 — 1 分鐘", en: "Wrist and ankle circles — 1 min" },
  ],
  outdoor: [
    {
      zh: "輕鬆慢走或原地小跳 — 4 分鐘（讓身體熱起來、微微出汗）",
      en: "Easy walk or light jogging in place — 4 min (warm up until you break a light sweat)",
    },
    {
      zh: "動態伸展：手臂繞環、髖部畫圈、腿部擺動 — 3 分鐘",
      en: "Dynamic stretches: arm circles, hip circles, leg swings — 3 min",
    },
    { zh: "原地開合跳或高抬腿 — 3 分鐘", en: "Jumping jacks or high knees — 3 min" },
  ],
};

/* -------------------------------------------------------- cool-down */

/** 10-minute cool-down, shared across goals and locations. */
export const COOLDOWN: Bi[] = [
  {
    zh: "原地緩和走動＋深呼吸 — 2 分鐘（讓心跳慢慢降下來）",
    en: "Easy walking in place + deep breathing — 2 min (let your heart rate come down)",
  },
  { zh: "大腿前側伸展（扶牆抓腳背）— 左右各 1 分鐘", en: "Front-thigh stretch (hold a wall, grab your foot) — 1 min each side" },
  {
    zh: "大腿後側伸展（坐姿前彎或站姿體前彎）— 2 分鐘",
    en: "Back-thigh stretch (seated or standing forward fold) — 2 min",
  },
  {
    zh: "胸口與肩膀伸展（雙手背後互扣挺胸）— 2 分鐘",
    en: "Chest and shoulder stretch (clasp hands behind your back, open the chest) — 2 min",
  },
  { zh: "背部與髖部伸展（嬰兒式或抱膝）— 2 分鐘", en: "Back and hip stretch (child's pose or knee hug) — 2 min" },
];

/* ------------------------------------------------------ main blocks */

/** How to run the block at each level (rounds / sets / rest scheme). */
type Scheme = Record<ExperienceLevel, Bi>;

const STRENGTH: Scheme = {
  beginner: {
    zh: "每個動作做 3 組，組間休息 90 秒。重量選「做完最後一下仍能保持標準姿勢」的重量。",
    en: "3 sets per exercise, resting 90 seconds between sets. Pick a weight where you can still keep good form on the last rep.",
  },
  intermediate: { zh: "每個動作做 4 組，組間休息 75 秒。", en: "4 sets per exercise, resting 75 seconds between sets." },
  advanced: {
    zh: "每個動作做 4 組，組間休息 60～75 秒，最後一組做到「還剩 1 下力氣」即可，不必力竭。",
    en: "4 sets per exercise, resting 60–75 seconds between sets. Take your last set to about 1 rep short of failure — no need to grind to total exhaustion.",
  },
};

const CIRCUIT: Scheme = {
  beginner: {
    zh: "由上到下依序完成所有動作為一輪，共 3 輪，每輪之間休息 2 分鐘。做不動就放慢速度，不要停。",
    en: "Work through all the moves top to bottom for one round, 3 rounds total, resting 2 minutes between rounds. If you're gassed, slow down rather than stop.",
  },
  intermediate: { zh: "共 4 輪，每輪之間休息 90 秒。", en: "4 rounds total, resting 90 seconds between rounds." },
  advanced: { zh: "共 5 輪，每輪之間休息 60 秒。", en: "5 rounds total, resting 60 seconds between rounds." },
};

const FUNCTIONAL_SCHEME: Scheme = {
  beginner: {
    zh: "站式循環：由上到下依序完成為一輪，共 3 輪，每輪之間休息 2 分鐘。動作不熟就用括號內的簡化版本。",
    en: "Standing circuit: work through the moves top to bottom for one round, 3 rounds total, resting 2 minutes between rounds. If a move is unfamiliar, use the simplified version in parentheses.",
  },
  intermediate: {
    zh: "共 4 輪，每輪之間休息 90 秒。記錄完成時間，下次挑戰更快。",
    en: "4 rounds total, resting 90 seconds between rounds. Record your time and try to beat it next time.",
  },
  advanced: {
    zh: "共 5 輪，每輪之間休息 60 秒，維持動作品質的前提下追求速度。",
    en: "5 rounds total, resting 60 seconds between rounds. Chase speed only as long as your form holds up.",
  },
};

/** General-fitness runs as an easier, balanced circuit — a bit of cardio,
 *  a bit of strength, a bit of mobility, nothing maximal. */
const GENERAL_SCHEME: Scheme = {
  beginner: {
    zh: "由上到下依序完成為一輪，共 3 輪，每輪之間休息 90 秒。強度以「有點喘但能聊天」為準。",
    en: "Work through the moves top to bottom for one round, 3 rounds total, resting 90 seconds between rounds. Keep intensity at \"a bit breathless but still able to chat.\"",
  },
  intermediate: { zh: "共 4 輪，每輪之間休息 75 秒。", en: "4 rounds total, resting 75 seconds between rounds." },
  advanced: { zh: "共 5 輪，每輪之間休息 60 秒。", en: "5 rounds total, resting 60 seconds between rounds." },
};

interface MainBlock {
  scheme: Scheme;
  focus: Bi;
  /** Exercise name + a single, level-independent prescription. */
  exercises: { name: Bi; rx: Bi }[];
}

export const MAIN_BLOCK: Record<
  TrainingGoal,
  Record<TrainingLocation, MainBlock>
> = {
  muscle_gain: {
    gym: {
      scheme: STRENGTH,
      focus: { zh: "全身肌力", en: "Full-body strength" },
      exercises: [
        { name: { zh: "史密斯機臥推", en: "Smith machine bench press" }, rx: { zh: "10 下", en: "10 reps" } },
        { name: { zh: "腿推機（Leg Press）", en: "Leg press" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "滑輪下拉", en: "Lat pulldown" }, rx: { zh: "10 下", en: "10 reps" } },
        { name: { zh: "啞鈴肩推", en: "Dumbbell shoulder press" }, rx: { zh: "10 下", en: "10 reps" } },
        { name: { zh: "坐姿划船機", en: "Seated cable row" }, rx: { zh: "12 下", en: "12 reps" } },
      ],
    },
    home: {
      scheme: STRENGTH,
      focus: { zh: "全身肌力（啞鈴）", en: "Full-body strength (dumbbells)" },
      exercises: [
        { name: { zh: "啞鈴臥推（或地板臥推）", en: "Dumbbell bench press (or floor press)" }, rx: { zh: "10 下", en: "10 reps" } },
        { name: { zh: "啞鈴酒杯深蹲", en: "Dumbbell goblet squat" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "啞鈴單臂划船", en: "Single-arm dumbbell row" }, rx: { zh: "左右各 10 下", en: "10 reps each side" } },
        { name: { zh: "啞鈴肩推", en: "Dumbbell shoulder press" }, rx: { zh: "10 下", en: "10 reps" } },
        {
          name: { zh: "啞鈴羅馬尼亞硬舉（屁股往後推、背打直）", en: "Dumbbell Romanian deadlift (hinge back, keep your back flat)" },
          rx: { zh: "12 下", en: "12 reps" },
        },
      ],
    },
    bodyweight: {
      scheme: STRENGTH,
      focus: { zh: "全身肌力（徒手）", en: "Full-body strength (bodyweight)" },
      exercises: [
        {
          name: { zh: "徒手深蹲（進階可放慢下蹲 3 秒）", en: "Bodyweight squat (advanced: 3-sec slow descent)" },
          rx: { zh: "15 下", en: "15 reps" },
        },
        { name: { zh: "弓步蹲（扶牆保持平衡）", en: "Lunge (hold a wall for balance)" }, rx: { zh: "左右各 10 下", en: "10 reps each side" } },
        { name: { zh: "伏地挺身（可跪姿或推牆）", en: "Push-up (kneeling or wall push-up okay)" }, rx: { zh: "8～12 下", en: "8–12 reps" } },
        { name: { zh: "臀橋（進階可單腳）", en: "Glute bridge (advanced: single-leg)" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "棒式（Plank）", en: "Plank" }, rx: { zh: "30～45 秒", en: "30–45 sec" } },
      ],
    },
    outdoor: {
      scheme: STRENGTH,
      focus: { zh: "全身肌力（戶外）", en: "Full-body strength (outdoor)" },
      exercises: [
        { name: { zh: "公園長椅深蹲", en: "Park bench squat" }, rx: { zh: "15 下", en: "15 reps" } },
        { name: { zh: "長椅抬升伏地挺身", en: "Incline push-up on a bench" }, rx: { zh: "10～12 下", en: "10–12 reps" } },
        { name: { zh: "階梯或路緣弓步蹲", en: "Step or curb lunge" }, rx: { zh: "左右各 10 下", en: "10 reps each side" } },
        { name: { zh: "長椅撐體臀橋", en: "Bench-supported hip thrust" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "棒式（Plank）", en: "Plank" }, rx: { zh: "30～45 秒", en: "30–45 sec" } },
      ],
    },
  },
  fat_loss: {
    gym: {
      scheme: CIRCUIT,
      focus: { zh: "全身循環（燃脂）", en: "Full-body circuit (fat burning)" },
      exercises: [
        { name: { zh: "腿推機（Leg Press）", en: "Leg press" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "坐姿划船機", en: "Seated cable row" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "胸推機（Chest Press）", en: "Chest press machine" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "滑輪下拉", en: "Lat pulldown" }, rx: { zh: "12 下", en: "12 reps" } },
        {
          name: { zh: "划船機或飛輪衝刺", en: "Rowing machine or bike sprint" },
          rx: { zh: "1 分鐘（微喘的速度）", en: "1 min (slightly breathless pace)" },
        },
      ],
    },
    home: {
      scheme: CIRCUIT,
      focus: { zh: "全身循環（啞鈴）", en: "Full-body circuit (dumbbells)" },
      exercises: [
        {
          name: { zh: "啞鈴酒杯深蹲（胸前抱啞鈴）", en: "Dumbbell goblet squat" },
          rx: { zh: "12 下", en: "12 reps" },
        },
        { name: { zh: "啞鈴單臂划船", en: "Single-arm dumbbell row" }, rx: { zh: "左右各 10 下", en: "10 reps each side" } },
        { name: { zh: "啞鈴肩推", en: "Dumbbell shoulder press" }, rx: { zh: "10 下", en: "10 reps" } },
        { name: { zh: "臀橋或彈力帶臀橋", en: "Glute bridge (band optional)" }, rx: { zh: "15 下", en: "15 reps" } },
        {
          name: { zh: "跳繩（可改開合跳或踏步）", en: "Jump rope (or jumping jacks / marching)" },
          rx: { zh: "1 分鐘", en: "1 min" },
        },
      ],
    },
    bodyweight: {
      scheme: CIRCUIT,
      focus: { zh: "全身循環（徒手）", en: "Full-body circuit (bodyweight)" },
      exercises: [
        { name: { zh: "徒手深蹲", en: "Bodyweight squat" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "伏地挺身（可跪姿）", en: "Push-up (kneeling okay)" }, rx: { zh: "8～10 下", en: "8–10 reps" } },
        {
          name: { zh: "登山者（手撐地交替抬膝）", en: "Mountain climbers" },
          rx: { zh: "30 秒", en: "30 sec" },
        },
        { name: { zh: "臀橋（躺姿抬臀）", en: "Glute bridge" }, rx: { zh: "15 下", en: "15 reps" } },
        {
          name: { zh: "原地高抬腿（可改快速踏步）", en: "High knees (or fast marching)" },
          rx: { zh: "30 秒", en: "30 sec" },
        },
      ],
    },
    outdoor: {
      scheme: CIRCUIT,
      focus: { zh: "戶外循環（燃脂）", en: "Outdoor circuit (fat burning)" },
      exercises: [
        { name: { zh: "快走或慢跑", en: "Brisk walk or jog" }, rx: { zh: "3 分鐘", en: "3 min" } },
        { name: { zh: "階梯或路緣上下踏步", en: "Step-ups on a curb or steps" }, rx: { zh: "1 分鐘", en: "1 min" } },
        { name: { zh: "公園長椅深蹲跳（簡化版：徒手深蹲）", en: "Bench squat jump (simplified: bodyweight squat)" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "登山者", en: "Mountain climbers" }, rx: { zh: "30 秒", en: "30 sec" } },
        { name: { zh: "短距離衝刺（30～50 公尺）", en: "Short sprint (30–50 m)" }, rx: { zh: "1 趟", en: "1 rep" } },
      ],
    },
  },
  functional: {
    gym: {
      scheme: FUNCTIONAL_SCHEME,
      focus: { zh: "混合式訓練（Hyrox / CrossFit）", en: "Mixed training (Hyrox / CrossFit)" },
      exercises: [
        { name: { zh: "划船機", en: "Rowing machine" }, rx: { zh: "250 公尺", en: "250 m" } },
        {
          name: { zh: "農夫走路（雙手提重物走直線）", en: "Farmer's carry (walk a straight line holding weights)" },
          rx: { zh: "20 公尺", en: "20 m" },
        },
        { name: { zh: "壺鈴擺盪", en: "Kettlebell swing" }, rx: { zh: "15 下", en: "15 reps" } },
        {
          name: { zh: "踏箱或箱上跳（簡化版：踏箱）", en: "Box jump (simplified: box step-up)" },
          rx: { zh: "10 下", en: "10 reps" },
        },
        {
          name: { zh: "藥球砸地（簡化版：深蹲抱球起立）", en: "Medicine ball slam (simplified: squat and stand with the ball)" },
          rx: { zh: "10 下", en: "10 reps" },
        },
      ],
    },
    home: {
      scheme: FUNCTIONAL_SCHEME,
      focus: { zh: "混合式訓練（啞鈴）", en: "Mixed training (dumbbells)" },
      exercises: [
        { name: { zh: "啞鈴農夫走路", en: "Dumbbell farmer's carry" }, rx: { zh: "30 秒", en: "30 sec" } },
        { name: { zh: "啞鈴擺盪", en: "Dumbbell swing" }, rx: { zh: "15 下", en: "15 reps" } },
        { name: { zh: "跳繩", en: "Jump rope" }, rx: { zh: "1 分鐘", en: "1 min" } },
        {
          name: { zh: "啞鈴深蹲推舉（蹲下、站起順勢上推）", en: "Dumbbell squat-to-press (squat down, drive up and press)" },
          rx: { zh: "10 下", en: "10 reps" },
        },
        {
          name: { zh: "波比跳（簡化版可分解動作）", en: "Burpee (break it into steps if needed)" },
          rx: { zh: "8 下", en: "8 reps" },
        },
      ],
    },
    bodyweight: {
      scheme: FUNCTIONAL_SCHEME,
      focus: { zh: "混合式訓練（徒手）", en: "Mixed training (bodyweight)" },
      exercises: [
        {
          name: { zh: "波比跳（簡化版：分解成蹲、後踩、站起）", en: "Burpee (simplified: break it into squat, step-back, stand)" },
          rx: { zh: "8 下", en: "8 reps" },
        },
        { name: { zh: "深蹲跳（簡化版：徒手深蹲）", en: "Jump squat (simplified: bodyweight squat)" }, rx: { zh: "10 下", en: "10 reps" } },
        { name: { zh: "登山者", en: "Mountain climbers" }, rx: { zh: "40 秒", en: "40 sec" } },
        {
          name: { zh: "弓步交替（簡化版：原地弓步蹲）", en: "Alternating lunges (simplified: static lunge)" },
          rx: { zh: "左右各 8 下", en: "8 reps each side" },
        },
        {
          name: { zh: "棒式肩碰（撐地輪流摸對側肩膀）", en: "Plank shoulder taps" },
          rx: { zh: "20 下", en: "20 reps" },
        },
      ],
    },
    outdoor: {
      scheme: FUNCTIONAL_SCHEME,
      focus: { zh: "混合式訓練（戶外）", en: "Mixed training (outdoor)" },
      exercises: [
        { name: { zh: "背包負重走路", en: "Weighted backpack carry" }, rx: { zh: "30 公尺", en: "30 m" } },
        { name: { zh: "階梯衝刺", en: "Stair sprint" }, rx: { zh: "1 趟", en: "1 rep" } },
        { name: { zh: "公園長椅箱上跳（簡化版：踏步）", en: "Bench step-jump (simplified: step-up)" }, rx: { zh: "10 下", en: "10 reps" } },
        { name: { zh: "登山者", en: "Mountain climbers" }, rx: { zh: "40 秒", en: "40 sec" } },
        { name: { zh: "熊爬（手腳並用向前爬行）", en: "Bear crawl" }, rx: { zh: "10 公尺", en: "10 m" } },
      ],
    },
  },
  general_fitness: {
    gym: {
      scheme: GENERAL_SCHEME,
      focus: { zh: "綜合體能（心肺＋肌力）", en: "General fitness (cardio + strength)" },
      exercises: [
        {
          name: { zh: "飛輪或跑步機穩定配速", en: "Steady-pace bike or treadmill" },
          rx: { zh: "3 分鐘（能聊天的強度）", en: "3 min (conversational pace)" },
        },
        { name: { zh: "腿推機（Leg Press）", en: "Leg press" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "坐姿划船機", en: "Seated cable row" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "滾筒或墊上伸展", en: "Foam-roll or mat stretch" }, rx: { zh: "1 分鐘", en: "1 min" } },
        { name: { zh: "棒式（Plank）", en: "Plank" }, rx: { zh: "30 秒", en: "30 sec" } },
      ],
    },
    home: {
      scheme: GENERAL_SCHEME,
      focus: { zh: "綜合體能（啞鈴）", en: "General fitness (dumbbells)" },
      exercises: [
        { name: { zh: "原地開合跳（膝蓋不適改踏步）", en: "Jumping jacks (step version if knees are sensitive)" }, rx: { zh: "45 秒", en: "45 sec" } },
        { name: { zh: "啞鈴酒杯深蹲", en: "Dumbbell goblet squat" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "啞鈴單臂划船", en: "Single-arm dumbbell row" }, rx: { zh: "左右各 10 下", en: "10 reps each side" } },
        { name: { zh: "弓步髖部伸展", en: "Lunge hip stretch" }, rx: { zh: "左右各 30 秒", en: "30 sec each side" } },
        { name: { zh: "棒式（Plank）", en: "Plank" }, rx: { zh: "30 秒", en: "30 sec" } },
      ],
    },
    bodyweight: {
      scheme: GENERAL_SCHEME,
      focus: { zh: "綜合體能（徒手）", en: "General fitness (bodyweight)" },
      exercises: [
        { name: { zh: "原地高抬腿", en: "High knees" }, rx: { zh: "30 秒", en: "30 sec" } },
        { name: { zh: "徒手深蹲", en: "Bodyweight squat" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "伏地挺身（可跪姿）", en: "Push-up (kneeling okay)" }, rx: { zh: "8～10 下", en: "8–10 reps" } },
        { name: { zh: "貓牛式（拱背、塌背交替）", en: "Cat-cow (alternate arching and dropping your back)" }, rx: { zh: "10 次", en: "10 reps" } },
        { name: { zh: "嬰兒式放鬆", en: "Child's pose release" }, rx: { zh: "1 分鐘", en: "1 min" } },
      ],
    },
    outdoor: {
      scheme: GENERAL_SCHEME,
      focus: { zh: "綜合體能（戶外）", en: "General fitness (outdoor)" },
      exercises: [
        { name: { zh: "輕鬆慢跑", en: "Easy jog" }, rx: { zh: "5 分鐘", en: "5 min" } },
        { name: { zh: "公園長椅深蹲", en: "Park bench squat" }, rx: { zh: "12 下", en: "12 reps" } },
        { name: { zh: "長椅抬升伏地挺身", en: "Incline push-up on a bench" }, rx: { zh: "8～10 下", en: "8–10 reps" } },
        { name: { zh: "動態腿部擺動伸展", en: "Dynamic leg swing stretch" }, rx: { zh: "左右各 30 秒", en: "30 sec each side" } },
        { name: { zh: "原地緩走收操", en: "Easy walk to finish" }, rx: { zh: "2 分鐘", en: "2 min" } },
      ],
    },
  },
};

/* ------------------------------------------------------------- notes */

/** Goal-specific reminders appended to the notes section. */
export const GOAL_NOTES: Record<TrainingGoal, Bi[]> = {
  muscle_gain: [
    {
      zh: "同一肌群之間至少間隔 48 小時再練，肌肉是在休息時長大的。",
      en: "Leave at least 48 hours before training the same muscle group again — muscle grows during rest, not during the workout.",
    },
    {
      zh: "能輕鬆完成目標次數時，下次小幅加重（2.5～5 公斤或換更難的版本）。",
      en: "Once a rep target feels easy, add a small amount of weight next time (2.5–5 kg, or move to a harder variation).",
    },
  ],
  fat_loss: [
    {
      zh: "減脂的關鍵在「每週總量」——寧可每次強度低一點，也要穩定出席。",
      en: "Fat loss comes down to weekly total volume — showing up consistently beats going all-out once and skipping the rest.",
    },
    {
      zh: "體重不是唯一指標，腰圍、照片與體力進步一樣重要。",
      en: "The scale isn't the only measure — waist size, progress photos, and how your fitness improves matter just as much.",
    },
  ],
  functional: [
    {
      zh: "混合式訓練「姿勢永遠優先於速度」——寧可慢，也不要亂。",
      en: "In mixed training, form always comes before speed — better slow and clean than fast and sloppy.",
    },
    {
      zh: "這類訓練強度高，安排在精神好的日子做，前後一天避免其他高強度訓練。",
      en: "This style of training is intense — schedule it on a day you feel fresh, and avoid other hard sessions the day before or after.",
    },
  ],
  general_fitness: [
    {
      zh: "綜合體能不追求單一極限，重點是心肺、肌力、柔軟度都不偏廢。",
      en: "General fitness isn't about maxing out one thing — the point is keeping cardio, strength, and mobility all in the mix.",
    },
    {
      zh: "覺得某天特別累，把強度降一階（重量減輕、輪數減少）也完全沒問題。",
      en: "If a day feels especially tiring, it's completely fine to dial the intensity down a notch — lighter weight, fewer rounds.",
    },
  ],
};

/** Location-specific reminders. */
export const LOCATION_NOTES: Record<TrainingLocation, Bi[]> = {
  gym: [
    {
      zh: "器材不熟悉時，先請現場教練或陪練示範一次再上重量。",
      en: "If you're unfamiliar with a machine, ask a gym staff member or your training partner to demonstrate it before adding weight.",
    },
  ],
  home: [
    {
      zh: "空間有限時，動作前先確認四周有足夠揮動半徑，避免撞到家具。",
      en: "With limited space, check you have enough room to move before each exercise so you don't bump into furniture.",
    },
  ],
  bodyweight: [
    {
      zh: "選擇防滑的地面與足夠的活動空間，使用椅子輔助時先確認穩固。",
      en: "Train on a non-slip surface with enough room to move, and make sure any chair you use for support is stable.",
    },
  ],
  outdoor: [
    {
      zh: "選擇平坦防滑的地面，留意天氣與補水，夜間訓練請選擇照明充足的地方。",
      en: "Pick flat, non-slip ground, watch the weather and stay hydrated, and choose a well-lit spot if training at night.",
    },
  ],
};

/** Always-on safety reminders. */
export const GENERIC_NOTES: Bi[] = [
  {
    zh: "任何動作出現尖銳疼痛（不是肌肉痠）立即停止。",
    en: "Stop immediately if any movement causes sharp pain (not just muscle soreness).",
  },
  {
    zh: "訓練中分次小口補水，結束後補充水分與蛋白質。",
    en: "Sip water in small amounts throughout the session, and replenish fluids and protein afterward.",
  },
];

/* -------------------------------------------------------------- diet */

export const DIET_LABEL: Record<DietMode, Bi> = {
  none: { zh: "均衡飲食", en: "Balanced Diet" },
  muscle_gain: { zh: "增肌飲食", en: "Muscle-Gain Diet" },
  fat_loss: { zh: "減脂飲食", en: "Fat-Loss Diet" },
  intermittent_fasting: { zh: "間歇性斷食", en: "Intermittent Fasting" },
};

export const DIET_SECTION: Record<DietMode, DietGuidance> = {
  none: {
    label: DIET_LABEL.none,
    body: [
      {
        zh: "沒有特定飲食法也沒關係，把握三個原則：原型食物為主（看得出食材原本樣子的食物）、每餐一掌心大小的蛋白質、蔬菜占餐盤的一半。",
        en: "No specific diet needed — stick to three principles: mostly whole foods (food you can still recognize the original ingredients of), a palm-sized portion of protein each meal, and vegetables filling half your plate.",
      },
      {
        zh: "訓練前 1～2 小時吃一份好消化的碳水（香蕉、吐司、飯糰）；訓練後 1 小時內補充蛋白質與碳水，幫助恢復。",
        en: "Eat an easy-to-digest carb 1–2 hours before training (banana, toast, rice ball); replenish protein and carbs within 1 hour after training to help recovery.",
      },
      {
        zh: "每日補水約 2～3 公升，含糖飲料盡量以無糖茶或氣泡水取代。",
        en: "Drink about 2–3 liters of water a day, and swap sugary drinks for unsweetened tea or sparkling water where you can.",
      },
    ],
    byGender: {
      male: {
        zh: "男性可以把蛋白質抓在每公斤體重 1.4～1.8 公克，平均分配到三餐。",
        en: "Men can target 1.4–1.8 g of protein per kg of body weight, spread evenly across three meals.",
      },
      female: {
        zh: "女性可以把蛋白質抓在每公斤體重 1.2~1.6 公克，平均分配到三餐。",
        en: "Women can target 1.2–1.6 g of protein per kg of body weight, spread evenly across three meals.",
      },
    },
  },
  muscle_gain: {
    label: DIET_LABEL.muscle_gain,
    body: [
      {
        zh: "增肌需要熱量盈餘：比平常多吃一點，但以原型食物為主，不是垃圾食物放題。",
        en: "Building muscle needs a calorie surplus — eat a bit more than usual, but keep it mostly whole foods, not a junk-food free-for-all.",
      },
      {
        zh: "蛋白質每公斤體重 1.6～2.0 公克，平均分配到每餐；來源如雞胸、牛肉、雞蛋、豆腐、乳清。",
        en: "Aim for 1.6–2.0 g of protein per kg of body weight, spread evenly across meals — think chicken breast, beef, eggs, tofu, whey.",
      },
      {
        zh: "碳水是訓練的燃料——把較多份量安排在訓練前 2 小時與訓練後，選糙米、地瓜、燕麥、白飯都可以。",
        en: "Carbs fuel your training — put the bigger portions in the 2 hours before training and right after. Brown rice, sweet potato, oats, or white rice all work.",
      },
      {
        zh: "補給邏輯：訓練後 1 小時內補「蛋白質＋碳水」（例如乳清＋香蕉），效果最好也最省事。",
        en: "The simple rule: within 1 hour post-training, have protein + carbs together (e.g. whey + a banana) — effective and easy.",
      },
    ],
    byGender: {
      male: {
        zh: "男性建議每日比維持熱量多 300～400 大卡，目標每週增重約 0.25～0.5 公斤。",
        en: "Men should aim for roughly 300–400 extra calories a day above maintenance, targeting about 0.25–0.5 kg of gain per week.",
      },
      female: {
        zh: "女性建議每日比維持熱量多 200～300 大卡，緩慢增重就是增肌的正確速度。",
        en: "Women should aim for roughly 200–300 extra calories a day above maintenance — slow, steady gain is the right pace for building muscle.",
      },
    },
    heavyNote: {
      zh: "體重基數較大時，熱量盈餘抓下緣即可，甚至維持熱量搭配肌力訓練也能「增肌同時減脂」。",
      en: "At a higher starting body weight, keep the surplus small — even eating at maintenance while strength training can build muscle and lose fat at the same time.",
    },
  },
  fat_loss: {
    label: DIET_LABEL.fat_loss,
    body: [
      {
        zh: "減脂需要熱量赤字：每日比維持熱量少 300～500 大卡就好，砍太兇會掉肌肉、也撐不久。",
        en: "Fat loss needs a calorie deficit — just 300–500 calories a day below maintenance is enough. Cutting too hard costs you muscle and isn't sustainable.",
      },
      {
        zh: "蛋白質反而要吃多：每公斤體重 1.6～2.2 公克，保住肌肉、也比較不容易餓。",
        en: "Eat more protein, not less: 1.6–2.2 g per kg of body weight helps preserve muscle and keeps you fuller.",
      },
      {
        zh: "碳水不用戒，安排在訓練前後最划算；先戒的是含糖飲料與油炸物。",
        en: "No need to cut carbs entirely — put them around your training for the best payoff. Cut sugary drinks and fried food first instead.",
      },
      {
        zh: "補給邏輯：訓練後補一份蛋白質（乳清、茶葉蛋、無糖豆漿），正餐照常吃、不要跳過。",
        en: "The simple rule: have a protein source after training (whey, a boiled egg, unsweetened soy milk) — keep eating your regular meals, don't skip them.",
      },
    ],
    byGender: {
      male: {
        zh: "男性每日熱量不要低於 1500 大卡——吃太少身體會「省電」，反而更難瘦。",
        en: "Men shouldn't go below 1,500 calories a day — eating too little makes your body go into \"power-saving mode,\" which actually makes losing fat harder.",
      },
      female: {
        zh: "女性每日熱量不要低於 1200 大卡——吃太少身體會「省電」，反而更難瘦。",
        en: "Women shouldn't go below 1,200 calories a day — eating too little makes your body go into \"power-saving mode,\" which actually makes losing fat harder.",
      },
    },
    heavyNote: {
      zh: "體重基數較大時，初期光是「戒含糖飲料＋每天走 8000 步」就會有明顯進展，先做到這兩件事。",
      en: "At a higher starting body weight, just cutting sugary drinks and walking 8,000 steps a day will show noticeable progress early on — start with those two things.",
    },
  },
  intermittent_fasting: {
    label: DIET_LABEL.intermittent_fasting,
    body: [
      {
        zh: "常見做法是 16/8：一天中 8 小時內吃完所有餐點（例如中午 12 點到晚上 8 點），其餘時間只喝水、黑咖啡或無糖茶。",
        en: "A common approach is 16/8: eat all your meals within an 8-hour window (say, 12 pm to 8 pm), and stick to water, black coffee, or unsweetened tea the rest of the time.",
      },
      {
        zh: "斷食改變的是「什麼時候吃」，不是「可以亂吃」——進食窗口內仍以原型食物與足量蛋白質為主。",
        en: "Fasting changes *when* you eat, not a license to eat anything — inside your eating window, still prioritize whole foods and enough protein.",
      },
      {
        zh: "補給邏輯：訓練盡量安排在進食窗口內或窗口開始前 1 小時，訓練後在窗口內補「蛋白質＋碳水」。",
        en: "The simple rule: schedule training inside your eating window, or up to 1 hour before it starts, and refuel with protein + carbs inside the window afterward.",
      },
      {
        zh: "剛開始的 1～2 週會比較容易餓，是正常的適應期；頭暈、無力就先縮短斷食時間。",
        en: "The first 1–2 weeks are commonly hungrier — that's a normal adjustment period. If you feel dizzy or weak, shorten the fasting window.",
      },
    ],
    byGender: {
      male: {
        zh: "男性在進食窗口內仍要把蛋白質吃到每公斤體重 1.6 公克以上，餐數少、每餐份量就要大。",
        en: "Men should still hit at least 1.6 g of protein per kg of body weight inside the eating window — with fewer meals, make each one bigger.",
      },
      female: {
        zh: "女性若出現生理期不規律或睡眠變差，請放寬斷食時間（例如改 14/10）或先暫停。",
        en: "If your cycle becomes irregular or your sleep gets worse, ease up on the fasting window (e.g. switch to 14/10) or pause fasting for a while.",
      },
    },
    heavyNote: {
      zh: "體重基數較大時，斷食初期效果通常明顯，但請搭配肌力訓練與足量蛋白質，減的才是脂肪不是肌肉。",
      en: "At a higher starting body weight, fasting often shows results quickly early on — but pair it with strength training and enough protein so what you lose is fat, not muscle.",
    },
  },
};

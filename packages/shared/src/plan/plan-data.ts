import type {
  AgeBand,
  DietMode,
  TrainingFrequency,
  TrainingGoal,
  TrainingLocation,
  WeightClass,
} from "../enums/training";
import type { ExperienceLevel } from "../enums/experience";
import type { PlanGender } from "../enums/gender";

/**
 * Authored content for the AI training-menu composer. Everything here is
 * written in plain, beginner-safe zh (no pro jargon) — the composer assembles
 * these blocks into a fixed 60-minute session:
 * 暖身 10 分鐘 ＋ 主訓練 40 分鐘 ＋ 收操 10 分鐘.
 */

/* ---------------------------------------------------------------- labels */

export const GOAL_TITLE: Record<TrainingGoal, string> = {
  fat_loss: "減脂塑形",
  muscle_gain: "增肌訓練",
  endurance: "耐力提升",
  flexibility: "柔韌伸展",
  functional: "功能性表現",
};

export const GOAL_INTRO: Record<TrainingGoal, string> = {
  fat_loss: "有氧與肌力交替，提高心跳、多消耗熱量，同時保住肌肉",
  muscle_gain: "以基本肌力動作為主，循序加重，穩穩把肌肉練起來",
  endurance: "用間歇與穩定配速練心肺，讓你越動越不容易喘",
  flexibility: "全身伸展與放鬆，改善緊繃、增加活動度",
  functional: "Hyrox / CrossFit 式混合訓練，心肺與爆發力一起練",
};

export const GENDER_LABEL: Record<PlanGender, string> = {
  male: "男性",
  female: "女性",
};

export const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  beginner: "初學者",
  intermediate: "中級",
  advanced: "進階",
};

export const LOCATION_LABEL: Record<TrainingLocation, string> = {
  home: "居家徒手",
  full_gym: "全功能健身房",
  limited_gym: "有限器材健身房",
};

/* ------------------------------------------------------------- age notes */

/** Short age-band framing prepended to every plan (locale follows the UI). */
export const AGE_NOTE: Record<AgeBand, { zh: string; en: string }> = {
  youth: {
    zh: "**年齡層提醒（青少年 15–25）：** 身體恢復快，重點放在學會正確姿勢與建立規律運動習慣，避免過度訓練與比較重量。",
    en: "**Age note (Youth 15–25):** You recover fast — focus on learning proper form and building a consistent habit rather than chasing heavy loads.",
  },
  adult: {
    zh: "**年齡層提醒（成人 26–45）：** 時間有限，重視訓練效率與作息平衡，安排好工作、訓練與恢復的節奏。",
    en: "**Age note (Adult 26–45):** Time is tight — prioritise training efficiency and balance work, training, and recovery.",
  },
  senior: {
    zh: "**年齡層提醒（熟齡 46+）：** 關節與恢復需多留意，加強暖身、循序漸進，必要時先諮詢專業教練或醫師。",
    en: "**Age note (Senior 46+):** Mind your joints and recovery — warm up thoroughly, progress gradually, and check with a coach or doctor when in doubt.",
  },
};

/* ----------------------------------------------- weight-class guidance */

/** Body-type guidance, interpreted per gender. */
export const WEIGHT_NOTE: Record<PlanGender, Record<WeightClass, string>> = {
  male: {
    slim: "**體型提醒（纖細）：** 目標是把訓練重量與食量一起慢慢加上去。動作標準的前提下，每 1～2 週小幅加重；正餐吃足，不要空腹訓練。",
    medium:
      "**體型提醒（中等）：** 維持目前節奏即可，重點放在動作品質與每週穩定出席，強度循序漸進。",
    heavy:
      "**體型提醒（肥胖）：** 先以低衝擊動作為主，菜單中的跳躍動作一律可以改成踏步版本，保護膝蓋與腳踝；強度以「能講話但微喘」為準。",
  },
  female: {
    slim: "**體型提醒（纖細）：** 不用擔心「練壯」——肌力訓練只會讓線條更好看。重點是蛋白質吃足、循序加重，避免長時間空腹做有氧。",
    medium:
      "**體型提醒（中等）：** 維持穩定的訓練頻率，重量或次數每 1～2 週小幅增加，搭配充足睡眠效果最好。",
    heavy:
      "**體型提醒（肥胖）：** 以低衝擊動作為主，菜單中的跳躍動作一律可以改成踏步版本；先建立規律再談強度，關節不舒服就立刻換動作。",
  },
};

/* -------------------------------------------------- weekly schedule */

export const FREQUENCY_LABEL: Record<TrainingFrequency, string> = {
  low: "一週 1–2 天",
  mid: "一週 3–4 天",
  high: "一週 5 天以上",
};

interface WeeklySchedule {
  /** Rows of [day, arrangement] for the weekly table. */
  rows: [string, string][];
  note: string;
}

export const WEEKLY_SCHEDULE: Record<TrainingFrequency, WeeklySchedule> = {
  low: {
    rows: [
      ["週一", "本菜單（60 分鐘）"],
      ["週二", "休息"],
      ["週三", "休息 / 散步 20 分鐘"],
      ["週四", "本菜單（60 分鐘，可省略）"],
      ["週五", "休息"],
      ["週六", "休息 / 戶外活動"],
      ["週日", "完全休息"],
    ],
    note: "訓練天數較少時，每次請完整做完 60 分鐘，平日多走路、爬樓梯，把日常活動量補起來。",
  },
  mid: {
    rows: [
      ["週一", "本菜單（60 分鐘）"],
      ["週二", "休息 / 輕鬆走路"],
      ["週三", "本菜單（60 分鐘）"],
      ["週四", "休息"],
      ["週五", "本菜單（60 分鐘）"],
      ["週六", "輕鬆有氧或伸展 30 分鐘（可選）"],
      ["週日", "完全休息"],
    ],
    note: "隔天訓練、隔天恢復是最穩的節奏；睡眠充足時進步最快。",
  },
  high: {
    rows: [
      ["週一", "本菜單（60 分鐘）"],
      ["週二", "本菜單（60 分鐘）"],
      ["週三", "本菜單（60 分鐘）"],
      ["週四", "本菜單（60 分鐘）"],
      ["週五", "本菜單（60 分鐘）"],
      ["週六", "輕鬆有氧 30 分鐘"],
      ["週日", "完全休息"],
    ],
    note: "連續訓練日請避免同一部位連續高強度——可以和其他目標的菜單交替，並確保每晚睡足 7 小時。",
  },
};

/* --------------------------------------------------------- warm-ups */

/** 10-minute warm-up, constrained by where the user trains. */
export const WARMUP: Record<TrainingLocation, string[]> = {
  home: [
    "原地快走或輕鬆踏步 — 3 分鐘（讓身體熱起來、微微出汗）",
    "手臂繞環＋肩膀前後轉動 — 2 分鐘",
    "徒手深蹲（慢速、蹲到舒服的深度）— 2 分鐘",
    "髖部畫圈＋腿部前後擺動（扶牆保持平衡）— 2 分鐘",
    "手腕、腳踝繞環 — 1 分鐘",
  ],
  full_gym: [
    "固定式單車或跑步機快走 — 4 分鐘（輕鬆、能聊天的強度）",
    "動態伸展：手臂繞環、髖部畫圈、腿部擺動 — 3 分鐘",
    "今天第一個動作的輕重量練習 1～2 組 — 3 分鐘",
  ],
  limited_gym: [
    "跳繩或原地開合跳（膝蓋不適改踏步）— 3 分鐘",
    "動態伸展：手臂繞環、髖部畫圈、腿部擺動 — 3 分鐘",
    "彈力帶或輕啞鈴肩膀啟動 — 2 分鐘",
    "今天第一個動作的輕重量練習 1 組 — 2 分鐘",
  ],
};

/* -------------------------------------------------------- cool-down */

/** 10-minute cool-down, shared across goals. */
export const COOLDOWN: string[] = [
  "原地緩和走動＋深呼吸 — 2 分鐘（讓心跳慢慢降下來）",
  "大腿前側伸展（扶牆抓腳背）— 左右各 1 分鐘",
  "大腿後側伸展（坐姿前彎或站姿體前彎）— 2 分鐘",
  "胸口與肩膀伸展（雙手背後互扣挺胸）— 2 分鐘",
  "背部與髖部伸展（嬰兒式或抱膝）— 2 分鐘",
];

/* ------------------------------------------------------ main blocks */

/** How to run the block at each level (rounds / sets / rest scheme). */
type Scheme = Record<ExperienceLevel, string>;

const STRENGTH: Scheme = {
  beginner:
    "每個動作做 3 組，組間休息 90 秒。重量選「做完最後一下仍能保持標準姿勢」的重量。",
  intermediate: "每個動作做 4 組，組間休息 75 秒。",
  advanced:
    "每個動作做 4 組，組間休息 60～75 秒，最後一組做到「還剩 1 下力氣」即可，不必力竭。",
};

const CIRCUIT: Scheme = {
  beginner:
    "由上到下依序完成所有動作為一輪，共 3 輪，每輪之間休息 2 分鐘。做不動就放慢速度，不要停。",
  intermediate: "共 4 輪，每輪之間休息 90 秒。",
  advanced: "共 5 輪，每輪之間休息 60 秒。",
};

const FLEX_SCHEME: Scheme = {
  beginner:
    "由上到下依序完成為一輪，共 2 輪。伸展到「有點緊但不痛」的程度就好，全程保持呼吸。",
  intermediate: "共 3 輪，每個停留時間可以加長 15 秒。",
  advanced: "共 3 輪，配合深呼吸慢慢加深幅度，不要彈震。",
};

const FUNCTIONAL_SCHEME: Scheme = {
  beginner:
    "站式循環：由上到下依序完成為一輪，共 3 輪，每輪之間休息 2 分鐘。動作不熟就用括號內的簡化版本。",
  intermediate: "共 4 輪，每輪之間休息 90 秒。記錄完成時間，下次挑戰更快。",
  advanced: "共 5 輪，每輪之間休息 60 秒，維持動作品質的前提下追求速度。",
};

interface MainBlock {
  scheme: Scheme;
  /** Exercise name + a single, level-independent prescription. */
  exercises: { name: string; rx: string }[];
}

export const MAIN_BLOCK: Record<
  TrainingGoal,
  Record<TrainingLocation, MainBlock>
> = {
  fat_loss: {
    home: {
      scheme: CIRCUIT,
      exercises: [
        { name: "徒手深蹲", rx: "12 下" },
        { name: "伏地挺身（可跪姿）", rx: "8～10 下" },
        { name: "登山者（手撐地交替抬膝）", rx: "30 秒" },
        { name: "臀橋（躺姿抬臀）", rx: "15 下" },
        { name: "原地高抬腿（可改快速踏步）", rx: "30 秒" },
      ],
    },
    full_gym: {
      scheme: CIRCUIT,
      exercises: [
        { name: "腿推機（Leg Press）", rx: "12 下" },
        { name: "坐姿划船機", rx: "12 下" },
        { name: "胸推機（Chest Press）", rx: "12 下" },
        { name: "滑輪下拉", rx: "12 下" },
        { name: "划船機或飛輪衝刺", rx: "1 分鐘（微喘的速度）" },
      ],
    },
    limited_gym: {
      scheme: CIRCUIT,
      exercises: [
        { name: "啞鈴酒杯深蹲（胸前抱啞鈴）", rx: "12 下" },
        { name: "啞鈴單臂划船", rx: "左右各 10 下" },
        { name: "啞鈴肩推", rx: "10 下" },
        { name: "臀橋或彈力帶臀橋", rx: "15 下" },
        { name: "跳繩（可改開合跳或踏步）", rx: "1 分鐘" },
      ],
    },
  },
  muscle_gain: {
    home: {
      scheme: STRENGTH,
      exercises: [
        { name: "徒手深蹲（進階可放慢下蹲 3 秒）", rx: "15 下" },
        { name: "弓步蹲（扶牆保持平衡）", rx: "左右各 10 下" },
        { name: "伏地挺身（可跪姿或推牆）", rx: "8～12 下" },
        { name: "臀橋（進階可單腳）", rx: "12 下" },
        { name: "棒式（Plank）", rx: "30～45 秒" },
      ],
    },
    full_gym: {
      scheme: STRENGTH,
      exercises: [
        { name: "史密斯機臥推", rx: "10 下" },
        { name: "腿推機（Leg Press）", rx: "12 下" },
        { name: "滑輪下拉", rx: "10 下" },
        { name: "啞鈴肩推", rx: "10 下" },
        { name: "坐姿划船機", rx: "12 下" },
      ],
    },
    limited_gym: {
      scheme: STRENGTH,
      exercises: [
        { name: "啞鈴臥推（或地板臥推）", rx: "10 下" },
        { name: "啞鈴酒杯深蹲", rx: "12 下" },
        { name: "啞鈴單臂划船", rx: "左右各 10 下" },
        { name: "啞鈴肩推", rx: "10 下" },
        { name: "啞鈴羅馬尼亞硬舉（屁股往後推、背打直）", rx: "12 下" },
      ],
    },
  },
  endurance: {
    home: {
      scheme: CIRCUIT,
      exercises: [
        { name: "原地高抬腿", rx: "45 秒" },
        { name: "開合跳（膝蓋不適改踏步開合）", rx: "45 秒" },
        { name: "登山者", rx: "30 秒" },
        { name: "波比跳（簡化版：不做伏地挺身）", rx: "8 下" },
        { name: "原地慢跑或踏步恢復", rx: "90 秒（調整呼吸）" },
      ],
    },
    full_gym: {
      scheme: {
        beginner:
          "跑步機、飛輪或划船機擇一。「快」= 微喘、勉強能講短句；「慢」= 輕鬆能聊天。快慢段共做 6 回合。",
        intermediate: "快慢段共做 8 回合，「快」段可以再快一點。",
        advanced: "快慢段共做 10 回合，最後 2 回合挑戰維持速度不掉。",
      },
      exercises: [
        { name: "輕鬆配速起步", rx: "5 分鐘" },
        { name: "快段", rx: "1 分鐘" },
        { name: "慢段（恢復）", rx: "2 分鐘" },
        { name: "穩定配速收尾", rx: "8 分鐘（能講話的強度）" },
      ],
    },
    limited_gym: {
      scheme: CIRCUIT,
      exercises: [
        { name: "跳繩", rx: "1 分鐘" },
        { name: "啞鈴擺盪（屁股往後推再往前甩）", rx: "15 下" },
        { name: "登山者", rx: "30 秒" },
        { name: "踏箱或階梯踏步", rx: "左右各 10 下" },
        { name: "走動恢復", rx: "1 分鐘" },
      ],
    },
  },
  flexibility: {
    home: {
      scheme: FLEX_SCHEME,
      exercises: [
        { name: "貓牛式（四足跪姿拱背、塌背交替）", rx: "10 次" },
        { name: "下犬式停留", rx: "30 秒" },
        { name: "弓步髖部伸展（前腿弓、後腿跪）", rx: "左右各 45 秒" },
        { name: "坐姿前彎（摸向腳尖，不用碰到）", rx: "45 秒" },
        { name: "嬰兒式放鬆", rx: "1 分鐘" },
      ],
    },
    full_gym: {
      scheme: FLEX_SCHEME,
      exercises: [
        { name: "滾筒放鬆大腿前側與外側", rx: "各 1 分鐘" },
        { name: "滾筒放鬆上背", rx: "1 分鐘" },
        { name: "貓牛式", rx: "10 次" },
        { name: "弓步髖部伸展", rx: "左右各 45 秒" },
        { name: "坐姿前彎", rx: "45 秒" },
      ],
    },
    limited_gym: {
      scheme: FLEX_SCHEME,
      exercises: [
        { name: "彈力帶腿後側伸展（躺姿勾腳拉帶）", rx: "左右各 45 秒" },
        { name: "貓牛式", rx: "10 次" },
        { name: "下犬式停留", rx: "30 秒" },
        { name: "弓步髖部伸展", rx: "左右各 45 秒" },
        { name: "嬰兒式放鬆", rx: "1 分鐘" },
      ],
    },
  },
  functional: {
    home: {
      scheme: FUNCTIONAL_SCHEME,
      exercises: [
        { name: "波比跳（簡化版：分解成蹲、後踩、站起）", rx: "8 下" },
        { name: "深蹲跳（簡化版：徒手深蹲）", rx: "10 下" },
        { name: "登山者", rx: "40 秒" },
        { name: "弓步交替（簡化版：原地弓步蹲）", rx: "左右各 8 下" },
        { name: "棒式肩碰（撐地輪流摸對側肩膀）", rx: "20 下" },
      ],
    },
    full_gym: {
      scheme: FUNCTIONAL_SCHEME,
      exercises: [
        { name: "划船機", rx: "250 公尺" },
        { name: "農夫走路（雙手提重物走直線）", rx: "20 公尺" },
        { name: "壺鈴擺盪", rx: "15 下" },
        { name: "踏箱或箱上跳（簡化版：踏箱）", rx: "10 下" },
        { name: "藥球砸地（簡化版：深蹲抱球起立）", rx: "10 下" },
      ],
    },
    limited_gym: {
      scheme: FUNCTIONAL_SCHEME,
      exercises: [
        { name: "啞鈴農夫走路", rx: "30 秒" },
        { name: "啞鈴擺盪", rx: "15 下" },
        { name: "跳繩", rx: "1 分鐘" },
        { name: "啞鈴深蹲推舉（蹲下、站起順勢上推）", rx: "10 下" },
        { name: "波比跳（簡化版可分解動作）", rx: "8 下" },
      ],
    },
  },
};

/* ------------------------------------------------------------- notes */

/** Goal-specific reminders appended to the 注意事項 section. */
export const GOAL_NOTES: Record<TrainingGoal, string[]> = {
  fat_loss: [
    "減脂的關鍵在「每週總量」——寧可每次強度低一點，也要穩定出席。",
    "體重不是唯一指標，腰圍、照片與體力進步一樣重要。",
  ],
  muscle_gain: [
    "同一肌群之間至少間隔 48 小時再練，肌肉是在休息時長大的。",
    "能輕鬆完成目標次數時，下次小幅加重（2.5～5 公斤或換更難的版本）。",
  ],
  endurance: [
    "「快」的標準是微喘但不至於說不出話；喘到頭暈就立刻放慢。",
    "耐力進步需要 4～6 週的累積，先求完成、再求速度。",
  ],
  flexibility: [
    "伸展到「有點緊但不痛」即可，疼痛表示過頭了。",
    "每個停留都配合深呼吸，吐氣時再多沉一點點。",
  ],
  functional: [
    "混合式訓練「姿勢永遠優先於速度」——寧可慢，也不要亂。",
    "這類訓練強度高，安排在精神好的日子做，前後一天避免其他高強度訓練。",
  ],
};

/** Location-specific reminders. */
export const LOCATION_NOTES: Record<TrainingLocation, string[]> = {
  home: [
    "選擇防滑的地面與足夠的活動空間，使用椅子輔助時先確認穩固。",
  ],
  full_gym: [
    "器材不熟悉時，先請現場教練或陪練師示範一次再上重量。",
  ],
  limited_gym: [
    "器材被占用時，直接換成菜單中其他動作的順序，不要空等。",
  ],
};

/** Always-on safety reminders. */
export const GENERIC_NOTES: string[] = [
  "任何動作出現尖銳疼痛（不是肌肉痠）立即停止。",
  "訓練中分次小口補水，結束後補充水分與蛋白質。",
];

/* -------------------------------------------------------------- diet */

export const DIET_LABEL: Record<DietMode, string> = {
  none: "均衡飲食",
  muscle_gain: "增肌飲食",
  fat_loss: "減脂飲食",
  intermittent_fasting: "間歇性斷食",
};

interface DietSection {
  body: string[];
  /** Gender-specific calorie / intake framing. */
  byGender: Record<PlanGender, string>;
  /** Extra tuning for the heavy weight class (optional). */
  heavyNote?: string;
}

export const DIET_SECTION: Record<DietMode, DietSection> = {
  none: {
    body: [
      "沒有特定飲食法也沒關係，把握三個原則：原型食物為主（看得出食材原本樣子的食物）、每餐一掌心大小的蛋白質、蔬菜占餐盤的一半。",
      "訓練前 1～2 小時吃一份好消化的碳水（香蕉、吐司、飯糰）；訓練後 1 小時內補充蛋白質與碳水，幫助恢復。",
      "每日補水約 2～3 公升，含糖飲料盡量以無糖茶或氣泡水取代。",
    ],
    byGender: {
      male: "男性可以把蛋白質抓在每公斤體重 1.4～1.8 公克，平均分配到三餐。",
      female: "女性可以把蛋白質抓在每公斤體重 1.2~1.6 公克，平均分配到三餐。",
    },
  },
  muscle_gain: {
    body: [
      "增肌需要熱量盈餘：比平常多吃一點，但以原型食物為主，不是垃圾食物放題。",
      "蛋白質每公斤體重 1.6～2.0 公克，平均分配到每餐；來源如雞胸、牛肉、雞蛋、豆腐、乳清。",
      "碳水是訓練的燃料——把較多份量安排在訓練前 2 小時與訓練後，選糙米、地瓜、燕麥、白飯都可以。",
      "補給邏輯：訓練後 1 小時內補「蛋白質＋碳水」（例如乳清＋香蕉），效果最好也最省事。",
    ],
    byGender: {
      male: "男性建議每日比維持熱量多 300～400 大卡，目標每週增重約 0.25～0.5 公斤。",
      female: "女性建議每日比維持熱量多 200～300 大卡，緩慢增重就是增肌的正確速度。",
    },
    heavyNote:
      "體重基數較大時，熱量盈餘抓下緣即可，甚至維持熱量搭配肌力訓練也能「增肌同時減脂」。",
  },
  fat_loss: {
    body: [
      "減脂需要熱量赤字：每日比維持熱量少 300～500 大卡就好，砍太兇會掉肌肉、也撐不久。",
      "蛋白質反而要吃多：每公斤體重 1.6～2.2 公克，保住肌肉、也比較不容易餓。",
      "碳水不用戒，安排在訓練前後最划算；先戒的是含糖飲料與油炸物。",
      "補給邏輯：訓練後補一份蛋白質（乳清、茶葉蛋、無糖豆漿），正餐照常吃、不要跳過。",
    ],
    byGender: {
      male: "男性每日熱量不要低於 1500 大卡——吃太少身體會「省電」，反而更難瘦。",
      female: "女性每日熱量不要低於 1200 大卡——吃太少身體會「省電」，反而更難瘦。",
    },
    heavyNote:
      "體重基數較大時，初期光是「戒含糖飲料＋每天走 8000 步」就會有明顯進展，先做到這兩件事。",
  },
  intermittent_fasting: {
    body: [
      "常見做法是 16/8：一天中 8 小時內吃完所有餐點（例如中午 12 點到晚上 8 點），其餘時間只喝水、黑咖啡或無糖茶。",
      "斷食改變的是「什麼時候吃」，不是「可以亂吃」——進食窗口內仍以原型食物與足量蛋白質為主。",
      "補給邏輯：訓練盡量安排在進食窗口內或窗口開始前 1 小時，訓練後在窗口內補「蛋白質＋碳水」。",
      "剛開始的 1～2 週會比較容易餓，是正常的適應期；頭暈、無力就先縮短斷食時間。",
    ],
    byGender: {
      male: "男性在進食窗口內仍要把蛋白質吃到每公斤體重 1.6 公克以上，餐數少、每餐份量就要大。",
      female: "女性若出現生理期不規律或睡眠變差，請放寬斷食時間（例如改 14/10）或先暫停。",
    },
    heavyNote:
      "體重基數較大時，斷食初期效果通常明顯，但請搭配肌力訓練與足量蛋白質，減的才是脂肪不是肌肉。",
  },
};

/** Shown under the diet section for youth users — IF safety caveat. */
export const IF_YOUTH_CAUTION =
  "**提醒：** 青少年成長期不建議長時間斷食，若未滿 18 歲請改用均衡飲食即可。";

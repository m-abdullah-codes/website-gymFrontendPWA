/**
 * Meal suggestion & macro tracking engine — TypeScript port of the reference
 * implementation (temp-meals-engine/meal-engine.js, 61-assertion suite).
 * All functions are pure; the annotated food DB comes from ./db.
 *
 * Science: BMR via Mifflin-St Jeor; TDEE from daily-life activity + training
 * days + cardio; calories goal-adjusted with safety floors (1200F/1500M);
 * protein 1.6–2.2 g/kg (ISSN-aligned); fat 25–28% kcal; carbs remainder.
 */
import type {
  ActivityLevel,
  AdjustResult,
  AnnotatedFoodItem,
  DayLog,
  DayPlan,
  DaySummary,
  FoodDb,
  FoodItem,
  FoodRole,
  LogEntry,
  MacroTargets,
  Macros,
  MealGoal,
  MealProfile,
  MealTime,
  PlanItem,
  PlanSlot,
  RemainingSuggestion,
  SwapOption,
  WeighIn,
} from "./types";

/* ======================================================================
 * 0. Small utilities
 * ==================================================================== */
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
const round = (x: number, dp = 0) => {
  const m = Math.pow(10, dp);
  return Math.round(x * m) / m;
};

function hashStr(s: string): number {
  // FNV-1a
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayISO(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

const ZERO = (): Macros => ({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

function addMacros(a: Macros, b: Macros): Macros {
  a.kcal += b.kcal;
  a.protein_g += b.protein_g;
  a.carbs_g += b.carbs_g;
  a.fat_g += b.fat_g;
  return a;
}

export function scaleMacros(item: FoodItem, portions: number): Macros {
  return {
    kcal: round(item.kcal * portions),
    protein_g: round(item.protein_g * portions, 1),
    carbs_g: round(item.carbs_g * portions, 1),
    fat_g: round(item.fat_g * portions, 1),
  };
}

/* ======================================================================
 * 1. Targets — BMR / TDEE / macros
 * ==================================================================== */
const ACTIVITY_BASE: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.35,
  active: 1.5,
};
const CARDIO_BUMP: Record<string, number> = {
  none: 0,
  "2x": 0.025,
  "3x": 0.04,
};

const GOAL_CONFIG: Record<
  MealGoal,
  {
    mode: "cut" | "maintain" | "bulk";
    adj: Record<string, number>;
    proteinGkg: number;
    label: string;
  }
> = {
  reduce: {
    mode: "cut",
    adj: { relaxed: -0.12, standard: -0.2, aggressive: -0.25 },
    proteinGkg: 2.0,
    label: "Weight loss",
  },
  lean: {
    mode: "cut",
    adj: { relaxed: -0.1, standard: -0.15, aggressive: -0.2 },
    proteinGkg: 2.2,
    label: "Get lean",
  },
  fitness: {
    mode: "maintain",
    adj: { relaxed: 0, standard: 0, aggressive: 0 },
    proteinGkg: 1.6,
    label: "General fitness",
  },
  muscle: {
    mode: "bulk",
    adj: { relaxed: 0.08, standard: 0.12, aggressive: 0.18 },
    proteinGkg: 1.8,
    label: "Muscle gain",
  },
  stronger: {
    mode: "bulk",
    adj: { relaxed: 0.05, standard: 0.08, aggressive: 0.12 },
    proteinGkg: 1.8,
    label: "Strength",
  },
  powerlifting: {
    mode: "bulk",
    adj: { relaxed: 0.05, standard: 0.1, aggressive: 0.15 },
    proteinGkg: 1.8,
    label: "Powerlifting",
  },
};

const DEFAULTS: MealProfile = {
  gender: "male",
  age: 25,
  weightKg: 70,
  heightCm: null,
  goal: "fitness",
  trainingDays: 3,
  cardio: "none",
  activity: "sedentary",
  mealsPerDay: "3+1",
  dietExclusions: [],
  dislikedFoodIds: [],
  pace: "standard",
  chai: true,
  targetWeightKg: null,
  userId: "user",
};

export function normalizeProfile(p?: Partial<MealProfile> | null): MealProfile {
  const prof: MealProfile = { ...DEFAULTS, ...(p ?? {}) };
  prof.age = clamp(Number(prof.age) || DEFAULTS.age, 13, 90);
  prof.weightKg = clamp(Number(prof.weightKg) || DEFAULTS.weightKg, 30, 250);
  // Height fallback: population average estimate (PK) if not collected yet
  if (!prof.heightCm) prof.heightCm = prof.gender === "female" ? 157 : 170;
  prof.heightCm = clamp(Number(prof.heightCm), 120, 220);
  prof.trainingDays = clamp(parseInt(String(prof.trainingDays), 10) || 3, 0, 7);
  if (!GOAL_CONFIG[prof.goal]) prof.goal = "fitness";
  if (!ACTIVITY_BASE[prof.activity]) prof.activity = "sedentary";
  if (!(prof.pace in GOAL_CONFIG[prof.goal].adj)) prof.pace = "standard";
  prof.dietExclusions = (prof.dietExclusions ?? []).map((s) =>
    String(s).toLowerCase(),
  );
  return prof;
}

export function mifflinStJeor(
  gender: string,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  return (
    10 * weightKg + 6.25 * heightCm - 5 * age + (gender === "female" ? -161 : 5)
  );
}

export function activityFactor(
  activity: ActivityLevel,
  trainingDays: number,
  cardio: string,
): number {
  const base = ACTIVITY_BASE[activity] ?? 1.2;
  const train = 0.035 * (trainingDays || 0);
  const cardioB = CARDIO_BUMP[cardio] ?? 0;
  return clamp(base + train + cardioB, 1.2, 1.9);
}

export function computeTargets(
  rawProfile?: Partial<MealProfile> | null,
): MacroTargets {
  const p = normalizeProfile(rawProfile);
  const cfg = GOAL_CONFIG[p.goal];
  const bmr = mifflinStJeor(p.gender, p.weightKg, p.heightCm!, p.age);
  const af = activityFactor(p.activity, p.trainingDays, p.cardio);
  const tdee = bmr * af;

  let adjPct = cfg.adj[p.pace];
  // If an explicit target weight contradicts the goal direction, follow the target direction gently
  if (p.targetWeightKg) {
    if (p.targetWeightKg < p.weightKg - 1 && adjPct >= 0) adjPct = -0.15;
    if (p.targetWeightKg > p.weightKg + 1 && adjPct <= 0) adjPct = 0.1;
  }
  let kcal = tdee * (1 + adjPct);

  // Safety floors & caps
  const floor = p.gender === "female" ? 1200 : 1500;
  kcal = Math.max(kcal, floor);
  kcal = Math.max(kcal, tdee * 0.75); // never deeper than 25% deficit
  kcal = Math.min(kcal, tdee * 1.25); // never above 25% surplus

  // Protein basis: on a cut with a target weight, feed the goal body, not the fat
  const proteinBasis =
    cfg.mode === "cut" && p.targetWeightKg && p.targetWeightKg < p.weightKg
      ? (p.targetWeightKg + p.weightKg) / 2
      : p.weightKg;
  let protein_g = cfg.proteinGkg * proteinBasis;
  protein_g = Math.min(protein_g, (kcal * 0.35) / 4); // cap protein at 35% kcal
  protein_g = Math.max(protein_g, 0.8 * p.weightKg); // RDA floor

  // Fat: 25% kcal (cut/bulk) to 28% (maintain), floor 0.5 g/kg
  const fatPct = cfg.mode === "maintain" ? 0.28 : 0.25;
  const fat_g = Math.max((kcal * fatPct) / 9, 0.5 * p.weightKg);

  // Carbs: remainder, floored
  const carbs_g = Math.max((kcal - protein_g * 4 - fat_g * 9) / 4, 50);

  const realKcalAdj = kcal - tdee;
  const expectedWeeklyChangeKg = (realKcalAdj * 7) / 7700; // ~7700 kcal per kg
  let etaWeeks: number | null = null;
  if (p.targetWeightKg && Math.abs(expectedWeeklyChangeKg) > 0.01) {
    const delta = p.targetWeightKg - p.weightKg;
    if (delta < 0 === expectedWeeklyChangeKg < 0) {
      etaWeeks = Math.ceil(Math.abs(delta / expectedWeeklyChangeKg));
    }
  }

  return {
    profile: p,
    goalMode: cfg.mode,
    goalLabel: cfg.label,
    bmr: Math.round(bmr),
    activityFactor: round(af, 3),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fat_g: Math.round(fat_g),
    waterMl:
      Math.round((35 * p.weightKg + (p.trainingDays >= 4 ? 350 : 0)) / 50) * 50,
    fiber_g: Math.round(14 * (kcal / 1000)),
    adjPct: round(adjPct * 100, 1),
    expectedWeeklyChangeKg: round(expectedWeeklyChangeKg, 2),
    etaWeeks,
    rationale: [
      "BMR (Mifflin-St Jeor): " + Math.round(bmr) + " kcal",
      "TDEE = BMR x " +
        round(af, 2) +
        " activity = " +
        Math.round(tdee) +
        " kcal",
      cfg.label +
        " -> " +
        (adjPct >= 0 ? "+" : "") +
        round(adjPct * 100) +
        "% = " +
        Math.round(kcal) +
        " kcal/day",
      "Protein " +
        round(cfg.proteinGkg, 1) +
        " g/kg = " +
        Math.round(protein_g) +
        " g, fat " +
        Math.round(fatPct * 100) +
        "% kcal = " +
        Math.round(fat_g) +
        " g, carbs fill the rest = " +
        Math.round(carbs_g) +
        " g",
    ],
  };
}

/* ======================================================================
 * 2. Food roles & filtering
 * ==================================================================== */
const MEAT_SOURCES = ["chicken", "beef", "mutton", "fish"];

// Items that work as a self-contained meal (rice dishes, rolls, sandwiches...)
const COMPLETE_NAMES = [
  "biryani",
  "pulao",
  "daal chawal",
  "khichdi",
  "fried rice",
  "haleem",
  "halwa puri",
  "oats",
  "cornflakes",
  "sandwich",
  "paratha roll",
  "shawarma",
  "bun kabab",
  "grilled chicken salad",
  "murgh cholay",
];

export function classifyRole(item: FoodItem): FoodRole {
  const n = item.name.toLowerCase();
  if (item.tags.indexOf("staple") >= 0) return "staple"; // roti, naan, plain rice
  if (COMPLETE_NAMES.some((k) => n.indexOf(k) >= 0)) return "complete";
  if (item.category === "Bread") return "staple";
  if (item.category === "Salan" || item.category === "BBQ/Protein")
    return "main";
  if (item.category === "Eggs/Dairy") {
    if (
      item.protein_g >= 6 &&
      ["egg", "omelette", "bhurji", "paneer"].some((k) => n.indexOf(k) >= 0)
    ) {
      return "main";
    }
    return "extra"; // milk, dahi, butter...
  }
  if (item.category === "Daal/Sabzi") return "side";
  if (item.category === "Drink") return "drink";
  if (item.category === "Fruit")
    return n.indexOf("salad") >= 0 ? "side" : "extra";
  return "extra"; // Snack, Sweet
}

export function isVegetarian(exclusions: string[]): boolean {
  return MEAT_SOURCES.every((s) => exclusions.indexOf(s) >= 0);
}

/** Central food filter for SUGGESTIONS (logging/search never filters). */
export function allowedForSuggestion(
  item: AnnotatedFoodItem,
  profile: MealProfile,
  goalMode: string,
): boolean {
  if (profile.dietExclusions.indexOf(item.protein_source) >= 0) return false;
  if (profile.dislikedFoodIds.indexOf(item.id) >= 0) return false;
  if (item.tags.indexOf("sweet") >= 0) return false; // sweets: log/swap only
  if (goalMode === "cut" && item.tags.indexOf("fried") >= 0) return false; // no fried food on a cut
  if (item.category === "Drink" && item.tags.indexOf("sweet") >= 0)
    return false;
  if (item.name.indexOf("Ghee") >= 0 || item.name === "Butter") return false; // condiments, not meal items
  return true;
}

/* ======================================================================
 * 3. Meal patterns (slots per eating schedule)
 * ==================================================================== */
type SlotDef = {
  name: string;
  mealTime: MealTime;
  share: number;
  ramadan?: "iftar" | "suhoor";
};

export const MEAL_PATTERNS: Record<string, SlotDef[]> = {
  "3": [
    { name: "Breakfast", mealTime: "breakfast", share: 0.3 },
    { name: "Lunch", mealTime: "lunch", share: 0.35 },
    { name: "Dinner", mealTime: "dinner", share: 0.35 },
  ],
  "3+1": [
    { name: "Breakfast", mealTime: "breakfast", share: 0.25 },
    { name: "Lunch", mealTime: "lunch", share: 0.3 },
    { name: "Evening Snack", mealTime: "snack", share: 0.15 },
    { name: "Dinner", mealTime: "dinner", share: 0.3 },
  ],
  "3+2": [
    { name: "Breakfast", mealTime: "breakfast", share: 0.22 },
    { name: "Mid-morning Snack", mealTime: "snack", share: 0.1 },
    { name: "Lunch", mealTime: "lunch", share: 0.28 },
    { name: "Evening Snack", mealTime: "snack", share: 0.12 },
    { name: "Dinner", mealTime: "dinner", share: 0.28 },
  ],
  "2": [
    { name: "First Meal", mealTime: "lunch", share: 0.45 },
    { name: "Snack", mealTime: "snack", share: 0.15 },
    { name: "Dinner", mealTime: "dinner", share: 0.4 },
  ],
  ramadan: [
    { name: "Iftar", mealTime: "snack", share: 0.2, ramadan: "iftar" },
    { name: "Dinner (post-Iftar)", mealTime: "dinner", share: 0.45 },
    { name: "Suhoor", mealTime: "breakfast", share: 0.35, ramadan: "suhoor" },
  ],
};

// Portion rules per role: [min, max, step]
const PORTION_RULES: Record<FoodRole, [number, number, number]> = {
  staple: [0.5, 4, 0.5],
  main: [0.5, 2, 0.5],
  complete: [0.5, 2, 0.5],
  side: [0.5, 2, 0.5],
  extra: [0.5, 3, 0.5],
  drink: [1, 1, 1],
};

/* ======================================================================
 * 4. Plan generation
 * ==================================================================== */
function macroFitScore(got: Macros, budget: Macros): number {
  // Weighted relative error; protein under-shoot punished harder than over-shoot
  const e = (g: number, b: number, wUnder: number, wOver: number) => {
    if (b <= 0) return 0;
    const d = (g - b) / b;
    return Math.abs(d) * (d < 0 ? wUnder : wOver);
  };
  const err =
    e(got.kcal, budget.kcal, 1.6, 1.6) +
    e(got.protein_g, budget.protein_g, 2.4, 0.85) + // extra protein ok, but not unlimited
    e(got.carbs_g, budget.carbs_g, 0.4, 0.7) +
    e(got.fat_g, budget.fat_g, 0.7, 1.0);
  return 100 - err * 40;
}

function healthBonus(items: PlanItem[], goalMode: string): number {
  const w = goalMode === "cut" ? 6 : goalMode === "maintain" ? 3 : 1.5;
  let b = 0;
  items.forEach((it) => {
    if (it.item.tags.indexOf("healthy") >= 0) b += w;
    if (goalMode === "bulk" && it.item.tags.indexOf("fried") >= 0) b -= 4;
  });
  return b;
}

function varietyPenalty(
  items: PlanItem[],
  recentUse: Record<number, number>,
): number {
  let pen = 0;
  items.forEach((it) => {
    const daysAgo = recentUse[it.item.id];
    if (daysAgo !== undefined && daysAgo <= 3) pen += 10 / (1 + daysAgo); // used today=10, yesterday=5...
  });
  return pen;
}

/** Choose best portion count for an item against a residual budget. */
function bestPortion(
  item: AnnotatedFoodItem,
  role: FoodRole,
  residual: Macros,
): number {
  const rule = PORTION_RULES[role] ?? [1, 1, 1];
  let best = rule[0];
  let bestErr = Infinity;
  for (let p = rule[0]; p <= rule[1] + 1e-9; p += rule[2]) {
    const m = scaleMacros(item, p);
    const err =
      Math.abs(m.kcal - residual.kcal) / Math.max(residual.kcal, 60) +
      (0.8 * Math.abs(m.protein_g - residual.protein_g)) /
        Math.max(residual.protein_g, 8);
    if (err < bestErr - 1e-9) {
      bestErr = err;
      best = p;
    }
  }
  return best;
}

function slotBudget(targets: Macros, share: number): Macros {
  return {
    kcal: targets.kcal * share,
    protein_g: targets.protein_g * share,
    carbs_g: targets.carbs_g * share,
    fat_g: targets.fat_g * share,
  };
}

type Combo = { items: PlanItem[]; totals: Macros; score: number };

function pickTop(cands: Combo[], rng: () => number, k: number): Combo | null {
  // weighted-random among top-k so plans vary day to day but stay high quality
  const top = cands.slice(0, Math.min(k, cands.length));
  if (!top.length) return null;
  const idx = Math.floor(Math.pow(rng(), 1.7) * top.length); // biased toward best
  return top[Math.min(idx, top.length - 1)];
}

/**
 * Build one meal slot: generate candidate combos from role templates,
 * score them, pick the best (with seeded variety).
 */
function buildSlot(
  slot: SlotDef,
  budget: Macros,
  pool: AnnotatedFoodItem[],
  goalMode: string,
  veg: boolean,
  rng: () => number,
  recentUse: Record<number, number>,
  chai: boolean,
): Combo {
  const byRole: Record<FoodRole, AnnotatedFoodItem[]> = {
    main: [],
    staple: [],
    complete: [],
    side: [],
    extra: [],
    drink: [],
  };
  pool.forEach((it) => {
    if (
      it.meal_times.indexOf(slot.mealTime) < 0 &&
      !(slot.ramadan === "suhoor" && it.meal_times.indexOf("dinner") >= 0)
    ) {
      return;
    }
    let role = it._role;
    if (veg && role === "side" && it.protein_g >= 8) role = "main"; // daal becomes the protein for veg users
    byRole[role].push(it);
  });

  // Rank each role list by protein density + health, with jitter
  const roleRank = (it: AnnotatedFoodItem) =>
    (it.protein_g / Math.max(it.kcal, 40)) * 400 +
    (it.tags.indexOf("healthy") >= 0 ? 8 : 0) +
    rng() * 6 -
    (recentUse[it.id] !== undefined && recentUse[it.id] <= 3
      ? 12 / (1 + recentUse[it.id])
      : 0);
  (Object.keys(byRole) as FoodRole[]).forEach((r) =>
    byRole[r].sort((a, b) => roleRank(b) - roleRank(a)),
  );

  const combos: Combo[] = [];
  const consider = (items: [AnnotatedFoodItem, FoodRole][]) => {
    // portion-fit sequentially: main first, then staple absorbs remaining kcal, side fixed
    const chosen: PlanItem[] = [];
    const residual: Macros = {
      kcal: budget.kcal,
      protein_g: budget.protein_g,
      carbs_g: budget.carbs_g,
      fat_g: budget.fat_g,
    };
    for (const [it, role] of items) {
      const portions = bestPortion(it, role, residual);
      const m = scaleMacros(it, portions);
      chosen.push({ item: it, role, portions, macros: m });
      residual.kcal -= m.kcal;
      residual.protein_g -= m.protein_g;
      residual.carbs_g -= m.carbs_g;
      residual.fat_g -= m.fat_g;
    }
    const totals = chosen.reduce((t, c) => addMacros(t, c.macros), ZERO());
    const score =
      macroFitScore(totals, budget) +
      healthBonus(chosen, goalMode) -
      varietyPenalty(chosen, recentUse) +
      rng() * 4;
    combos.push({ items: chosen, totals, score });
  };

  const M = byRole.main.slice(0, 10);
  const St = byRole.staple.slice(0, 6);
  const C = byRole.complete.slice(0, 8);
  const Sd = byRole.side.slice(0, 6);
  const Ex = byRole.extra.slice(0, 8);

  if (slot.ramadan === "iftar") {
    // Iftar: dates + fruit/light snack — tradition-aware, easy on the stomach
    const dates = pool.find((it) => it.name.indexOf("Khajoor") >= 0);
    Ex.slice(0, 6).forEach((ex) => {
      const base: [AnnotatedFoodItem, FoodRole][] =
        dates && dates.id !== ex.id
          ? [
              [dates, "extra"],
              [ex, "extra"],
            ]
          : [[ex, "extra"]];
      consider(base);
    });
  } else if (slot.mealTime === "breakfast") {
    M.forEach((m) =>
      St.slice(0, 4).forEach((st) =>
        consider([
          [m, "main"],
          [st, "staple"],
        ]),
      ),
    );
    C.forEach((c) => consider([[c, "complete"]]));
    M.slice(0, 5).forEach((m) => consider([[m, "main"]])); // eggs alone (low-carb)
  } else if (slot.mealTime === "snack") {
    Ex.forEach((ex) => consider([[ex, "extra"]]));
    for (let i = 0; i < Math.min(Ex.length, 5); i++) {
      for (let j = i + 1; j < Math.min(Ex.length, 6); j++) {
        consider([
          [Ex[i], "extra"],
          [Ex[j], "extra"],
        ]);
      }
    }
    C.filter((c) => c.meal_times.indexOf("snack") >= 0).forEach((c) =>
      consider([[c, "complete"]]),
    );
  } else {
    // lunch / dinner
    M.forEach((m) =>
      St.slice(0, 4).forEach((st) => {
        consider([
          [m, "main"],
          [st, "staple"],
        ]);
        Sd.slice(0, 3).forEach((sd) =>
          consider([
            [m, "main"],
            [st, "staple"],
            [sd, "side"],
          ]),
        );
      }),
    );
    C.forEach((c) => {
      consider([[c, "complete"]]);
      const raita = Sd.find(
        (s) => s.name === "Raita" || s.name.indexOf("Salad") >= 0,
      );
      if (raita)
        consider([
          [c, "complete"],
          [raita, "side"],
        ]);
    });
    if (goalMode === "cut") {
      M.slice(0, 6).forEach((m) =>
        Sd.slice(0, 3).forEach((sd) =>
          consider([
            [m, "main"],
            [sd, "side"],
          ]),
        ),
      ); // low-carb plate
    }
  }

  combos.sort((a, b) => b.score - a.score);
  let picked = pickTop(combos, rng, 3);
  if (!picked) picked = { items: [], totals: ZERO(), score: 0 };

  // Chai ritual: add a cup to breakfast if the user drinks chai (budget-aware pick)
  if (chai && slot.mealTime === "breakfast" && slot.ramadan !== "suhoor") {
    const chaiItem =
      pool.find((it) =>
        goalMode === "bulk"
          ? it.name.indexOf("doodh patti") >= 0
          : it.name.indexOf("Chai (regular") >= 0,
      ) || pool.find((it) => it.name.indexOf("Chai") >= 0);
    if (chaiItem && !picked.items.some((x) => x.item.category === "Drink")) {
      const m = scaleMacros(chaiItem, 1);
      picked.items.push({
        item: chaiItem,
        role: "drink",
        portions: 1,
        macros: m,
      });
      picked.totals = picked.items.reduce(
        (t, c) => addMacros(t, c.macros),
        ZERO(),
      );
    }
  }
  return picked;
}

/** Filler pass: close day-level gaps with small single foods. */
const FILLERS: { name: string; need: "protein_g" | "carbs_g" | "fat_g" }[] = [
  { name: "Egg Whites", need: "protein_g" },
  { name: "Whey Protein", need: "protein_g" },
  { name: "Greek Yogurt", need: "protein_g" },
  { name: "Boiled Egg", need: "protein_g" },
  { name: "Kala Chana (boiled)", need: "protein_g" },
  { name: "Banana", need: "carbs_g" },
  { name: "Khajoor", need: "carbs_g" },
  { name: "Apple", need: "carbs_g" },
  { name: "Roti / Chapati", need: "carbs_g" },
  { name: "Almonds", need: "fat_g" },
  { name: "Roasted Peanuts", need: "fat_g" },
  { name: "Peanut Butter", need: "fat_g" },
];

function fillGaps(
  plan: DayPlan,
  targets: Macros,
  pool: AnnotatedFoodItem[],
  profile: MealProfile,
  goalMode: string,
): void {
  for (let guard = 0; guard < 4; guard++) {
    const t = planTotals(plan);
    const kcalGap = targets.kcal - t.kcal;
    const proteinGap = targets.protein_g - t.protein_g;
    const fatGap = targets.fat_g - t.fat_g;
    let need: "protein_g" | "fat_g" | "kcal" | null = null;
    if (proteinGap >= 12) need = "protein_g";
    else if (fatGap >= targets.fat_g * 0.4 && kcalGap >= 65) need = "fat_g";
    else if (kcalGap >= targets.kcal * 0.06) need = "kcal";
    if (!need) break;
    const wanted: ("protein_g" | "carbs_g" | "fat_g")[] =
      need === "kcal" ? ["carbs_g", "fat_g", "protein_g"] : [need];
    let filler: AnnotatedFoodItem | undefined;
    for (const w of wanted) {
      filler = FILLERS.map((f) =>
        pool.find(
          (it) =>
            it.name.indexOf(f.name) >= 0 &&
            f.need === w &&
            allowedForSuggestion(it, profile, goalMode),
        ),
      ).find(Boolean);
      if (filler) break;
    }
    if (!filler) break;
    // add to the last slot that has room (snack preferred, else dinner)
    const slots = plan.slots;
    const slot =
      slots.filter((s) => s.mealTime === "snack").pop() ??
      slots[slots.length - 1];
    const existing = slot.items.find((x) => x.item.id === filler!.id);
    if (existing) {
      // already there → bump portions
      existing.portions = Math.min(existing.portions + 1, 4);
      existing.macros = scaleMacros(existing.item, existing.portions);
    } else {
      slot.items.push({
        item: filler,
        role: "extra",
        portions: 1,
        macros: scaleMacros(filler, 1),
        filler: true,
      });
    }
    slot.totals = slot.items.reduce((t2, c) => addMacros(t2, c.macros), ZERO());
  }
}

function planTotals(plan: DayPlan): Macros {
  return plan.slots.reduce((t, s) => addMacros(t, s.totals), ZERO());
}

export type GeneratePlanOptions = {
  date?: string;
  targets?: MacroTargets;
  recentItemUse?: Record<number, number>;
  seedSalt?: number;
};

export function generateDayPlan(
  db: FoodDb,
  rawProfile: Partial<MealProfile>,
  opts: GeneratePlanOptions = {},
): DayPlan {
  const profile = normalizeProfile(rawProfile);
  const targets = opts.targets ?? computeTargets(profile);
  const goalMode = targets.goalMode;
  const date = opts.date ?? todayISO();
  const rng = mulberry32(
    hashStr(String(profile.userId) + "|" + date + "|" + (opts.seedSalt ?? 0)),
  );
  const veg = isVegetarian(profile.dietExclusions);
  const recentUse = opts.recentItemUse ?? {};

  const pool = db.items.filter((it) =>
    allowedForSuggestion(it, profile, goalMode),
  );
  const pattern = MEAL_PATTERNS[profile.mealsPerDay] ?? MEAL_PATTERNS["3+1"];

  const useMap: Record<number, number> = { ...recentUse }; // cross-day + within-day variety memory
  const plan: DayPlan = {
    date,
    goalMode,
    mealsPerDay: profile.mealsPerDay,
    slots: [],
  };
  pattern.forEach((slotDef, i) => {
    const budget = slotBudget(targets, slotDef.share);
    const built = buildSlot(
      slotDef,
      budget,
      pool,
      goalMode,
      veg,
      rng,
      useMap,
      profile.chai,
    );
    built.items.forEach((x) => {
      if (x.role === "main" || x.role === "complete") useMap[x.item.id] = 0;
    });
    plan.slots.push({
      index: i,
      name: slotDef.name,
      mealTime: slotDef.mealTime,
      ramadan: slotDef.ramadan ?? null,
      budget: {
        kcal: Math.round(budget.kcal),
        protein_g: Math.round(budget.protein_g),
        carbs_g: Math.round(budget.carbs_g),
        fat_g: Math.round(budget.fat_g),
      },
      items: built.items,
      totals: built.totals,
    });
  });

  fillGaps(plan, targets, pool, profile, goalMode);

  const totals = planTotals(plan);
  plan.totals = {
    kcal: Math.round(totals.kcal),
    protein_g: Math.round(totals.protein_g),
    carbs_g: Math.round(totals.carbs_g),
    fat_g: Math.round(totals.fat_g),
  };
  plan.targets = {
    kcal: targets.kcal,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fat_g: targets.fat_g,
  };
  plan.fit = {
    kcalPct: Math.round((100 * plan.totals.kcal) / targets.kcal),
    proteinPct: Math.round((100 * plan.totals.protein_g) / targets.protein_g),
  };
  return plan;
}

/** 7-day plan with cross-day variety memory. */
export function generateWeekPlan(
  db: FoodDb,
  rawProfile: Partial<MealProfile>,
  opts: { startDate?: string; targets?: MacroTargets } = {},
): { startDate: string; days: DayPlan[] } {
  const start = opts.startDate ?? todayISO();
  const recentUse: Record<number, number> = {};
  const days: DayPlan[] = [];
  for (let d = 0; d < 7; d++) {
    const dt = new Date(start + "T12:00:00");
    dt.setDate(dt.getDate() + d);
    const iso =
      dt.getFullYear() +
      "-" +
      String(dt.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dt.getDate()).padStart(2, "0");
    Object.keys(recentUse).forEach((k) => recentUse[Number(k)]++);
    const plan = generateDayPlan(db, rawProfile, {
      date: iso,
      targets: opts.targets,
      recentItemUse: { ...recentUse },
    });
    plan.slots.forEach((s) =>
      s.items.forEach((x) => (recentUse[x.item.id] = 0)),
    );
    days.push(plan);
  }
  return { startDate: start, days };
}

/* ======================================================================
 * 5. Swap
 * ==================================================================== */
export function swapOptions(
  db: FoodDb,
  rawProfile: Partial<MealProfile>,
  plan: DayPlan,
  slotIndex: number,
  itemIndex: number,
  n = 8,
): SwapOption[] {
  const profile = normalizeProfile(rawProfile);
  const slot = plan.slots[slotIndex];
  const cur = slot?.items[itemIndex];
  if (!cur) return [];
  const goalMode = plan.goalMode ?? "maintain";
  const veg = isVegetarian(profile.dietExclusions);
  const usedIds = slot.items.map((x) => x.item.id);

  const cands = db.items.filter((it) => {
    if (it.id === cur.item.id || usedIds.indexOf(it.id) >= 0) return false;
    if (profile.dietExclusions.indexOf(it.protein_source) >= 0) return false;
    if (profile.dislikedFoodIds.indexOf(it.id) >= 0) return false;
    if (
      goalMode === "cut" &&
      (it.tags.indexOf("fried") >= 0 || it.tags.indexOf("sweet") >= 0)
    )
      return false;
    if (it.meal_times.indexOf(slot.mealTime) < 0) return false;
    let role = it._role;
    if (veg && role === "side" && it.protein_g >= 8) role = "main";
    // mains and completes are interchangeable (karahi+roti ↔ biryani)
    const cluster = (r: FoodRole) =>
      r === "main" || r === "complete" ? "mainish" : r;
    return cluster(role) === cluster(cur.role);
  });

  const scored = cands
    .map((it) => {
      // fit portions so the replacement macro-matches what it replaces
      const rule = PORTION_RULES[it._role] ?? [1, 2, 0.5];
      let best = 1;
      let bestD = Infinity;
      for (let p = rule[0]; p <= rule[1] + 1e-9; p += rule[2]) {
        const m = scaleMacros(it, p);
        const d =
          Math.abs(m.kcal - cur.macros.kcal) / Math.max(cur.macros.kcal, 60) +
          (1.2 * Math.abs(m.protein_g - cur.macros.protein_g)) /
            Math.max(cur.macros.protein_g, 8);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      const m = scaleMacros(it, best);
      return {
        item: it,
        portions: best,
        macros: m,
        role: cur.role,
        deltaKcal: Math.round(m.kcal - cur.macros.kcal),
        deltaProtein: Math.round(m.protein_g - cur.macros.protein_g),
        score: -bestD + (it.tags.indexOf("healthy") >= 0 ? 0.08 : 0),
      };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, n);
}

export function applySwap(
  plan: DayPlan,
  slotIndex: number,
  itemIndex: number,
  replacement: SwapOption,
): DayPlan {
  const slot = plan.slots[slotIndex];
  slot.items = slot.items.slice();
  slot.items[itemIndex] = {
    item: replacement.item,
    role: replacement.role ?? slot.items[itemIndex].role,
    portions: replacement.portions,
    macros: replacement.macros,
    swapped: true,
  };
  slot.totals = slot.items.reduce((t, c) => addMacros(t, c.macros), ZERO());
  const totals = planTotals(plan);
  plan.totals = {
    kcal: Math.round(totals.kcal),
    protein_g: Math.round(totals.protein_g),
    carbs_g: Math.round(totals.carbs_g),
    fat_g: Math.round(totals.fat_g),
  };
  if (plan.targets) {
    plan.fit = {
      kcalPct: Math.round((100 * plan.totals.kcal) / plan.targets.kcal),
      proteinPct: Math.round(
        (100 * plan.totals.protein_g) / plan.targets.protein_g,
      ),
    };
  }
  return plan;
}

/** Adjust portions of one planned item (0.5 steps). */
export function setPortions(
  plan: DayPlan,
  slotIndex: number,
  itemIndex: number,
  portions: number,
): DayPlan {
  const slot = plan.slots[slotIndex];
  const x = slot.items[itemIndex];
  x.portions = clamp(portions, 0.5, 6);
  x.macros = scaleMacros(x.item, x.portions);
  slot.totals = slot.items.reduce((t, c) => addMacros(t, c.macros), ZERO());
  const totals = planTotals(plan);
  plan.totals = {
    kcal: Math.round(totals.kcal),
    protein_g: Math.round(totals.protein_g),
    carbs_g: Math.round(totals.carbs_g),
    fat_g: Math.round(totals.fat_g),
  };
  return plan;
}

/* ======================================================================
 * 6. Logging, day summary, "what's left" suggestions
 * ==================================================================== */
export function createDayLog(date?: string): DayLog {
  return { date: date ?? todayISO(), entries: [], nextId: 1 };
}

export type LogInput = {
  itemId?: number | null;
  portions?: number | null;
  grams?: number | null;
  name?: string;
  serving?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  time?: string;
  slot?: number | null;
  source?: "plan" | "db" | "custom";
};

function resolveEntryMacros(db: FoodDb, e: LogInput) {
  if (e.itemId != null) {
    const it = db.items.find((i) => i.id === e.itemId);
    if (!it) throw new Error("Unknown itemId " + e.itemId);
    let portions = e.portions;
    if (portions == null && e.grams != null) portions = e.grams / it.serving_g;
    if (portions == null) portions = 1;
    return {
      name: it.name,
      portions: round(portions, 2),
      serving: it.serving,
      macros: scaleMacros(it, portions),
      itemId: it.id,
    };
  }
  // fully custom entry (e.g. "ghar ka daal gosht, roughly 400 kcal")
  return {
    name: e.name ?? "Custom food",
    portions: e.portions ?? 1,
    serving: e.serving ?? "custom",
    macros: {
      kcal: Math.round(e.kcal ?? 0),
      protein_g: round(e.protein_g ?? 0, 1),
      carbs_g: round(e.carbs_g ?? 0, 1),
      fat_g: round(e.fat_g ?? 0, 1),
    },
    itemId: null,
  };
}

/** Log any food (planned or not). */
export function logFood(db: FoodDb, log: DayLog, entry: LogInput): LogEntry {
  const r = resolveEntryMacros(db, entry);
  const e: LogEntry = {
    id: log.nextId++,
    time: entry.time ?? new Date().toISOString(),
    slot: entry.slot ?? null,
    source: entry.source ?? (entry.itemId != null ? "db" : "custom"),
    itemId: r.itemId,
    name: r.name,
    portions: r.portions,
    serving: r.serving,
    macros: r.macros,
  };
  log.entries.push(e);
  return e;
}

/** Log everything (or one item) from a plan slot. */
export function logPlanned(
  db: FoodDb,
  log: DayLog,
  plan: DayPlan,
  slotIndex: number,
  itemIndex?: number | null,
  portionsOverride?: number | null,
): LogEntry[] {
  const slot = plan.slots[slotIndex];
  const targets = itemIndex != null ? [slot.items[itemIndex]] : slot.items;
  return targets.map((x) =>
    logFood(db, log, {
      itemId: x.item.id,
      portions: portionsOverride ?? x.portions,
      slot: slotIndex,
      source: "plan",
    }),
  );
}

export function removeLogEntry(log: DayLog, entryId: number): DayLog {
  const i = log.entries.findIndex((e) => e.id === entryId);
  if (i >= 0) log.entries.splice(i, 1);
  return log;
}

export function consumedTotals(log: DayLog): Macros {
  return log.entries.reduce((t, e) => addMacros(t, e.macros), ZERO());
}

export function daySummary(targets: Macros, log: DayLog): DaySummary {
  const c = consumedTotals(log);
  const mk = (key: keyof Macros, label: string) => {
    const target = targets[key];
    const got = c[key];
    const pct = target > 0 ? Math.round((100 * got) / target) : 0;
    let status: "under" | "on-track" | "over" | "in-progress" = "in-progress";
    if (pct >= 90 && pct <= 110) status = "on-track";
    else if (pct > 110) status = "over";
    else if (pct < 90) status = "under";
    return {
      label,
      consumed: Math.round(got),
      target: Math.round(target),
      remaining: Math.round(target - got),
      pct,
      status,
    };
  };
  return {
    date: log.date,
    entries: log.entries.length,
    kcal: mk("kcal", "Calories"),
    protein: mk("protein_g", "Protein"),
    carbs: mk("carbs_g", "Carbs"),
    fat: mk("fat_g", "Fat"),
  };
}

/**
 * suggestForRemaining: given what's already eaten, propose foods that best
 * fit the REMAINING macros (protein-first). The "what should I eat now?" feature.
 */
export function suggestForRemaining(
  db: FoodDb,
  rawProfile: Partial<MealProfile>,
  targets: MacroTargets,
  log: DayLog,
  n = 6,
  mealTime?: MealTime,
): { remaining: Macros; suggestions: RemainingSuggestion[] } {
  const profile = normalizeProfile(rawProfile);
  const c = consumedTotals(log);
  const rem = {
    kcal: Math.max(targets.kcal - c.kcal, 0),
    protein_g: Math.max(targets.protein_g - c.protein_g, 0),
    carbs_g: Math.max(targets.carbs_g - c.carbs_g, 0),
    fat_g: Math.max(targets.fat_g - c.fat_g, 0),
  };
  if (rem.kcal < 60) return { remaining: rem, suggestions: [] };
  const goalMode = targets.goalMode ?? "maintain";
  const pool = db.items.filter(
    (it) =>
      allowedForSuggestion(it, profile, goalMode) &&
      (!mealTime || it.meal_times.indexOf(mealTime) >= 0),
  );

  const scored = pool
    .map((it) => {
      const rule = PORTION_RULES[it._role] ?? [1, 2, 0.5];
      let best = rule[0];
      let bestScore = -Infinity;
      for (let p = rule[0]; p <= Math.min(rule[1], 3) + 1e-9; p += rule[2]) {
        const m = scaleMacros(it, p);
        if (m.kcal > rem.kcal * 1.15) break;
        const proteinFill =
          rem.protein_g > 0 ? Math.min(m.protein_g / rem.protein_g, 1) : 0;
        const kcalUse = m.kcal / Math.max(rem.kcal, 1);
        const s =
          proteinFill * 70 +
          kcalUse * 20 -
          Math.max(0, kcalUse - 1) * 100 +
          (it.tags.indexOf("healthy") >= 0 ? 6 : 0);
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
      return {
        item: it,
        portions: best,
        macros: scaleMacros(it, best),
        score: bestScore,
      };
    })
    .filter((x) => x.score > -Infinity && x.macros.kcal <= rem.kcal * 1.15)
    .sort((a, b) => b.score - a.score);

  // de-duplicate by category for a varied list
  const seen: Record<string, number> = {};
  const out: RemainingSuggestion[] = [];
  for (const s of scored) {
    if ((seen[s.item.category] || 0) >= 2) continue;
    seen[s.item.category] = (seen[s.item.category] || 0) + 1;
    out.push(s);
    if (out.length >= n) break;
  }
  return {
    remaining: {
      kcal: Math.round(rem.kcal),
      protein_g: Math.round(rem.protein_g),
      carbs_g: Math.round(rem.carbs_g),
      fat_g: Math.round(rem.fat_g),
    },
    suggestions: out,
  };
}

/* ======================================================================
 * 7. Adaptive weekly adjustment from weigh-ins
 * ==================================================================== */
export function adjustFromWeighIns(
  rawProfile: Partial<MealProfile>,
  weighIns: WeighIn[],
  lastAdjustISO?: string | null,
): AdjustResult {
  const profile = normalizeProfile(rawProfile);
  const targets = computeTargets(profile);
  const sorted = (weighIns ?? [])
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sorted.length < 4) {
    return { adjusted: false, reason: "Need at least 4 weigh-ins.", targets };
  }
  const spanDays =
    (new Date(sorted[sorted.length - 1].date).getTime() -
      new Date(sorted[0].date).getTime()) /
    86400000;
  if (spanDays < 14) {
    return {
      adjusted: false,
      reason: "Need 2 weeks of weigh-ins before adjusting.",
      targets,
    };
  }
  if (
    lastAdjustISO &&
    (new Date(sorted[sorted.length - 1].date).getTime() -
      new Date(lastAdjustISO).getTime()) /
      86400000 <
      7
  ) {
    return {
      adjusted: false,
      reason: "Adjusted less than a week ago.",
      targets,
    };
  }

  const avg = (xs: WeighIn[]) =>
    xs.reduce((a, x) => a + x.weightKg, 0) / xs.length;
  const half = Math.floor(sorted.length / 2);
  const firstAvg = avg(sorted.slice(0, half));
  const lastAvg = avg(sorted.slice(-half));
  const weeks = Math.max(spanDays / 7, 1);
  const actualPerWeek = (lastAvg - firstAvg) / weeks;
  const expected = targets.expectedWeeklyChangeKg;

  let deltaKcal = 0;
  let reason = "";
  if (targets.goalMode === "cut") {
    if (actualPerWeek > expected * 0.5) {
      deltaKcal = -125;
      reason = "Losing slower than planned — reducing 125 kcal.";
    } else if (actualPerWeek < expected * 1.6) {
      deltaKcal = +100;
      reason =
        "Losing faster than planned — adding 100 kcal to protect muscle.";
    }
  } else if (targets.goalMode === "bulk") {
    if (actualPerWeek < expected * 0.5) {
      deltaKcal = +125;
      reason = "Gaining slower than planned — adding 125 kcal.";
    } else if (actualPerWeek > expected * 1.8) {
      deltaKcal = -100;
      reason = "Gaining too fast (fat risk) — reducing 100 kcal.";
    }
  } else {
    if (actualPerWeek > 0.25) {
      deltaKcal = -100;
      reason = "Weight creeping up — trimming 100 kcal.";
    } else if (actualPerWeek < -0.25) {
      deltaKcal = +100;
      reason = "Weight drifting down — adding 100 kcal.";
    }
  }
  if (!deltaKcal) {
    return {
      adjusted: false,
      reason: "On track — no change needed.",
      targets,
      actualPerWeek: round(actualPerWeek, 2),
    };
  }

  const floor = profile.gender === "female" ? 1200 : 1500;
  const newKcal = Math.max(targets.kcal + deltaKcal, floor);
  const t2: MacroTargets = { ...targets, kcal: Math.round(newKcal) };
  t2.carbs_g = Math.round(
    Math.max((newKcal - t2.protein_g * 4 - t2.fat_g * 9) / 4, 50),
  ); // carbs absorb the change
  return {
    adjusted: true,
    deltaKcal,
    reason,
    targets: t2,
    actualPerWeek: round(actualPerWeek, 2),
    expectedPerWeek: expected,
  };
}

/* ======================================================================
 * 8. Food search (Roman-Urdu tolerant)
 * ==================================================================== */
export function normTxt(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/(.)\1+/g, "$1") // daal→dal
    .replace(/\s+/g, " ")
    .trim();
}

const SYNONYMS: Record<string, string> = {
  dal: "dal daal lentil",
  chawal: "chawal rice",
  anda: "anda egg",
  gosht: "gosht meat mutton beef",
  murgh: "murgh chicken",
  machli: "machli fish",
  sabzi: "sabzi vegetable",
  doodh: "doodh milk",
  kela: "kela banana",
  saib: "saib apple",
  aam: "aam mango",
  chay: "chay chai tea",
  chai: "chai tea",
};

export function searchFoods(
  db: FoodDb,
  query: string,
  n = 10,
): AnnotatedFoodItem[] {
  const q = normTxt(query);
  if (!q) return [];
  let qTokens = q.split(" ");
  qTokens = qTokens.map((t) =>
    SYNONYMS[t] ? SYNONYMS[t].split(" ")[1] || t : t,
  );
  const scored = db.items
    .map((it) => {
      const name = it._norm;
      let s = 0;
      if (name.indexOf(q) >= 0) s += 30;
      qTokens.forEach((t) => {
        if (!t) return;
        if (name.indexOf(t) >= 0) s += 14;
        else if (name.split(" ").some((w) => w.indexOf(t) === 0)) s += 8; // prefix
      });
      return { item: it, score: s };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.kcal - b.item.kcal);
  return scored.slice(0, n).map((x) => x.item);
}

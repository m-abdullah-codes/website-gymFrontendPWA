/** Food & meal-planning types for the Pakistani food DB v1.1. */

export type FoodCategory =
  | "Bread"
  | "Rice"
  | "Salan"
  | "Daal/Sabzi"
  | "BBQ/Protein"
  | "Eggs/Dairy"
  | "Breakfast"
  | "Snack"
  | "Sweet"
  | "Drink"
  | "Fruit";

export type MealTime = "breakfast" | "lunch" | "snack" | "dinner";

export type ProteinSource =
  "plant" | "dairy" | "egg" | "chicken" | "beef" | "mutton" | "fish";

export type FoodItem = {
  id: number;
  name: string;
  category: FoodCategory;
  meal_times: MealTime[];
  serving: string;
  serving_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_source: ProteinSource;
  tags: string[];
};

export type FoodRole =
  "staple" | "main" | "complete" | "side" | "extra" | "drink";

/** DB item annotated once at load: role classification + normalized name. */
export type AnnotatedFoodItem = FoodItem & { _role: FoodRole; _norm: string };

export type FoodDb = { version: string; items: AnnotatedFoodItem[] };

export type Macros = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MealGoal =
  "reduce" | "lean" | "fitness" | "muscle" | "stronger" | "powerlifting";

export type ActivityLevel = "sedentary" | "light" | "active";
export type MealPattern = "3" | "3+1" | "3+2" | "2" | "ramadan";
export type DietPace = "relaxed" | "standard" | "aggressive";
export type CardioLevel = "none" | "2x" | "3x";

export type MealProfile = {
  gender: "male" | "female";
  age: number;
  weightKg: number;
  heightCm: number | null;
  goal: MealGoal;
  trainingDays: number;
  cardio: CardioLevel;
  activity: ActivityLevel;
  mealsPerDay: MealPattern;
  dietExclusions: string[];
  dislikedFoodIds: number[];
  pace: DietPace;
  chai: boolean;
  targetWeightKg: number | null;
  userId: string;
};

export type MacroTargets = Macros & {
  profile: MealProfile;
  goalMode: "cut" | "maintain" | "bulk";
  goalLabel: string;
  bmr: number;
  activityFactor: number;
  tdee: number;
  waterMl: number;
  fiber_g: number;
  adjPct: number;
  expectedWeeklyChangeKg: number;
  etaWeeks: number | null;
  rationale: string[];
};

export type PlanItem = {
  item: AnnotatedFoodItem;
  role: FoodRole;
  portions: number;
  macros: Macros;
  filler?: boolean;
  swapped?: boolean;
};

export type PlanSlot = {
  index: number;
  name: string;
  mealTime: MealTime;
  ramadan: "iftar" | "suhoor" | null;
  budget: Macros;
  items: PlanItem[];
  totals: Macros;
};

export type DayPlan = {
  date: string;
  goalMode: "cut" | "maintain" | "bulk";
  mealsPerDay: MealPattern;
  slots: PlanSlot[];
  totals?: Macros;
  targets?: Macros;
  fit?: { kcalPct: number; proteinPct: number };
};

export type LogEntry = {
  id: number;
  time: string;
  slot: number | null;
  source: "plan" | "db" | "custom";
  itemId: number | null;
  name: string;
  portions: number;
  serving: string;
  macros: Macros;
};

export type DayLog = { date: string; entries: LogEntry[]; nextId: number };

export type MacroStatus = "under" | "on-track" | "over" | "in-progress";

export type MacroSummaryRow = {
  label: string;
  consumed: number;
  target: number;
  remaining: number;
  pct: number;
  status: MacroStatus;
};

export type DaySummary = {
  date: string;
  entries: number;
  kcal: MacroSummaryRow;
  protein: MacroSummaryRow;
  carbs: MacroSummaryRow;
  fat: MacroSummaryRow;
};

export type SwapOption = {
  item: AnnotatedFoodItem;
  portions: number;
  macros: Macros;
  role: FoodRole;
  deltaKcal: number;
  deltaProtein: number;
  score: number;
};

export type WeighIn = { date: string; weightKg: number };

export type AdjustResult = {
  adjusted: boolean;
  deltaKcal?: number;
  reason: string;
  targets: MacroTargets;
  actualPerWeek?: number;
  expectedPerWeek?: number;
};

export type RemainingSuggestion = {
  item: AnnotatedFoodItem;
  portions: number;
  macros: Macros;
  score: number;
};

import type { OnboardingAnswers } from "./types";

export type StepOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
};

export type QuestionStepDef = {
  key: string;
  question: string;
  /** Small trust-building line under the question. */
  hint?: string;
  options: StepOption[];
  /** Grid columns for the option list (defaults to a single column). */
  columns?: 1 | 2 | 3;
  /** Allow multiple selections; the step advances via a Continue button. */
  multiSelect?: boolean;
  /** In multi-select steps, choosing this option clears all others. */
  exclusiveValue?: string;
  /** Skip this step when it doesn't apply given earlier answers. */
  skip?: (answers: OnboardingAnswers) => boolean;
};

const GOAL_OPTIONS: StepOption[] = [
  { value: "muscle", label: "Build muscle" },
  { value: "lean", label: "Get lean" },
  { value: "stronger", label: "Get stronger" },
  { value: "reduce", label: "Reduce bodyweight" },
  { value: "fitness", label: "Improve fitness" },
  { value: "powerlifting", label: "Practise powerlifting" },
];

export const QUESTION_STEPS: QuestionStepDef[] = [
  {
    key: "gender",
    question: "What's your gender?",
    hint: "Used to tailor exercise selection and starting loads.",
    columns: 2,
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
  },
  {
    key: "over40",
    question: "Are you 40 or older?",
    hint: "Recovery needs change with training age — we plan for it.",
    columns: 2,
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "adult",
    question: "Want a program designed specifically for 40+?",
    skip: (a) => a.over40 !== "yes",
    options: [
      { value: "yes", label: "Yes — give me a 40+ program" },
      { value: "no", label: "No — treat me as standard" },
    ],
  },
  {
    key: "goal",
    question: "What's your main goal?",
    hint: "You can refine this anytime.",
    skip: (a) => a.adult === "yes",
    options: GOAL_OPTIONS,
  },
  {
    key: "days",
    question: "How many days per week will you train?",
    hint: "Be realistic — consistency beats intensity.",
    columns: 3,
    options: [
      { value: "2", label: "2 days" },
      { value: "3", label: "3 days" },
      { value: "4", label: "4 days" },
      { value: "5", label: "5 days" },
      { value: "6", label: "6 days" },
    ],
  },
  {
    key: "level",
    question: "What's your training experience?",
    hint: "Honest answers build better plans.",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
  },
  {
    key: "split",
    question: "Do you have a preferred split?",
    hint: "How you like to structure your training week.",
    options: [
      {
        value: "No preference",
        label: "No preference",
        description: "Lets us fully optimize your plan",
        badge: "Recommended",
      },
      { value: "Full Body", label: "Full Body" },
      { value: "Upper/Lower", label: "Upper / Lower" },
      { value: "Push/Pull/Legs", label: "Push / Pull / Legs" },
    ],
  },
  {
    key: "cardio",
    question: "Add cardio sessions?",
    hint: "Optional add-on, scheduled around your lifting days.",
    options: [
      { value: "none", label: "No cardio" },
      { value: "2x", label: "2× per week" },
      { value: "3x", label: "3× per week" },
    ],
  },
  {
    key: "stretch",
    question: "Add a stretching / mobility routine?",
    hint: "Short guided sessions after your workouts.",
    options: [
      { value: "yes", label: "Yes, add mobility work" },
      { value: "no", label: "No thanks" },
    ],
  },
  // ---- Nutrition questions (feed the meal engine — asked once, here) ----
  {
    key: "activity",
    question: "How active is your day outside the gym?",
    hint: "Your job and daily life burn more than the gym hour does.",
    options: [
      {
        value: "sedentary",
        label: "Mostly sitting",
        description: "Desk job, driving, studying",
      },
      {
        value: "light",
        label: "On my feet a fair bit",
        description: "Teaching, retail, errands most days",
      },
      {
        value: "active",
        label: "Physically active",
        description: "Manual work or lots of daily walking",
      },
    ],
  },
  {
    key: "mealsPerDay",
    question: "How do you like to eat through the day?",
    hint: "We shape your meal plan around your routine — not the other way round.",
    options: [
      { value: "3", label: "3 meals" },
      { value: "3+1", label: "3 meals + evening snack", badge: "Common" },
      { value: "3+2", label: "3 meals + 2 snacks" },
      {
        value: "2",
        label: "2 meals",
        description: "Late first meal (fasting-style)",
      },
      {
        value: "ramadan",
        label: "Ramadan schedule",
        description: "Suhoor · Iftar · Dinner",
      },
    ],
  },
  {
    key: "dietExclusions",
    question: "Anything you don't eat?",
    hint: "Pick all that apply — suggestions will always respect these.",
    multiSelect: true,
    exclusiveValue: "none",
    columns: 2,
    options: [
      { value: "none", label: "I eat everything" },
      { value: "beef", label: "No beef" },
      { value: "mutton", label: "No mutton" },
      { value: "chicken", label: "No chicken" },
      { value: "fish", label: "No fish" },
      { value: "egg", label: "No eggs" },
      { value: "dairy", label: "No dairy" },
    ],
  },
  {
    key: "chai",
    question: "Do you drink chai?",
    hint: "We budget it honestly — untracked tea is a classic silent diet-killer.",
    columns: 2,
    options: [
      { value: "yes", label: "Yes, daily" },
      { value: "no", label: "Not really" },
    ],
  },
  {
    key: "pace",
    question: "How fast do you want results?",
    hint: "Steadier paces are easier to stick to.",
    options: [
      {
        value: "relaxed",
        label: "Relaxed",
        description: "Gentle changes, barely feels like a diet",
      },
      {
        value: "standard",
        label: "Standard",
        description: "Solid progress, sustainable",
        badge: "Recommended",
      },
      {
        value: "aggressive",
        label: "Aggressive",
        description: "Fastest results, takes discipline",
      },
    ],
  },
];

/** The steps that apply given the current answers, in flow order. */
export function visibleSteps(answers: OnboardingAnswers): QuestionStepDef[] {
  return QUESTION_STEPS.filter((step) => !step.skip?.(answers));
}

/**
 * Drop answers belonging to steps that became skipped after an earlier answer
 * changed (e.g. flipping `over40` back to "no" must clear a stale `adult`),
 * so `skip` predicates never read orphaned values.
 */
export function pruneAnswers(answers: OnboardingAnswers): OnboardingAnswers {
  const kept: OnboardingAnswers = {};
  for (const step of QUESTION_STEPS) {
    if (step.skip?.(kept)) continue;
    const value = answers[step.key];
    if (value !== undefined) kept[step.key] = value;
  }
  return kept;
}

export const REP_MAX_LIFTS = [
  {
    key: "benchPress",
    name: "Bench Press",
    muscle: "Chest",
    imageSrc: "/images/chest.jpg",
  },
  {
    key: "backSquat",
    name: "Back Squat",
    muscle: "Quads",
    imageSrc: "/images/quadriceps.jpg",
  },
  {
    key: "deadlift",
    name: "Deadlift",
    muscle: "Lower back",
    imageSrc: "/images/lower-back.jpg",
  },
  {
    key: "overheadPress",
    name: "Overhead Press",
    muscle: "Shoulders",
    imageSrc: "/images/shoulders.jpg",
  },
] as const;

export type RepMaxLiftKey = (typeof REP_MAX_LIFTS)[number]["key"];

import foodsData from "@/data/foods.json";
import { classifyRole, normTxt } from "./engine";
import type {
  AnnotatedFoodItem,
  FoodDb,
  FoodItem,
  ProteinSource,
} from "./types";

type RawDb = { version: string; items: FoodItem[] };

function annotate(raw: RawDb): FoodDb {
  const items: AnnotatedFoodItem[] = raw.items.map((it) => ({
    ...it,
    protein_source: (it.protein_source ?? "plant") as ProteinSource,
    _role: classifyRole(it),
    _norm: normTxt(it.name),
  }));
  return { version: raw.version, items };
}

/** The bundled food DB, annotated once at module load. */
export const foodDb: FoodDb = annotate(foodsData as unknown as RawDb);

export function getFoodById(id: number): AnnotatedFoodItem | undefined {
  return foodDb.items.find((it) => it.id === id);
}

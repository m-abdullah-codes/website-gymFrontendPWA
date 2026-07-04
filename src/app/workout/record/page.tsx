export const unstable_instant = { prefetch: "static" };

import type { Metadata } from "next";
import { RecordWorkout } from "@/components/workout/RecordWorkout";

export const metadata: Metadata = {
  title: "Record workout — Gym App",
};

export default function RecordWorkoutPage() {
  return <RecordWorkout />;
}

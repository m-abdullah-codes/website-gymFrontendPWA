export const unstable_instant = { prefetch: "static" };

import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding";

export const metadata: Metadata = {
  title: "Get started — Gym App",
  description: "Answer a few quick questions to build your training plan",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}

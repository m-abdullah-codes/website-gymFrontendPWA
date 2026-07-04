export const unstable_instant = { prefetch: "static" };

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MembershipCarousel } from "@/components/memberships/MembershipCarousel";
import { buttonBaseClassName, buttonVariants } from "@/components/ui/Button";
import { memberships } from "@/data/memberships";
import { cn } from "@/lib/utils";

export default function MembershipsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[21.5rem] min-w-0 flex-col items-start gap-6 md:mx-0 md:max-w-[22rem] md:gap-8">
        <MembershipCarousel memberships={memberships} />
        <Link
          href="/onboarding"
          className={cn(buttonBaseClassName, buttonVariants.primary)}
        >
          Start onboarding
        </Link>
      </div>
    </AppShell>
  );
}

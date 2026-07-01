import { AppShell } from "@/components/layout/AppShell";
import { MembershipCarousel } from "@/components/memberships/MembershipCarousel";
import { Button } from "@/components/ui/Button";
import { memberships } from "@/data/memberships";

export default function MembershipsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[21.5rem] min-w-0 flex-col items-start gap-6 md:mx-0 md:max-w-[22rem] md:gap-8">
        <MembershipCarousel memberships={memberships} />
        <Button>Start onboarding</Button>
      </div>
    </AppShell>
  );
}

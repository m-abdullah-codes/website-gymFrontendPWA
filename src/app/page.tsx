import { AppShell } from "@/components/layout/AppShell";
import { MembershipCard } from "@/components/memberships/MembershipCard";
import { membership } from "@/data/memberships";

export default function MembershipsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[21.5rem] min-w-0 flex-col items-start gap-6 md:mx-0 md:max-w-[22rem] md:gap-8">
        <div className="flex w-full flex-col gap-1.5 text-left">
          <h1 className="text-[2rem] font-light leading-[1.1] tracking-tight text-ink md:text-[3.25rem]">
            Your
            <br />
            memberships
          </h1>
          <p className="text-[0.9375rem] font-light text-ink-secondary md:text-base">
            View your memberships here.
          </p>
        </div>
        <MembershipCard membership={membership} />
        <button
          type="button"
          className="h-14 w-full rounded-[1.15rem] bg-white px-6 text-base font-medium text-[#000814] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        >
          Start onboarding
        </button>
      </div>
    </AppShell>
  );
}

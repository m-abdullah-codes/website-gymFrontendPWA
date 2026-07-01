import { cn } from "@/lib/utils";
import { MembershipCard, type Membership } from "./MembershipCard";

interface MembershipCarouselProps {
  memberships: Membership[];
  className?: string;
}

export function MembershipCarousel({
  memberships,
  className,
}: MembershipCarouselProps) {
  return (
    <div
      className={cn(
        "membership-carousel flex w-full gap-4 overflow-x-auto",
        className,
      )}
    >
      {memberships.map((membership) => (
        <MembershipCard key={membership.id} membership={membership} />
      ))}
    </div>
  );
}

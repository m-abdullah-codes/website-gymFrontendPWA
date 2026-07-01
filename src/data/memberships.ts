import type { Membership } from "@/components/memberships/MembershipCard";

export const memberships: Membership[] = [
  {
    id: "1",
    gymName: "Titan Gym",
    planName: "Premium Membership",
    status: "active",
    expiresInDays: 24,
    sessionsLeft: 7,
    progressPercent: 30,
    imageSrc: "/images/membership-bg.png",
  },
];

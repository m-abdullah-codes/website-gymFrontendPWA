/**
 * Top aurora cluster for onboarding — layered glows that morph blue → purple → pink
 * in place. Symmetric left/right satellites orbit a centered hero glow.
 */
export function OnboardingBlobs() {
  const sideBlobClass =
    "animate-onboarding-aurora-b absolute top-[-15%] size-52 -translate-x-1/2 rounded-full blur-[92px] will-change-[background-color,opacity]";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[min(52vh,26rem)] mix-blend-screen">
        <div className="animate-onboarding-aurora-a absolute top-[-38%] left-1/2 size-[min(92vw,26rem)] -translate-x-1/2 rounded-full blur-[110px] will-change-[background-color,opacity,transform]" />
        <div
          className={`${sideBlobClass} left-[calc(50%-9rem)]`}
          style={{ animationDelay: "-4s" }}
        />
        <div
          className={`${sideBlobClass} left-[calc(50%+9rem)]`}
          style={{ animationDelay: "-4s" }}
        />
      </div>
    </div>
  );
}

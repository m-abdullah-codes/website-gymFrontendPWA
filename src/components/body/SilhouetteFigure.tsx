"use client";

import { useEffect, useRef, useState } from "react";
import type { SilhouetteView } from "@/lib/volume/silhouette";
import { cn } from "@/lib/utils";

interface SilhouetteFigureProps {
  gender: "male" | "female";
  view: SilhouetteView;
  /** pathId → fill color. Paths not listed keep their default fill. */
  fills: Record<string, string>;
  onPathTap?: (pathId: string) => void;
  /** Paths to render with a selection outline. */
  selectedPathIds?: string[];
  className?: string;
}

/** In-memory cache of raw SVG markup — front/back flips stay instant. */
const svgCache = new Map<string, string>();

async function loadSvg(src: string): Promise<string> {
  const cached = svgCache.get(src);
  if (cached) return cached;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to load ${src}`);
  const text = await res.text();
  svgCache.set(src, text);
  return text;
}

/**
 * Renders one anatomical SVG (fetched + DOMParser-injected, per Appendix A).
 * Coloring goes through `path.style.fill` so the embedded CSS classes can't
 * override it; default fills are captured once per load and restored when a
 * path has no explicit color. The document is injected exactly once per
 * `src` — callbacks and fills live in refs so re-renders never re-parse.
 */
export function SilhouetteFigure({
  gender,
  view,
  fills,
  onPathTap,
  selectedPathIds = [],
  className,
}: SilhouetteFigureProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const defaultFills = useRef<Map<string, string>>(new Map());
  const tapRef = useRef(onPathTap);
  tapRef.current = onPathTap;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [docVersion, setDocVersion] = useState(0);
  const src = `/silhouettes/${gender}-${view}.svg`;

  // Load + inject the SVG document (once per src).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const markup = await loadSvg(src);
        if (cancelled || !hostRef.current) return;
        const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg) return;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        (svg as SVGSVGElement).style.width = "100%";
        (svg as SVGSVGElement).style.height = "100%";
        hostRef.current.replaceChildren(svg);

        // Capture each path's default fill (from the embedded classes) once.
        defaultFills.current = new Map();
        svg.querySelectorAll<SVGPathElement>("path[id]").forEach((p) => {
          defaultFills.current.set(p.id, getComputedStyle(p).fill || "#8c97a9");
          p.style.transition = "fill 240ms ease";
        });
        setLoadedKey(src);
        setDocVersion((v) => v + 1);
      } catch {
        // Asset failure leaves the placeholder visible — nothing to crash.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Apply fills whenever they change or a fresh document lands.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || loadedKey !== src) return;
    host.querySelectorAll<SVGPathElement>("path[id]").forEach((p) => {
      const explicit = fills[p.id];
      const fallback = defaultFills.current.get(p.id);
      p.style.fill = explicit ?? fallback ?? "";
      p.style.cursor = tapRef.current ? "pointer" : "default";
      if (selectedPathIds.includes(p.id)) {
        p.style.stroke = "#ffffff";
        p.style.strokeWidth = "3";
        p.style.filter = "drop-shadow(0 0 6px rgba(255,255,255,0.35))";
      } else {
        p.style.stroke = "";
        p.style.strokeWidth = "";
        p.style.filter = "";
      }
    });
  }, [fills, selectedPathIds, loadedKey, src, docVersion]);

  // Tap delegation — bound once to the host, reads the latest callback.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onClick = (e: Event) => {
      const target = e.target as Element | null;
      const path = target?.closest?.("path[id]");
      if (path?.id) tapRef.current?.(path.id);
    };
    host.addEventListener("click", onClick);
    return () => host.removeEventListener("click", onClick);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {loadedKey !== src && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3/4 w-1/3 animate-pulse rounded-[40%] bg-white/[0.05]" />
        </div>
      )}
      <div
        ref={hostRef}
        className={cn(
          "h-full w-full transition-opacity duration-200",
          loadedKey === src ? "opacity-100" : "opacity-0",
        )}
        role={onPathTap ? "group" : undefined}
        aria-label={`${gender} body, ${view} view`}
      />
    </div>
  );
}

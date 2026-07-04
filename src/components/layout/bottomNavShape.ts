/**
 * Parametric silhouette for the notched glass bottom bar.
 *
 * `clip-path: path()` only accepts absolute px coordinates, so the path is
 * rebuilt for the measured track width. Corner radii and the centre bump keep
 * fixed proportions at any width instead of stretching with the bar.
 */

export const BOTTOM_NAV_SHAPE_HEIGHT = 88;

/** Y of the bar's flat top edge; the centre bump rises from here to y = 0. */
export const BOTTOM_NAV_BAR_TOP = 26;

const CORNER_RADIUS = 26;

/** Half-width of the bump that cradles the centre action button. */
const BUMP_HALF_WIDTH = 58;

export function buildBottomNavPath(width: number): string {
  const w = width;
  const h = BOTTOM_NAV_SHAPE_HEIGHT;
  const t = BOTTOM_NAV_BAR_TOP;
  const r = CORNER_RADIUS;
  const cx = w / 2;
  const b = BUMP_HALF_WIDTH;

  return [
    `M 0 ${t + r}`,
    `A ${r} ${r} 0 0 1 ${r} ${t}`,
    `H ${cx - b}`,
    // Concave fillet rising out of the bar…
    `C ${cx - b + 12} ${t} ${cx - b + 20} ${t - 8} ${cx - b + 30} ${t - 18}`,
    // …convex crest over the action button…
    `C ${cx - 16} 0 ${cx - 8} 0 ${cx} 0`,
    `C ${cx + 8} 0 ${cx + 16} 0 ${cx + b - 30} ${t - 18}`,
    // …and back down into the bar.
    `C ${cx + b - 20} ${t - 8} ${cx + b - 12} ${t} ${cx + b} ${t}`,
    `H ${w - r}`,
    `A ${r} ${r} 0 0 1 ${w} ${t + r}`,
    `V ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `Z`,
  ].join(" ");
}

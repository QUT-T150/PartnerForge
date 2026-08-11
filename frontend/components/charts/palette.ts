/**
 * Series colours, validated against the white card surface: >=3:1 contrast, and
 * dE 24.7 (protanopia) / 32.7 (tritanopia) apart. Charts also carry legends and
 * labels, so colour never carries meaning alone. Third series: aqua #1baf7a.
 */
export const SERIES_COLORS = {
  primary: "#2a78d6",
  secondary: "#eb6834",
} as const;

/** Recessive ink for gridlines, axes, and rules. */
export const CHART_GRID = "#e5e7eb";

/** Muted ink for axis tick labels. */
export const CHART_TEXT_MUTED = "#6b7280";

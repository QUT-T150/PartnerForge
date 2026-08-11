/**
 * Categorical series colours for analytics charts.
 *
 * Blue and orange, validated as a pair against the white card surface:
 * both sit inside the L 0.43-0.77 lightness band, clear the 0.1 chroma floor,
 * exceed 3:1 contrast against #ffffff, and separate by dE 24.7 under protanopia
 * and 32.7 under tritanopia (target >= 8), so the split reads for colour-blind
 * viewers. Identity is never carried by colour alone: every chart here also
 * ships a legend, direct labels, and a data table toggle.
 *
 * Add a third series by taking the next validated slot (aqua #1baf7a) rather
 * than inventing a hue.
 */
export const SERIES_COLORS = {
  primary: "#2a78d6",
  secondary: "#eb6834",
} as const;

/** Recessive ink for gridlines, axes, and rules. */
export const CHART_GRID = "#e5e7eb";

/** Muted ink for axis tick labels. */
export const CHART_TEXT_MUTED = "#6b7280";

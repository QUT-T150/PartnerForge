"use client";

import { useState } from "react";
import styles from "./charts.module.css";

export interface StackedSeries {
  key: string;
  label: string;
  color: string;
}

export interface StackedDatum {
  label: string;
  values: Record<string, number>;
}

interface StackedBarChartProps {
  data: StackedDatum[];
  series: StackedSeries[];
  /** Accessible description of what the chart shows. */
  caption: string;
  emptyMessage?: string;
}

const WIDTH = 760;
const HEIGHT = 300;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 46;
const MAX_BAR_WIDTH = 54;
const SEGMENT_GAP = 2;
const CORNER = 4;

/** Axis maximum and ticks that land on round numbers (step first, not max/4). */
function niceScale(max: number): { axisMax: number; ticks: number[] } {
  const target = Math.max(Math.ceil(max), 1);
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

  let step = candidates.find((candidate) => Math.ceil(target / candidate) <= 5);
  if (step === undefined) {
    step = Math.pow(10, Math.ceil(Math.log10(target / 5)));
  }

  const count = Math.ceil(target / step);
  return {
    axisMax: step * count,
    ticks: Array.from({ length: count + 1 }, (_, index) => index * step),
  };
}

/** Bar segment: rounded far end, square baseline end. */
function segmentPath(x: number, y: number, w: number, h: number, rounded: boolean): string {
  if (!rounded || h <= CORNER) {
    return `M${x},${y} h${w} v${h} h${-w} Z`;
  }
  return [
    `M${x},${y + CORNER}`,
    `a${CORNER},${CORNER} 0 0 1 ${CORNER},${-CORNER}`,
    `h${w - CORNER * 2}`,
    `a${CORNER},${CORNER} 0 0 1 ${CORNER},${CORNER}`,
    `v${h - CORNER}`,
    `h${-w}`,
    "Z",
  ].join(" ");
}

export default function StackedBarChart({
  data,
  series,
  caption,
  emptyMessage = "No data to chart yet.",
}: StackedBarChartProps) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotHeight;

  const totals = data.map((d) =>
    series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0),
  );
  const { axisMax, ticks: tickValues } = niceScale(Math.max(...totals));
  const bandWidth = plotWidth / data.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, bandWidth * 0.6);

  const ticks = tickValues.map((value) => ({
    value,
    y: baseline - (value / axisMax) * plotHeight,
  }));

  // Label every other band once the axis gets crowded.
  const labelStride = data.length > 12 ? 2 : 1;

  const activeDatum = active === null ? null : data[active];
  // Clamped so the tooltip never hangs off either edge of the card.
  const tooltipLeft =
    active === null
      ? 0
      : Math.min(88, Math.max(12, ((PAD_LEFT + bandWidth * (active + 0.5)) / WIDTH) * 100));

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={caption}
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              className={styles.gridLine}
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={tick.y}
              y2={tick.y}
            />
            <text className={styles.tickLabel} x={PAD_LEFT - 8} y={tick.y + 4} textAnchor="end">
              {tick.value}
            </text>
          </g>
        ))}

        <line
          className={styles.axisLine}
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={baseline}
          y2={baseline}
        />

        {data.map((datum, index) => {
          const bandStart = PAD_LEFT + bandWidth * index;
          const x = bandStart + (bandWidth - barWidth) / 2;
          let cursor = baseline;

          const stack = series.map((s, seriesIndex) => {
            const value = datum.values[s.key] ?? 0;
            const rawHeight = (value / axisMax) * plotHeight;
            const isTop = seriesIndex === series.length - 1;
            const height = Math.max(0, rawHeight - (isTop ? 0 : SEGMENT_GAP));
            cursor -= rawHeight;
            return { key: s.key, color: s.color, y: cursor, height, value, isTop };
          });

          return (
            <g key={datum.label}>
              {stack.map(
                (segment) =>
                  segment.value > 0 && (
                    <path
                      key={segment.key}
                      d={segmentPath(x, segment.y, barWidth, segment.height, segment.isTop)}
                      fill={segment.color}
                    />
                  ),
              )}
              {index % labelStride === 0 && (
                <text
                  className={styles.tickLabelCenter}
                  x={bandStart + bandWidth / 2}
                  y={baseline + 18}
                >
                  {datum.label}
                </text>
              )}
              <rect
                className={active === index ? styles.hitAreaActive : styles.hitArea}
                x={bandStart}
                y={PAD_TOP}
                width={bandWidth}
                height={plotHeight}
                onMouseEnter={() => setActive(index)}
              />
            </g>
          );
        })}
      </svg>

      {activeDatum && (
        <div className={styles.tooltip} style={{ left: `${tooltipLeft}%`, top: "8px" }}>
          <div className={styles.tooltipTitle}>{activeDatum.label}</div>
          {series.map((s) => (
            <div key={s.key} className={styles.tooltipRow}>
              <span className={styles.tooltipSwatch} style={{ background: s.color }} />
              <span className={styles.tooltipLabel}>{s.label}</span>
              <span className={styles.tooltipValue}>{activeDatum.values[s.key] ?? 0}</span>
            </div>
          ))}
          <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}>
            <span className={styles.tooltipLabel}>Total</span>
            <span className={styles.tooltipValue}>
              {series.reduce((sum, s) => sum + (activeDatum.values[s.key] ?? 0), 0)}
            </span>
          </div>
        </div>
      )}

      <figcaption className={styles.legend}>
        {series.map((s) => (
          <span key={s.key} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

"use client";

import styles from "./charts.module.css";

export interface RankedDatum {
  id: string;
  label: string;
  meta?: string | null;
  value: number;
}

interface RankedBarChartProps {
  data: RankedDatum[];
  color: string;
  /** Accessible description of what the chart shows. */
  caption: string;
  /** Singular noun for the value, used in the accessible row description. */
  valueNoun?: string;
  emptyMessage?: string;
}

/** Single-series horizontal ranking. HTML, not SVG, so labels stay real text. */
export default function RankedBarChart({
  data,
  color,
  caption,
  valueNoun = "project",
  emptyMessage = "No data to chart yet.",
}: RankedBarChartProps) {
  if (data.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.srOnly}>{caption}</figcaption>
      <ul className={styles.rankedList}>
        {data.map((datum) => (
          <li key={datum.id} className={styles.rankedRow}>
            <div className={styles.rankedLabel} title={datum.label}>
              {datum.label}
              {datum.meta && <span className={styles.rankedMeta}>{datum.meta}</span>}
            </div>
            <div
              className={styles.rankedTrack}
              role="img"
              aria-label={`${datum.label}: ${datum.value} ${valueNoun}${datum.value === 1 ? "" : "s"}`}
            >
              <div
                className={styles.rankedFill}
                style={{ width: `${(datum.value / max) * 100}%`, background: color }}
              />
            </div>
            <div className={styles.rankedValue}>{datum.value}</div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

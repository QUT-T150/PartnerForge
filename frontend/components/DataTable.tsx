"use client";

import { Fragment, useEffect, useMemo, type ReactNode } from "react";
import styles from "./DataTable.module.css";

export interface Column<T> {
  key?: string;
  label: string;
  render?: (row: T) => ReactNode;
  // Optional explicit column width (e.g. "18%"), used with the fixed table
  // layout below so wide-content columns (long titles, emails) get more
  // room than narrow ones (status badges, counts) instead of an even split.
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows?: T[];
  data?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  // Optional expandable-row support: when a row's id (from getRowId) matches
  // expandedRowId, an extra full-width row renders right below it via
  // renderExpandedRow. Callers that don't pass these props are unaffected.
  expandedRowId?: string | number | null;
  getRowId?: (row: T) => string | number;
  renderExpandedRow?: (row: T) => ReactNode;
  // Optional "jumped here from elsewhere" marker: when a row's id (from
  // getRowId) matches highlightRowId, it gets a highlight fill and the
  // table scrolls it into view - so landing on a 50-row list from a link
  // elsewhere doesn't leave the user hunting for the right row.
  highlightRowId?: string | number | null;
}

export default function DataTable<T>({
  columns,
  rows,
  data,
  total,
  page = 1,
  pageSize = 25,
  onPageChange,
  emptyMessage = "No records to display.",
  expandedRowId,
  getRowId,
  renderExpandedRow,
  highlightRowId,
}: DataTableProps<T>) {
  // Memoized so an unchanged `rows`/`data` prop keeps the same array
  // reference across renders - the highlight/scroll effect below depends on
  // this reference to know when the visible rows actually changed (see its
  // comment), and without this it would be a fresh [] every render for any
  // table that passes neither prop, re-running that effect needlessly.
  const tableData = useMemo(() => data ?? rows ?? [], [data, rows]);

  useEffect(() => {
    if (highlightRowId == null) return;
    const el = document.querySelector(
      `[data-row-id="${CSS.escape(String(highlightRowId))}"]`,
    );
    // "smooth" here silently no-ops in some automated/headless browser
    // contexts (confirmed while testing this) - the default ("auto") jump
    // is instant but reliable everywhere, which matters more than the
    // animation.
    el?.scrollIntoView({ block: "center" });
    // tableData is in the deps deliberately, not just highlightRowId: when a
    // caller jumps to a specific row AND to the page that contains it (see
    // pageForProjectId/pageForPartnerId in page.tsx), the page's data loads
    // asynchronously *after* highlightRowId is already set. Without this,
    // this effect fires once on that first render - before the real page's
    // rows have arrived - finds nothing, and never gets another chance to
    // scroll once they do (highlightRowId itself never changes again). Now
    // it retries whenever the visible rows change while a highlight is
    // pending, so it reliably catches the row once its page has loaded.
  }, [highlightRowId, tableData]);
  const resultTotal = total ?? tableData.length;
  const firstResult = resultTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, resultTotal);
  const lastPage = Math.max(1, Math.ceil(resultTotal / pageSize));

  if (tableData.length === 0) {
    return <div className={`empty ${styles.empty}`}>{emptyMessage}</div>;
  }

  return (
    <div className={styles.tableShell}>
      <div className={`table-wrap ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key ?? col.label} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => {
              const rowId = getRowId ? getRowId(row) : i;
              const isExpanded =
                !!renderExpandedRow && !!getRowId && expandedRowId === rowId;
              const isHighlighted =
                !!getRowId && highlightRowId != null && highlightRowId === rowId;
              return (
                <Fragment key={i}>
                  <tr
                    data-row-id={getRowId ? rowId : undefined}
                    className={isHighlighted ? styles.highlightRow : undefined}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key ?? col.label}
                        style={col.width ? { width: col.width } : undefined}
                      >
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key ?? ""] ?? "")}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={columns.length} className={styles.expandedCell}>
                        {renderExpandedRow!(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {onPageChange && (
        <div className={styles.footer}>
          <span className={styles.count}>
            Showing {firstResult}-{lastResult} of {resultTotal} results
          </span>
          <div className={styles.pagination}>
            <button
              className={styles.button}
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              className={styles.button}
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= lastPage}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  const cls = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return <span className={`status status-${cls}`}>{value}</span>;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

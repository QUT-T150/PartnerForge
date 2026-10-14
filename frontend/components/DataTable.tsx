"use client";

import { Fragment, useEffect, useMemo, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import styles from "./DataTable.module.css";

export interface Column<T> {
  key?: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string;
  minWidth?: string;
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
  emptyAction?: ReactNode;
  expandedRowId?: string | number | null;
  getRowId?: (row: T) => string | number;
  renderExpandedRow?: (row: T) => ReactNode;
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
  emptyMessage = "No records matching your current filter criteria.",
  emptyAction,
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
    return (
      <div className={styles.tableShell}>
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIconWrap}>
            <Inbox size={24} strokeWidth={1.5} />
          </div>
          <h4 className={styles.emptyTitle}>No records found</h4>
          <p className={styles.emptySubtitle}>{emptyMessage}</p>
          {emptyAction && <div className={styles.emptyAction}>{emptyAction}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableShell}>
      <div className={`table-wrap ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key ?? col.label}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                  }}
                >
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
                        style={{
                          width: col.width,
                          minWidth: col.minWidth,
                        }}
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
            Showing <strong>{firstResult}–{lastResult}</strong> of <strong>{resultTotal}</strong> records
          </span>
          <div className={styles.pagination}>
            <button
              className={styles.button}
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} strokeWidth={2} />
              <span>Previous</span>
            </button>
            <button
              className={styles.button}
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= lastPage}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={13} strokeWidth={2} />
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

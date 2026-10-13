"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import styles from "./DataTable.module.css";

export interface Column<T> {
  key?: string;
  label: string;
  render?: (row: T) => ReactNode;
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
}: DataTableProps<T>) {
  const tableData = data ?? rows ?? [];
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
                <th key={col.key ?? col.label}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key ?? col.label}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key ?? ""] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
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

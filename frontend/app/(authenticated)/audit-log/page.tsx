"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FilterX,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { request } from "@/lib/api";
import "./audit-log.css";

interface AuditEntry {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  changedBy: string | null;
  changedByName: string | null;
  changedByEmail: string | null;
  changedAt: string;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuditPage {
  items: AuditEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

const ACTIONS = ["INSERT", "UPDATE", "DELETE", "SOFT_DELETE", "RESTORE"];
const PAGE_SIZE = 25;
const EXPORT_CAP = 1000;

interface Filters {
  action: string;
  tableName: string;
  changedBy: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { action: "", tableName: "", changedBy: "", from: "", to: "" };

function filterQuery(filters: Filters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.tableName) params.set("tableName", filters.tableName);
  if (filters.changedBy) params.set("changedBy", filters.changedBy);
  if (filters.from) params.set("from", `${filters.from}T00:00:00Z`);
  if (filters.to) params.set("to", `${filters.to}T23:59:59Z`);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

function formatSnapshotVal(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val;
  if (typeof val === "boolean") return val ? "true" : "false";
  return JSON.stringify(val);
}

/** Renders a field-by-field before/after comparison of the JSON snapshots. */
function DiffView({ entry }: { entry: AuditEntry }) {
  const parse = (json: string | null): Record<string, unknown> => {
    if (!json) return {};
    try {
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const oldValues = parse(entry.oldValues);
  const newValues = parse(entry.newValues);
  const keys = Array.from(
    new Set([...Object.keys(oldValues), ...Object.keys(newValues)]),
  ).sort();

  if (keys.length === 0) {
    return <p className="diff-empty">No value snapshots recorded for this event.</p>;
  }

  return (
    <div className="diff-wrap">
      <table className="diff-table">
        <thead>
          <tr>
            <th style={{ width: "25%" }}>Field</th>
            <th style={{ width: "37.5%" }}>Before</th>
            <th style={{ width: "37.5%" }}>After</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const hasOld = key in oldValues;
            const hasNew = key in newValues;
            const beforeVal = hasOld ? formatSnapshotVal(oldValues[key]) : "—";
            const afterVal = hasNew ? formatSnapshotVal(newValues[key]) : "—";
            const isChanged = hasOld && hasNew && beforeVal !== afterVal;
            const isAdded = !hasOld && hasNew;
            const isRemoved = hasOld && !hasNew;

            return (
              <tr
                key={key}
                className={
                  isChanged
                    ? "diff-row-changed"
                    : isAdded
                    ? "diff-row-added"
                    : isRemoved
                    ? "diff-row-removed"
                    : ""
                }
              >
                <td className="diff-key">{key}</td>
                <td>
                  <span
                    className={
                      isChanged || isRemoved ? "diff-val-removed" : "diff-val"
                    }
                  >
                    {beforeVal}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      isChanged || isAdded ? "diff-val-added" : "diff-val"
                    }
                  >
                    {afterVal}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="diff-meta">
        <span>Record: <strong>{entry.recordId}</strong></span>
        {entry.ipAddress && <span>IP: <strong>{entry.ipAddress}</strong></span>}
        {entry.userAgent && (
          <span title={entry.userAgent}>
            User Agent: <strong>{entry.userAgent.slice(0, 60)}{entry.userAgent.length > 60 ? "…" : ""}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditPage | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const isAdmin = user?.role === "admin";

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request<AuditPage>(
        `/auditlog?${filterQuery(filters, page, PAGE_SIZE)}`,
      );
      if (result) {
        setData(result);
        setRefreshedAt(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (!isAdmin) return;
    // Fetching the page is an async external sync point after initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage();
  }, [isAdmin, loadPage]);

  useEffect(() => {
    if (!isAdmin) return;
    request<string[]>("/auditlog/tables").then((t) => t && setTables(t));
    request<UserOption[]>("/users").then((u) => u && setUsers(u));
  }, [isAdmin]);

  // Writes can happen in other tabs or views while this page is open — refetch
  // whenever the page regains focus or becomes visible again.
  useEffect(() => {
    if (!isAdmin) return;
    const refetch = () => {
      if (document.visibilityState === "visible") loadPage();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [isAdmin, loadPage]);

  function setFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setExpandedId(null);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const result = await request<AuditPage>(
        `/auditlog?${filterQuery(filters, 1, EXPORT_CAP)}`,
      );
      if (!result) return;
      const header = [
        "id", "changed_at", "table", "action", "record_id",
        "changed_by_name", "changed_by_email", "ip_address",
        "old_values", "new_values",
      ].join(",");
      const rows = result.items.map((e) =>
        [
          e.id, e.changedAt, e.tableName, e.action, e.recordId,
          e.changedByName, e.changedByEmail, e.ipAddress,
          e.oldValues, e.newValues,
        ].map(csvEscape).join(","),
      );
      const blob = new Blob([[header, ...rows].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="audit-page">
        <div className="container">
          <div className="audit-denied">
            <ShieldAlert size={22} />
            <div>
              <h3>Administrators only</h3>
              <p>
                The audit log contains change history across every record in the
                system, so it is restricted to administrator accounts.
              </p>
              <Link href="/dashboard">Back to dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = Boolean(
    filters.action || filters.tableName || filters.changedBy || filters.from || filters.to
  );

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setExpandedId(null);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const firstEvent = data && data.totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastEvent = data ? Math.min(page * PAGE_SIZE, data.totalCount) : 0;

  return (
    <div className="audit-page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-main">
            <div className="category-label">PARTNERFORGE // SECURITY & AUDIT</div>
            <div className="page-header-title-row">
              <h1 className="page-heading">Audit Log</h1>
              {data && (
                <span className="section-badge">{data.totalCount.toLocaleString()} events</span>
              )}
            </div>
            <p className="page-subtitle">
              Every create, update, and delete made through the API — who did it,
              when, from where, and what changed. Times are UTC.
            </p>
          </div>
          <div className="page-header-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={loadPage}
              disabled={loading}
              title="Refresh audit log"
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
              <span>{loading ? "Refreshing…" : "Refresh"}</span>
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={exportCsv}
              disabled={exporting || !data || data.totalCount === 0}
              title="Export filtered records as CSV"
            >
              <Download size={13} />
              <span>{exporting ? "Exporting…" : "Export CSV"}</span>
            </button>
          </div>
        </div>

        <div className="audit-toolbar">
          <div className="audit-toolbar-filters">
            <div className="audit-select-wrap">
              <select
                value={filters.action}
                onChange={(e) => setFilter("action", e.target.value)}
                aria-label="Filter by action"
              >
                <option value="">All actions</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>{a.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            <div className="audit-select-wrap">
              <select
                value={filters.tableName}
                onChange={(e) => setFilter("tableName", e.target.value)}
                aria-label="Filter by table"
              >
                <option value="">All tables</option>
                {tables.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="audit-select-wrap">
              <select
                value={filters.changedBy}
                onChange={(e) => setFilter("changedBy", e.target.value)}
                aria-label="Filter by user"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>

            <div className="audit-date-range">
              <label className="date-field">
                <span className="date-label">From</span>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilter("from", e.target.value)}
                  aria-label="Filter from date"
                />
              </label>
              <span className="date-separator">–</span>
              <label className="date-field">
                <span className="date-label">To</span>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilter("to", e.target.value)}
                  aria-label="Filter to date"
                />
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="audit-clear-btn"
                onClick={clearFilters}
              >
                <X size={12} />
                <span>Clear filters</span>
              </button>
            )}
          </div>

          {refreshedAt && (
            <div className="audit-toolbar-meta">
              Updated {refreshedAt.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>When (UTC)</th>
                <th>Table</th>
                <th>Action</th>
                <th>By</th>
                <th>Record</th>
                <th aria-label="Expand" />
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <tr>
                  <td colSpan={6}>
                    <div className="audit-empty-container">
                      <div className="audit-empty-icon-wrap">
                        <RefreshCw size={20} className="spin" />
                      </div>
                      <h4 className="audit-empty-title">Loading audit events…</h4>
                      <p className="audit-empty-subtitle">
                        Retrieving recorded database changes and snapshots.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="audit-empty-container">
                      <div className="audit-empty-icon-wrap">
                        {hasActiveFilters ? (
                          <FilterX size={22} />
                        ) : (
                          <ShieldCheck size={22} />
                        )}
                      </div>
                      <h4 className="audit-empty-title">
                        {hasActiveFilters
                          ? "No matching audit events"
                          : "No audit records found"}
                      </h4>
                      <p className="audit-empty-subtitle">
                        {hasActiveFilters
                          ? "No audit events match these filters. Try adjusting your parameters."
                          : "No recorded change events exist in the database yet."}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="secondary-btn audit-empty-btn"
                          onClick={clearFilters}
                        >
                          Clear active filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {data?.items.map((entry) => (
                <Fragment key={entry.id}>
                  <tr
                    className={`audit-row ${expandedId === entry.id ? "audit-row-expanded" : ""}`}
                    onClick={() =>
                      setExpandedId(expandedId === entry.id ? null : entry.id)
                    }
                  >
                    <td className="mono">
                      {entry.changedAt.replace("T", " ").slice(0, 19)}
                    </td>
                    <td>{entry.tableName}</td>
                    <td>
                      <span className={`action-badge action-${entry.action.toLowerCase()}`}>
                        {entry.action.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {entry.changedByName ?? (
                        <span className="system-actor">system</span>
                      )}
                    </td>
                    <td className="mono record-id" title={entry.recordId}>
                      {entry.recordId.slice(0, 8)}…
                    </td>
                    <td className="expander">
                      {expandedId === entry.id ? (
                        <ChevronDown size={14} strokeWidth={2} />
                      ) : (
                        <ChevronRight size={14} strokeWidth={2} />
                      )}
                    </td>
                  </tr>
                  {expandedId === entry.id && (
                    <tr className="diff-row">
                      <td colSpan={6}>
                        <DiffView entry={entry} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>

          <div className="audit-footer">
            <span className="audit-footer-count">
              {data && data.totalCount > 0 ? (
                <>
                  Showing <strong>{firstEvent}–{lastEvent}</strong> of <strong>{data.totalCount.toLocaleString()}</strong> events
                </>
              ) : (
                <span>0 events</span>
              )}
            </span>
            <div className="audit-footer-pagination">
              <button
                type="button"
                className="audit-pager-btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={13} strokeWidth={2} />
                <span>Previous</span>
              </button>
              <span className="audit-page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="audit-pager-btn"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

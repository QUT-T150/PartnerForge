"use client";

import { useEffect, useState } from "react";
import { request } from "@/lib/api";
import "@/app/(authenticated)/audit-log/audit-log.css";

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

function parseJson(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function DiffView({ entry }: { entry: AuditEntry }) {
  const oldValues = parseJson(entry.oldValues);
  const newValues = parseJson(entry.newValues);
  const keys = Array.from(
    new Set([...Object.keys(oldValues), ...Object.keys(newValues)]),
  ).sort();

  const show = (values: Record<string, unknown>, key: string) =>
    key in values ? JSON.stringify(values[key]) : "—";

  if (keys.length === 0) {
    return <p className="diff-empty">No value snapshots on this event.</p>;
  }

  return (
    <table className="diff-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Before</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => {
          const before = show(oldValues, key);
          const after = show(newValues, key);
          const changed =
            key in oldValues && key in newValues && before !== after;
          return (
            <tr key={key} className={changed ? "diff-changed" : ""}>
              <td className="diff-key">{key}</td>
              <td>{before}</td>
              <td>{after}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface AuditHistoryPanelProps {
  tableName: string;
  recordId: string;
}

export default function AuditHistoryPanel({
  tableName,
  recordId,
}: AuditHistoryPanelProps) {
  const [data, setData] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    request<AuditPage>(
      `/auditlog?tableName=${tableName}&recordId=${recordId}&pageSize=50`,
    )
      .then((result) => {
        if (!cancelled && result) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableName, recordId]);

  if (loading) return <p className="diff-empty">Loading history…</p>;

  if (!data || data.items.length === 0) {
    return <p className="diff-empty">No changes recorded yet for this record.</p>;
  }

  return (
    <div className="audit-table-wrap">
      {data.items.map((entry) => (
        <div key={entry.id} className="audit-row" style={{ marginBottom: "8px" }}>
          <div
            onClick={() =>
              setExpandedId(expandedId === entry.id ? null : entry.id)
            }
            style={{ cursor: "pointer", display: "flex", gap: "12px", alignItems: "center" }}
          >
            <span className={`action-badge action-${entry.action.toLowerCase()}`}>
              {entry.action.replace("_", " ")}
            </span>
            <span>{entry.changedByName ?? "system"}</span>
            <span className="mono">
              {entry.changedAt.replace("T", " ").slice(0, 19)}
            </span>
            <span className="expander">
              {expandedId === entry.id ? "▾" : "▸"}
            </span>
          </div>
          {expandedId === entry.id && <DiffView entry={entry} />}
        </div>
      ))}
    </div>
  );
}
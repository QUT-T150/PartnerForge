"use client";

import { useState, useEffect, type FormEvent } from "react";
import AuditHistoryPanel from "./AuditHistoryPanel";

export type FieldDef = [
  name: string,
  label: string,
  inputType: string,
  required: boolean,
  options?: string[],
];

interface Organisation {
  id: string;
  name: string;
}

interface Industry {
  id: number;
  name: string;
}

interface RecordModalProps {
  open: boolean;
  title: string;
  fields: FieldDef[];
  record: Record<string, unknown>;
  partners: Organisation[];
  industries?: Industry[];
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  tableName?: string;
  canViewHistory?: boolean;
  // When true, this is a quick read-only peek opened from elsewhere (e.g. a
  // project's Partner cell, or an organisation's expanded Projects list)
  // rather than this record's own Edit action - the view-mode Edit button is
  // replaced with a plain link (peekLinkLabel) that runs onPeekNavigate.
  peekMode?: boolean;
  peekLinkLabel?: string;
  onPeekNavigate?: () => void;
}

function defaultValue(name: string): unknown {
  const defaults: Record<string, unknown> = {
    partnershipStatus: "prospect",
    projectType: "capstone",
    semester: "S1",
    year: new Date().getFullYear(),
    status: "proposed",
    multipleTeams: "false",
    proposedProjectType: "capstone",
    proposedSemester: "S1",
    proposedYear: new Date().getFullYear(),
    proposedMultipleTeams: "false",
    eventType: "meeting",
    eventDate: new Date().toISOString().slice(0, 10),
    role: "industry_partner",
    isActive: "true",
  };
  return defaults[name];
}

export default function RecordModal({
  open,
  title,
  fields,
  record,
  partners,
  industries = [],
  isNew,
  onClose,
  onSubmit,
  tableName,
  canViewHistory = false,
  peekMode = false,
  peekLinkLabel = "View record",
  onPeekNavigate,
}: RecordModalProps) {
  const [view, setView] = useState<"form" | "history">("form");
  // Existing records open read-only first - "Edit partner" full of input
  // boxes reads like a blank form to fill in, not a record to look at.
  // New records skip straight to the form since there is nothing to view yet.
  const [detailMode, setDetailMode] = useState<"view" | "edit">(
    isNew ? "edit" : "view",
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetailMode(isNew ? "edit" : "view");
      setView("form");
    }
  }, [open, record.id, isNew]);

  if (!open) return null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form.entries());

    ["industryId", "facultyId", "year", "proposedYear", "proposedFacultyId"].forEach(
      (key) => {
        data[key] = data[key] ? Number(data[key]) : null;
      },
    );
    ["contactId", "organisationId"].forEach((key) => {
      data[key] = data[key] || null;
    });
    if (data.isActive !== undefined) data.isActive = data.isActive === "true";
    if (data.multipleTeams !== undefined) {
      data.multipleTeams = data.multipleTeams === "true";
    }
    if (data.proposedMultipleTeams !== undefined) {
      data.proposedMultipleTeams = data.proposedMultipleTeams === "true";
    }
    if (data.password === "") data.password = null;

    onSubmit(data);
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={view === "history" ? { maxWidth: "800px", width: "90vw" } : undefined}
      >
        <h2>
          {isNew ? `Add ${title}` : detailMode === "edit" ? `Edit ${title}` : `View ${title}`}
        </h2>

        {!isNew && canViewHistory && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", borderBottom: "1px solid #e2e2e2" }}>
            <button
              type="button"
              onClick={() => setView("form")}
              style={{
                padding: "8px 12px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontWeight: view === "form" ? 600 : 400,
                borderBottom: view === "form" ? "2px solid #1a2b4a" : "2px solid transparent",
              }}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setView("history")}
              style={{
                padding: "8px 12px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontWeight: view === "history" ? 600 : 400,
                borderBottom: view === "history" ? "2px solid #1a2b4a" : "2px solid transparent",
              }}
            >
              History
            </button>
          </div>
        )}

        {view === "history" && tableName && record.id ? (
          <AuditHistoryPanel tableName={tableName} recordId={String(record.id)} />
        ) : detailMode === "view" ? (
          <div>
            <div className="form-grid">
              {fields.map(([name, label, inputType]) => {
                if (inputType === "password") return null;
                const raw = record[name];
                let display: string;
                if (raw === null || raw === undefined || raw === "") {
                  display = "\u2014";
                } else if (inputType === "select-org" || inputType === "select-org-empty") {
                  display =
                    (record["organisationName"] as string) ||
                    partners.find((p) => p.id === raw)?.name ||
                    "\u2014";
                } else if (inputType === "select-industry") {
                  display =
                    (record["industry"] as string) ||
                    industries.find((ind) => ind.id === Number(raw))?.name ||
                    "Unspecified";
                } else if (typeof raw === "boolean") {
                  display = raw ? "Yes" : "No";
                } else if (inputType === "date") {
                  const d = new Date(String(raw));
                  display = Number.isNaN(d.getTime())
                    ? String(raw)
                    : d.toLocaleDateString();
                } else {
                  display = String(raw);
                }
                const full = inputType === "textarea" ? " full" : "";
                return (
                  <div key={name} className={`form-group${full}`}>
                    <label>{label}</label>
                    <div className="view-value">{display}</div>
                  </div>
                );
              })}
            </div>
            <div className="modal-actions view-actions">
              <button type="button" className="secondary-btn" onClick={onClose}>
                Close
              </button>
              {peekMode && onPeekNavigate ? (
                <button
                  type="button"
                  className="link-btn"
                  onClick={onPeekNavigate}
                >
                  {peekLinkLabel} &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setDetailMode("edit")}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {fields.map(([name, label, inputType, required, options]) => {
              const value = record[name] ?? defaultValue(name) ?? "";
              const isRequired =
                required || (isNew && name === "password");
              const full = inputType === "textarea" ? " full" : "";
              const inputId = `field-${name}`;

              if (inputType === "textarea") {
                return (
                  <div key={name} className={`form-group${full}`}>
                    <label htmlFor={inputId}>{label}</label>
                    <textarea
                      id={inputId}
                      name={name}
                      defaultValue={String(value)}
                      required={isRequired}
                    />
                  </div>
                );
              }

              if (inputType === "select" && options) {
                return (
                  <div key={name} className="form-group">
                    <label htmlFor={inputId}>{label}</label>
                    <select
                      id={inputId}
                      name={name}
                      defaultValue={String(value)}
                      required={isRequired}
                    >
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (inputType === "select-org") {
                return (
                  <div key={name} className="form-group">
                    <label htmlFor={inputId}>{label}</label>
                    <select
                      id={inputId}
                      name={name}
                      defaultValue={String(value)}
                      required={isRequired}
                    >
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (inputType === "select-org-empty") {
                return (
                  <div key={name} className="form-group">
                    <label htmlFor={inputId}>{label}</label>
                    <select
                      id={inputId}
                      name={name}
                      defaultValue={String(value)}
                      required={isRequired}
                    >
                      <option value="">No organisation</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (inputType === "select-industry") {
                return (
                  <div key={name} className="form-group">
                    <label htmlFor={inputId}>{label}</label>
                    <select
                      id={inputId}
                      name={name}
                      defaultValue={String(value)}
                      required={isRequired}
                    >
                      <option value="">Unspecified</option>
                      {industries.map((industry) => (
                        <option key={industry.id} value={industry.id}>
                          {industry.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={name} className={`form-group${full}`}>
                  <label htmlFor={inputId}>{label}</label>
                  <input
                    id={inputId}
                    name={name}
                    type={inputType}
                    defaultValue={String(value)}
                    required={isRequired}
                  />
                </div>
              );
            })}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => (isNew ? onClose() : setDetailMode("view"))}
            >
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

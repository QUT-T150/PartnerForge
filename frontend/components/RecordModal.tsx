"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

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
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
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
}: RecordModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
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

      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay active" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="category-label">Record Management</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {error && <div className="modal-error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {fields.map(([name, label, inputType, required, options]) => {
              const value = record[name] ?? defaultValue(name) ?? "";
              const isRequired = required || (isNew && name === "password");
              const full = inputType === "textarea" ? " full" : "";
              const inputId = `field-${name}`;

              if (inputType === "textarea") {
                return (
                  <div key={name} className={`form-group${full}`}>
                    <label htmlFor={inputId}>
                      {label}
                      {isRequired && <span className="required-star">*</span>}
                    </label>
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
                    <label htmlFor={inputId}>
                      {label}
                      {isRequired && <span className="required-star">*</span>}
                    </label>
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
                    <label htmlFor={inputId}>
                      {label}
                      {isRequired && <span className="required-star">*</span>}
                    </label>
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
                    <label htmlFor={inputId}>
                      {label}
                      {isRequired && <span className="required-star">*</span>}
                    </label>
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
                    <label htmlFor={inputId}>
                      {label}
                      {isRequired && <span className="required-star">*</span>}
                    </label>
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
                  <label htmlFor={inputId}>
                    {label}
                    {isRequired && <span className="required-star">*</span>}
                  </label>
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
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

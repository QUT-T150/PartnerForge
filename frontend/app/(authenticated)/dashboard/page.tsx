"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  Building2,
  Building,
  ClipboardList,
  Calendar,
  FileText,
  BarChart3,
  Users,
  ShieldAlert,
  Upload,
  Loader,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  ArrowRight,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  PERM_LABEL,
  getPermissions,
  type Role,
  type PermLevel,
} from "@/lib/permissions";
import "./dashboard.css";

import { uploadFileAction } from "@/helper/upload";
import {
  TABLE_CONFIGS,
  type UploadState,
  validateCsvForTable,
  suggestColumnMapping,
  generateReportCsv,
} from "@/helper/upload-core";
import { useActionState } from "react";

interface UploadPreset {
  value: string;
  label: string;
  Icon: LucideIcon;
  description: string;
  headers: string[];
}

const UPLOAD_TABLES: UploadPreset[] = [
  {
    value: "partners",
    label: "Industry Partner",
    Icon: Building2,
    description: "Import partner organisations and primary contact details.",
    headers: [
      "Project_id",
      "Registration ID",
      "Organisation Name",
      "Address",
      "ABN",
      "Industy Partner Contact Name(s)",
      "Position Title",
      "Email",
      "Phone",
    ],
  },
  {
    value: "projects",
    label: "Projects",
    Icon: ClipboardList,
    description: "Import capstone, undergrad, and postgrad project history.",
    headers: [
      "Project Title",
      "Project Description",
      "Project Partner Agreement",
      "Student Project Agreement - IP Licence/Assignment",
    ],
  },
  {
    value: "organisation",
    label: "Organisation",
    Icon: Building,
    description: "Import organization profiles and industry supervisor contacts.",
    headers: [
      "Organisation Name",
      "Address",
      "ABN",
      "Industry Supervisor's Name",
      "Industry Supervisor's Position Title",
      "Business Phone",
      "Business Email",
      "Organisation Information",
    ],
  },
  {
    value: "events",
    label: "Events",
    Icon: Calendar,
    description: "Import event invitations and RSVP attendance records.",
    headers: [
      "Organisation",
      "First Name",
      "Best contact person to liaise with on this event",
      "Position Title",
      "Email",
      "List",
      "Source",
      "Events Invited to",
      "Response",
    ],
  },
  {
    value: "applications",
    label: "Project Applications",
    Icon: FileText,
    description: "Import partner project proposals and submission records.",
    headers: [
      "Proposed Title",
      "Proposed Description",
      "Proposed Project Type",
      "Proposed Semester",
      "Proposed Year",
    ],
  },
  {
    value: "users",
    label: "Users",
    Icon: Users,
    description: "Import workforce staff accounts, roles, and permissions.",
    headers: ["Email", "Full Name", "Role", "Password"],
  },
];

const INITIAL_UPLOAD_STATE: UploadState = { status: "idle", message: "" };

const WELCOME_MESSAGES: Record<string, string> = {
  admin:
    "You have full access to all features, including user and organisation management.",
  course_organiser:
    "You can read and edit Industry Partners, Projects, and Events. User management is restricted to administrators.",
  industry_partner:
    "You have read-only access to projects and events relevant to your organisation.",
};

interface TabCard {
  key: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  onClick?: () => void;
}

const TAB_CARDS: TabCard[] = [
  {
    key: "partners",
    Icon: Building2,
    title: "Industry Partners",
    desc: "View and manage QUT's industry partner organisations.",
    href: "/platform?view=partners",
  },
  {
    key: "projects",
    Icon: ClipboardList,
    title: "Projects",
    desc: "Browse capstone, undergrad, and postgrad project history.",
    href: "/platform?view=projects",
  },
  {
    key: "events",
    Icon: Calendar,
    title: "Events",
    desc: "Track showcases, expos, and industry meetings.",
    href: "/platform?view=events",
  },
  {
    key: "applications",
    Icon: FileText,
    title: "Project Applications",
    desc: "Review partner-facing project proposals and submission status.",
    href: "/platform?view=applications",
  },
  {
    key: "analytics",
    Icon: BarChart3,
    title: "Analytics",
    desc: "Reports on partner activity, intake trends, and engagement.",
    href: "#",
  },
  {
    key: "users",
    Icon: Users,
    title: "User Management",
    desc: "Add staff accounts, assign roles, manage permissions.",
    href: "/platform?view=users",
  },
  {
    key: "upload",
    Icon: Upload,
    title: "Upload",
    desc: "Upload files to the platform.",
    href: "#upload-section",
  }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [state, formAction, isPending] = useActionState(
    uploadFileAction,
    INITIAL_UPLOAD_STATE,
  );
  if (!user) return null;

  console.log(user.role, "role");

  const role = user.role as Role;
  const perms = getPermissions(role);
  const firstName = user.fullName.split(" ")[0];
  const welcomeMsg =
    WELCOME_MESSAGES[role] || WELCOME_MESSAGES.industry_partner;

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="welcome">
          <h2>Welcome back, {firstName}</h2>
          <p>{welcomeMsg}</p>
        </div>

        {role === "admin" && (
          <div className="admin-only">
            <div className="admin-only-header">
              <ShieldAlert size={18} />
              <h3>Administrator tools</h3>
            </div>
            <p>
              You have full access. From here you can create new organisations,
              manage users, and configure system-wide settings.
            </p>
          </div>
        )}

        <div className="section-title">Application tabs</div>

        <div className="grid">
          {TAB_CARDS.map((tab) => {
            const level = (perms[tab.key] || "no") as PermLevel;
            const label = PERM_LABEL[level];
            const disabled = level === "no";
            const { Icon } = tab;

            const cardContent = (
              <>
                <div className="tab-icon">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div className="tab-title">{tab.title}</div>
                <div className="tab-desc">{tab.desc}</div>
                <div className={`tab-permission ${label.cls}`}>
                  {label.text}
                </div>
              </>
            );

            if (disabled) {
              return (
                <div key={tab.key} className="tab-card disabled">
                  {cardContent}
                </div>
              );
            }

            return (
              <Link key={tab.key} href={tab.href} className="tab-card" onClick={tab.onClick}>
                {cardContent}
              </Link>
            );
          })}
        </div>

        {perms.upload === "rw" && (
          <div id="upload-section" className="upload-container-section">
            <div className="upload-header">
              <div>
                <h3 className="upload-title">
                  <Upload className="text-blue-600 inline-block mr-2" size={20} />
                  Bulk CSV Import Center
                </h3>
                <p className="upload-subtitle">
                  Select a category, inspect the expected CSV headers, drag your file, and import records directly into the platform.
                </p>
              </div>
            </div>

            <UploadFormSection state={state} formAction={formAction} isPending={isPending} />
          </div>
        )}

        <div className="info-row">
          <strong>Authenticated session.</strong> You are signed in with a
          secure httpOnly cookie. Every request your tabs make to the API is
          proxied through the server with your credentials attached
          automatically.
        </div>
      </div>
    </div>
  );
}

function UploadFormSection({
  state,
  formAction,
  isPending,
}: {
  state: UploadState;
  formAction: (payload: FormData) => void;
  isPending: boolean;
}) {
  const [selectedTable, setSelectedTable] = useState("partners");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset =
    UPLOAD_TABLES.find((t) => t.value === selectedTable) || UPLOAD_TABLES[0];
  const tableConfig = TABLE_CONFIGS[selectedTable] || TABLE_CONFIGS.partners;

  const handleTableSelect = (tableValue: string) => {
    if (tableValue === selectedTable) return;
    setSelectedTable(tableValue);
    setValidationError(null);

    const newConfig = TABLE_CONFIGS[tableValue];
    if (previewHeaders.length > 0 && newConfig) {
      const newMapping = suggestColumnMapping(previewHeaders, newConfig.fields);
      setColumnMapping(newMapping);
    } else {
      setColumnMapping({});
    }
  };

  const handleFileSelect = (selectedFile: File | null) => {
    setValidationError(null);
    if (!selectedFile) {
      setFile(null);
      setPreviewRows([]);
      setPreviewHeaders([]);
      setColumnMapping({});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      preview: 10,
      complete: (results) => {
        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          setValidationError("The uploaded CSV file contains no header columns.");
          setFile(null);
          setPreviewRows([]);
          setPreviewHeaders([]);
          setColumnMapping({});
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }

        const config = TABLE_CONFIGS[selectedTable] || TABLE_CONFIGS.partners;
        const initialMapping = suggestColumnMapping(headers, config.fields);

        setValidationError(null);
        setFile(selectedFile);
        setPreviewHeaders(headers);
        setPreviewRows(results.data || []);
        setColumnMapping(initialMapping);
      },
      error: (err) => {
        setValidationError(`Could not parse CSV file: ${err.message}`);
        setFile(null);
        setPreviewRows([]);
        setPreviewHeaders([]);
        setColumnMapping({});
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  const handleMappingChange = (fieldKey: string, csvHeader: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [fieldKey]: csvHeader,
    }));
  };

  const handleClearMappings = () => {
    if (tableConfig) {
      const cleared: Record<string, string> = {};
      for (const field of tableConfig.fields) {
        cleared[field.key] = "";
      }
      setColumnMapping(cleared);
    }
  };

  const missingRequiredFields = tableConfig.fields.filter(
    (f) => f.required && (!columnMapping[f.key] || columnMapping[f.key].trim() === ""),
  );

  const mappedFieldsCount = Object.values(columnMapping).filter(
    (v) => v && v.trim() !== "",
  ).length;

  const isFormValid =
    file !== null &&
    missingRequiredFields.length === 0 &&
    mappedFieldsCount > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv") || droppedFile.type === "text/csv") {
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(droppedFile);
          fileInputRef.current.files = dataTransfer.files;
        }
        handleFileSelect(droppedFile);
      } else {
        setValidationError("Please select a valid .csv file.");
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <form action={formAction} className="upload-form-modern">
      <input type="hidden" name="table" value={selectedTable} />
      <input
        type="hidden"
        name="columnMapping"
        value={JSON.stringify(columnMapping)}
      />

      {/* Preset Category Selector */}
      <div className="preset-selector-group">
        <label className="preset-label">1. Select Target Category</label>
        <div className="preset-tabs-grid">
          {UPLOAD_TABLES.map((t) => {
            const IconComponent = t.Icon;
            const isSelected = selectedTable === t.value;
            return (
              <button
                key={t.value}
                type="button"
                className={`preset-tab-card ${isSelected ? "active" : ""}`}
                onClick={() => handleTableSelect(t.value)}
              >
                <div className="preset-tab-header">
                  <div className="preset-tab-icon">
                    <IconComponent size={18} />
                  </div>
                  <span className="preset-tab-title">{t.label}</span>
                </div>
                <p className="preset-tab-desc">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expected Headers Reference Bar */}
      <div className="schema-reference-card">
        <div className="schema-header">
          <Info size={16} className="text-blue-600 shrink-0" />
          <span>Expected Schema Fields for <strong>{currentPreset.label}</strong>:</span>
        </div>
        <div className="schema-chips">
          {tableConfig.fields.map((f, i) => (
            <span key={i} className={`schema-chip ${f.required ? "chip-required" : ""}`}>
              {f.key} {f.required && <span className="chip-req-star">*</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Dropzone File Input */}
      <div className="dropzone-group">
        <label className="preset-label">2. Select or Drag CSV File</label>
        <div
          className={`dropzone-box ${isDragging ? "dragging" : ""} ${
            file ? "has-file" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="hidden-file-input"
            onChange={(e) =>
              handleFileSelect(e.target.files ? e.target.files[0] : null)
            }
          />

          {!file ? (
            <div className="dropzone-empty">
              <div className="dropzone-icon-circle">
                <FileSpreadsheet size={28} />
              </div>
              <p className="dropzone-primary-text">
                Click to browse or drop your <span>.csv file</span> here
              </p>
              <p className="dropzone-secondary-text">
                Supports comma-separated UTF-8 formatted CSV files with custom or standard headers
              </p>
            </div>
          ) : (
            <div className="dropzone-file-info" onClick={(e) => e.stopPropagation()}>
              <div className="file-info-main">
                <FileSpreadsheet size={24} className="text-emerald-600" />
                <div className="file-text-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {formatFileSize(file.size)} • {previewHeaders.length} columns detected
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                onClick={() => handleFileSelect(null)}
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {validationError && (
          <div className="upload-status-card status-error mt-4" style={{ marginTop: "1rem" }}>
            <div className="status-card-header">
              <AlertCircle size={20} className="text-rose-600 shrink-0" style={{ color: "#e11d48", minWidth: 20 }} />
              <div className="status-header-text">
                <span className="status-title-badge" style={{ color: "#9f1239", fontWeight: 600 }}>File Parsing Error</span>
                <p className="status-msg" style={{ color: "#be123c", marginTop: 2 }}>{validationError}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Interactive Column Mapping Interface */}
      {file && previewHeaders.length > 0 && (
        <div className="column-mapping-container">
          <div className="mapping-header-bar">
            <div className="mapping-title-group">
              <div className="mapping-title-row">
                <SlidersHorizontal size={18} className="text-blue-600 shrink-0" />
                <h4 className="mapping-title">3. Match CSV Columns to System Fields</h4>
                {missingRequiredFields.length > 0 ? (
                  <span className="mapping-status-pill pill-warning">
                    <AlertCircle size={13} />
                    {missingRequiredFields.length} required field{missingRequiredFields.length > 1 ? "s" : ""} unmapped
                  </span>
                ) : (
                  <span className="mapping-status-pill pill-success">
                    <CheckCircle2 size={13} />
                    Ready to import ({mappedFieldsCount} fields mapped)
                  </span>
                )}
              </div>
              <p className="mapping-subtitle">
                Select which column from your CSV maps to each expected field. Custom column headers (e.g. &ldquo;User Name&rdquo; &rarr; &ldquo;Name&rdquo;) can be assigned below.
              </p>
            </div>

            <div className="mapping-actions-group">
              <button
                type="button"
                className="mapping-action-btn btn-secondary"
                onClick={handleClearMappings}
                title="Clear all selected column mappings"
              >
                <RefreshCw size={14} />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {missingRequiredFields.length > 0 && (
            <div className="mapping-alert-banner">
              <AlertCircle size={16} className="shrink-0" />
              <span>
                Please map required field(s): <strong>{missingRequiredFields.map((f) => f.aliases?.[0] || f.key).join(", ")}</strong> before importing.
              </span>
            </div>
          )}

          <div className="mapping-table-wrapper">
            <table className="mapping-table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>System Field ({currentPreset.label})</th>
                  <th style={{ width: "8%", textAlign: "center" }}>Mapping</th>
                  <th style={{ width: "35%" }}>Your CSV Column</th>
                  <th style={{ width: "22%" }}>Sample Value Preview</th>
                </tr>
              </thead>
              <tbody>
                {tableConfig.fields.map((field) => {
                  const currentMapped = columnMapping[field.key] || "";
                  const firstRow = previewRows[0] || {};
                  const sampleValue = currentMapped ? firstRow[currentMapped] : undefined;
                  const isRequired = !!field.required;
                  const isFieldMissing = isRequired && !currentMapped;

                  return (
                    <tr
                      key={field.key}
                      className={`mapping-row ${isFieldMissing ? "row-missing-required" : ""}`}
                    >
                      <td className="mapping-field-cell">
                        <div className="field-info-name">
                          <span className="field-key-name">{field.key}</span>
                          {isRequired ? (
                            <span className="badge-required">Required</span>
                          ) : (
                            <span className="badge-optional">Optional</span>
                          )}
                        </div>
                        {field.aliases && field.aliases.length > 0 && (
                          <span className="field-aliases-hint">
                            e.g., {field.aliases.slice(0, 2).join(", ")}
                          </span>
                        )}
                      </td>

                      <td className="mapping-arrow-cell">
                        <ArrowRight size={16} className="mapping-arrow-icon" />
                      </td>

                      <td className="mapping-select-cell">
                        <select
                          className={`mapping-dropdown ${isFieldMissing ? "dropdown-invalid" : ""} ${
                            currentMapped ? "dropdown-selected" : ""
                          }`}
                          value={currentMapped}
                          onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        >
                          <option value="">
                            {isRequired
                              ? "-- Select matching CSV column --"
                              : "-- Do not import (leave empty) --"}
                          </option>
                          {previewHeaders.map((header) => {
                            const sample = firstRow[header];
                            const sampleText = sample !== undefined && sample !== "" ? ` (e.g. "${sample.slice(0, 25)}")` : "";
                            return (
                              <option key={header} value={header}>
                                {header}{sampleText}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      <td className="mapping-sample-cell">
                        {currentMapped ? (
                          sampleValue !== undefined && sampleValue !== "" ? (
                            <span className="sample-pill filled" title={sampleValue}>
                              &ldquo;{sampleValue.length > 30 ? sampleValue.slice(0, 30) + "..." : sampleValue}&rdquo;
                            </span>
                          ) : (
                            <span className="sample-pill empty">
                              [Empty in row 1]
                            </span>
                          )
                        ) : field.defaultValue !== undefined ? (
                          <span className="sample-pill default-val">
                            Default: {String(field.defaultValue)}
                          </span>
                        ) : (
                          <span className="sample-pill unmapped">
                            [Unmapped]
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV Live Preview */}
      {file && previewRows.length > 0 && (
        <div className="preview-container">
          <button
            type="button"
            className="preview-toggle-btn"
            onClick={() => setShowPreview(!showPreview)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileSpreadsheet size={16} className="text-blue-600" />
              <span>CSV Data Preview ({previewRows.length} sample rows)</span>
            </div>
            {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showPreview && (
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {previewHeaders.map((h, i) => {
                      const mappedField = tableConfig.fields.find(
                        (f) => columnMapping[f.key] === h,
                      );
                      return (
                        <th key={i}>
                          <div className="preview-th-header">
                            <span className="preview-col-name">{h}</span>
                            {mappedField ? (
                              <span className="preview-mapped-badge badge-matched">
                                &rarr; {mappedField.key}
                              </span>
                            ) : (
                              <span className="preview-mapped-badge badge-unmapped">
                                Unmapped
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {previewHeaders.map((h, cIdx) => (
                        <td key={cIdx}>{row[h] || "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submit Action */}
      <div className="upload-action-row" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label className="dry-run-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "#334155", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            name="dryRun"
            value="true"
            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#2563eb" }}
          />
          <span><strong>Dry-Run Mode</strong> (Simulate & validate CSV rows without writing changes to the database)</span>
        </label>

        <button
          type="submit"
          className="upload-submit-btn"
          disabled={isPending || !file || !isFormValid}
        >
          {isPending ? (
            <>
              <Loader className="animate-spin" size={18} />
              Processing records for {currentPreset.label}...
            </>
          ) : (
            <>
              <Upload size={18} />
              Import CSV into {currentPreset.label}
            </>
          )}
        </button>

        {file && !isFormValid && missingRequiredFields.length > 0 && (
          <p className="submit-hint-error" style={{ margin: 0, fontSize: "0.85rem", color: "#e11d48", textAlign: "right" }}>
            Please map required field(s): <strong>{missingRequiredFields.map((f) => f.aliases?.[0] || f.key).join(", ")}</strong> to enable import.
          </p>
        )}
      </div>

      {/* Status Feedback Results */}
      {state.status !== "idle" && (
        <div className={`upload-status-card status-${state.status}`}>
          <div className="status-card-header" style={{ justifyContent: "space-between", alignItems: "flex-start", display: "flex", width: "100%" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              {state.status === "success" && (
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              )}
              {state.status === "partial" && (
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
              )}
              {state.status === "error" && (
                <AlertCircle size={20} className="text-rose-600 shrink-0" />
              )}
              <div className="status-header-text">
                <span className="status-title-badge">
                  {state.status === "success"
                    ? "Import Completed Successfully"
                    : state.status === "partial"
                    ? "Partial Import Completed"
                    : "Import Failed"}
                </span>
                <p className="status-msg">{state.message}</p>
              </div>
            </div>

            <button
              type="button"
              className="download-report-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.75rem",
                fontSize: "0.85rem",
                fontWeight: 500,
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginLeft: "1rem",
              }}
              onClick={() => {
                const csvContent = generateReportCsv(state, currentPreset.label);
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `import_report_${selectedTable}_${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileSpreadsheet size={16} />
              Download Report (.csv)
            </button>
          </div>

          {state.errors && state.errors.length > 0 && (
            <div className="status-errors-box">
              <span className="errors-title">Error Details ({state.errors.length}):</span>
              <ul className="errors-list">
                {state.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

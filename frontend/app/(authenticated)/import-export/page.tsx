"use client";

import { useState, useRef, useActionState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Download,
  Copy,
  Check,
  Building2,
  Building,
  ClipboardList,
  Calendar,
  Users,
  ShieldAlert,
  ArrowRight,
  Database,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { request } from "@/lib/api";
import { uploadFileAction } from "@/helper/upload";
import {
  TABLE_CONFIGS,
  type UploadState,
  suggestColumnMapping,
  generateReportCsv,
} from "@/helper/upload-core";
import { getPermissions, type Role } from "@/lib/permissions";
import "./import-export.css";

interface UploadPreset {
  value: string;
  label: string;
  Icon: LucideIcon;
  description: string;
  headers: string[];
  sampleRow: Record<string, string>;
}

const PRESETS: UploadPreset[] = [
  {
    value: "partners",
    label: "Industry Partners",
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
    sampleRow: {
      "Project_id": "PRJ-101",
      "Registration ID": "REG-2026-001",
      "Organisation Name": "Acme Innovations Pty Ltd",
      "Address": "123 Queen Street, Brisbane QLD 4000",
      "ABN": "11223344556",
      "Industy Partner Contact Name(s)": "Jane Doe",
      "Position Title": "Head of Engineering",
      "Email": "jane.doe@acme.com.au",
      "Phone": "+61 7 3000 0000",
    },
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
    sampleRow: {
      "Project Title": "Autonomous Solar Microgrid Controller",
      "Project Description": "Capstone research into low-latency frequency response for microgrids.",
      "Project Partner Agreement": "Signed",
      "Student Project Agreement - IP Licence/Assignment": "Standard QUT Assignment",
    },
  },
  {
    value: "organisation",
    label: "Organisations",
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
    sampleRow: {
      "Organisation Name": "Global Robotics Labs",
      "Address": "45 Innovation Way, Brisbane QLD 4006",
      "ABN": "99887766554",
      "Industry Supervisor's Name": "Dr. Alan Turing",
      "Industry Supervisor's Position Title": "Research Lead",
      "Business Phone": "+61 7 3888 1234",
      "Business Email": "alan@globalrobotics.io",
      "Organisation Information": "Robotics and automation R&D provider.",
    },
  },
  {
    value: "events",
    label: "Events & RSVPs",
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
    sampleRow: {
      "Organisation": "Acme Innovations",
      "First Name": "Jane",
      "Best contact person to liaise with on this event": "Jane Doe",
      "Position Title": "Head of Engineering",
      "Email": "jane.doe@acme.com.au",
      "List": "Industry Advisory Board 2026",
      "Source": "Direct Referral",
      "Events Invited to": "Industry Showcase Semester 1",
      "Response": "Attending",
    },
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
    sampleRow: {
      "Proposed Title": "AI Vision Quality Inspection",
      "Proposed Description": "Computer vision model for defect detection in assembly lines.",
      "Proposed Project Type": "Capstone",
      "Proposed Semester": "Semester 1",
      "Proposed Year": "2026",
    },
  },
  {
    value: "users",
    label: "Users & Staff",
    Icon: Users,
    description: "Import workforce staff accounts, roles, and permissions.",
    headers: ["Email", "Full Name", "Role", "Password"],
    sampleRow: {
      "Email": "supervisor@qut.edu.au",
      "Full Name": "Prof. Margaret Hamilton",
      "Role": "Supervisor",
      "Password": "InitialTempPassword123!",
    },
  },
];

interface ExportItem {
  id: string;
  label: string;
  endpoint: string;
  Icon: LucideIcon;
  description: string;
}

const EXPORT_ITEMS: ExportItem[] = [
  {
    id: "organisations",
    label: "Industry Partners",
    endpoint: "/organisations",
    Icon: Building2,
    description: "Complete directory of partner organisations, ABNs, and contacts.",
  },
  {
    id: "projects",
    label: "Projects",
    endpoint: "/projects",
    Icon: ClipboardList,
    description: "All capstone, research, and semester project records.",
  },
  {
    id: "events",
    label: "Events & RSVPs",
    endpoint: "/events",
    Icon: Calendar,
    description: "All industry events, attendance records, and invitations.",
  },
  {
    id: "applications",
    label: "Project Proposals",
    endpoint: "/projectapplications",
    Icon: FileText,
    description: "Proposed partner project submissions and approval statuses.",
  },
  {
    id: "users",
    label: "Users & Staff",
    endpoint: "/users",
    Icon: Users,
    description: "System user registry, active statuses, and assigned roles.",
  },
  {
    id: "auditlog",
    label: "Audit Logs",
    endpoint: "/auditlog?pageSize=1000",
    Icon: Database,
    description: "Latest 1,000 security and database mutation audit events.",
  },
];

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export default function ImportExportPage() {
  const { user } = useAuth();
  const [selectedPresetValue, setSelectedPresetValue] = useState("partners");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState(uploadFileAction, {
    status: "idle",
    message: "",
  } as UploadState);

  const [, startTransition] = useTransition();

  if (!user) return null;

  const perms = getPermissions(user.role as Role);
  const canUpload = perms.upload !== "no";

  if (!canUpload) {
    return (
      <div className="import-export-page">
        <div className="container">
          <div className="import-export-denied">
            <ShieldAlert size={22} />
            <div>
              <h3>Access Restricted</h3>
              <p>
                Importing and exporting bulk data is restricted to Course Organisers and
                Administrators.
              </p>
              <Link href="/dashboard">Back to dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPreset =
    PRESETS.find((p) => p.value === selectedPresetValue) || PRESETS[0];
  const tableConfig =
    TABLE_CONFIGS[selectedPresetValue] || TABLE_CONFIGS.partners;

  const handlePresetSelect = (presetValue: string) => {
    if (presetValue === selectedPresetValue) return;
    setSelectedPresetValue(presetValue);
    setValidationError(null);

    const newConfig = TABLE_CONFIGS[presetValue];
    if (previewHeaders.length > 0 && newConfig) {
      const newMapping = suggestColumnMapping(previewHeaders, newConfig.fields);
      setColumnMapping(newMapping);
    } else {
      setColumnMapping({});
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setValidationError("Please select a valid .csv file.");
      return;
    }

    setFile(selectedFile);
    setValidationError(null);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setPreviewHeaders(results.meta.fields);
          setPreviewRows(results.data);

          const autoMapping = suggestColumnMapping(
            results.meta.fields,
            tableConfig.fields,
          );
          setColumnMapping(autoMapping);
        } else {
          setValidationError("Could not parse headers from the uploaded CSV.");
        }
      },
      error: (err) => {
        setValidationError(`CSV parsing failed: ${err.message}`);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setColumnMapping({});
    setValidationError(null);
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyHeadersToClipboard = () => {
    navigator.clipboard.writeText(currentPreset.headers.join(", "));
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 2000);
  };

  const downloadSampleTemplate = () => {
    const csvContent = Papa.unparse({
      fields: currentPreset.headers,
      data: [currentPreset.sampleRow],
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${currentPreset.value}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = () => {
    if (!state.errors || state.errors.length === 0) return;
    const csvData = generateReportCsv(state, currentPreset.label);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_report_${selectedPresetValue}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportData = async (item: ExportItem) => {
    setExportingId(item.id);
    try {
      const response = await request<any>(item.endpoint);
      if (!response) return;

      let records: Record<string, unknown>[] = [];
      if (Array.isArray(response)) {
        records = response;
      } else if (response && Array.isArray(response.items)) {
        records = response.items;
      } else if (response && Array.isArray(response.data)) {
        records = response.data;
      }

      if (records.length === 0) {
        alert(`No records found to export for ${item.label}.`);
        return;
      }

      const headers = Object.keys(records[0]);
      const csvLines = [
        headers.join(","),
        ...records.map((r) =>
          headers.map((h) => csvEscape(r[h])).join(","),
        ),
      ];

      const blob = new Blob([csvLines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.id}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(`Could not export ${item.label}. Please try again.`);
    } finally {
      setExportingId(null);
    }
  };

  const missingRequiredFields = tableConfig.fields.filter(
    (field) => field.required && !columnMapping[field.key],
  );
  const mappedFieldsCount = Object.values(columnMapping).filter(Boolean).length;

  return (
    <div className="import-export-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-main">
            <div className="category-label">PARTNERFORGE // DATA MANAGEMENT</div>
            <div className="page-header-title-row">
              <h1 className="page-heading">Import & Export Center</h1>
              <span className="section-badge">CSV Batch Engine</span>
            </div>
            <p className="page-subtitle">
              Ingest bulk partner organisations, projects, events, and records with
              custom column mapping, or export verified CSV snapshots.
            </p>
          </div>
          <div className="page-header-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={downloadSampleTemplate}
              title="Download empty CSV template for current category"
            >
              <Download size={13} />
              <span>Download Template</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="preset-tabs-bar">
          {PRESETS.map((preset) => {
            const PresetIcon = preset.Icon;
            const isSelected = preset.value === selectedPresetValue;
            return (
              <button
                key={preset.value}
                type="button"
                className={`preset-tab-btn ${isSelected ? "preset-tab-active" : ""}`}
                onClick={() => handlePresetSelect(preset.value)}
              >
                <PresetIcon size={15} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Importer Card */}
        <div className="import-card">
          <div className="import-card-header">
            <div className="import-card-title-group">
              <div className="preset-icon-badge">
                <currentPreset.Icon size={18} />
              </div>
              <div>
                <h2 className="import-card-title">
                  Import into {currentPreset.label}
                </h2>
                <p className="import-card-desc">{currentPreset.description}</p>
              </div>
            </div>
            <div className="import-card-actions">
              <button
                type="button"
                className="subtle-action-btn"
                onClick={copyHeadersToClipboard}
                title="Copy expected column headers"
              >
                {copiedHeaders ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedHeaders ? "Copied!" : "Copy Headers"}</span>
              </button>
              <button
                type="button"
                className="subtle-action-btn"
                onClick={downloadSampleTemplate}
                title="Download CSV template"
              >
                <Download size={13} />
                <span>Template CSV</span>
              </button>
            </div>
          </div>

          {/* Expected Headers Strip */}
          <div className="expected-headers-wrap">
            <span className="expected-headers-label">Expected Headers:</span>
            <div className="header-chips-list">
              {currentPreset.headers.map((h) => (
                <span key={h} className="header-chip">
                  {h}
                </span>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              if (missingRequiredFields.length > 0) {
                e.preventDefault();
                setValidationError(
                  `Please map required field(s): ${missingRequiredFields
                    .map((f) => f.aliases?.[0] || f.key)
                    .join(", ")} before importing.`,
                );
              }
            }}
            action={(formData) => {
              formData.set("table", selectedPresetValue);
              formData.set("columnMapping", JSON.stringify(columnMapping));
              startTransition(() => {
                formAction(formData);
              });
            }}
            className="import-form"
          >
            <input type="hidden" name="table" value={selectedPresetValue} />
            <input
              type="hidden"
              name="columnMapping"
              value={JSON.stringify(columnMapping)}
            />

            {/* Drag & Drop File Zone */}
            <div
              className={`dropzone-container ${
                isDragging ? "dropzone-dragging" : ""
              } ${file ? "dropzone-has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (!file) fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden-file-input"
              />

              {!file ? (
                <div className="dropzone-empty-state">
                  <div className="dropzone-icon-circle">
                    <UploadCloud size={24} />
                  </div>
                  <h3 className="dropzone-prompt">
                    Click to browse or drag and drop your CSV file here
                  </h3>
                  <p className="dropzone-hint">
                    UTF-8 encoded .csv files up to 10 MB supported.
                  </p>
                </div>
              ) : (
                <div className="dropzone-file-details">
                  <div className="file-info-block">
                    <div className="file-icon-badge">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <div className="file-name-row">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="file-meta-row">
                        {previewRows.length > 0 && (
                          <span className="file-rows-badge">
                            Previewing {previewRows.length} sample rows
                          </span>
                        )}
                        <span className="file-mapped-badge">
                          {mappedFieldsCount} fields mapped
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="file-actions-block">
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSelectedFile();
                      }}
                    >
                      <X size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Validation Message */}
            {validationError && (
              <div className="validation-error-banner">
                <AlertCircle size={15} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Column Mapping Section */}
            {file && previewHeaders.length > 0 && (
              <div className="mapping-section">
                <div className="mapping-section-header">
                  <div className="mapping-title-row">
                    <SlidersHorizontal size={15} />
                    <h3 className="mapping-title">Column Mapping</h3>
                  </div>
                  <span className="mapping-subtitle">
                    Match fields from <strong>{file.name}</strong> to the platform database schema.
                  </span>
                </div>

                <div className="mapping-grid">
                  {tableConfig.fields.map((field) => {
                    const isMapped = !!columnMapping[field.key];
                    const isRequired = !!field.required;
                    return (
                      <div
                        key={field.key}
                        className={`mapping-row ${
                          isRequired && !isMapped ? "mapping-row-missing" : ""
                        }`}
                      >
                        <div className="mapping-field-info">
                          <span className="mapping-field-name">
                            {field.aliases?.[0] || field.key}
                          </span>
                          <div className="mapping-field-badges">
                            <span className="field-type-badge">{field.type}</span>
                            {isRequired && (
                              <span className="field-required-badge">
                                Required
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mapping-select-wrap">
                          <select
                            value={columnMapping[field.key] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setColumnMapping((prev) => ({
                                ...prev,
                                [field.key]: val,
                              }));
                              setValidationError(null);
                            }}
                            className="mapping-select"
                          >
                            <option value="">-- Do not import --</option>
                            {previewHeaders.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Collapsible Preview */}
                <div className="preview-toggle-bar">
                  <button
                    type="button"
                    className="preview-toggle-btn"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <span>
                      {showPreview ? "Hide" : "Show"} Parsed Data Preview (first 5 rows)
                    </span>
                  </button>
                </div>

                {showPreview && previewRows.length > 0 && (
                  <div className="preview-table-container">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          {previewHeaders.map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, idx) => (
                          <tr key={idx}>
                            {previewHeaders.map((h) => (
                              <td key={h}>{row[h] || "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Submission Footer */}
            {file && (
              <div className="form-submit-footer">
                <div className="submit-feedback">
                  {missingRequiredFields.length > 0 ? (
                    <span className="missing-warning">
                      Please map required field(s):{" "}
                      <strong>
                        {missingRequiredFields
                          .map((f) => f.aliases?.[0] || f.key)
                          .join(", ")}
                      </strong>{" "}
                      to proceed.
                    </span>
                  ) : (
                    <span className="ready-indicator">
                      <CheckCircle2 size={14} />
                      Ready to import ({mappedFieldsCount} fields mapped)
                    </span>
                  )}
                </div>

                <div className="submit-actions">
                  <label className="dry-run-toggle">
                    <input
                      type="checkbox"
                      name="dryRun"
                      value="true"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                    />
                    <span>
                      <strong>Dry run</strong> — validate rows without writing to the database
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isPending || missingRequiredFields.length > 0}
                    className="primary-btn submit-import-btn"
                  >
                    {isPending ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>{dryRun ? "Validating rows…" : "Ingesting records…"}</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight size={14} />
                        <span>
                          {dryRun
                            ? `Validate for ${currentPreset.label}`
                            : `Import into ${currentPreset.label}`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Results & Error Reporting */}
          {state.status !== "idle" && state.message && (
            <div
              className={`result-alert-box ${
                state.status === "success"
                  ? "result-success"
                  : state.status === "partial"
                  ? "result-partial"
                  : "result-error"
              }`}
            >
              <div className="result-alert-header">
                {state.status === "success" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <div className="result-alert-title">
                  {state.dryRun
                    ? state.status === "success"
                      ? "Dry Run Passed: All Rows Valid"
                      : state.status === "partial"
                      ? "Dry Run: Some Rows Invalid"
                      : "Dry Run: No Valid Rows"
                    : state.status === "success"
                    ? "Import Completed Successfully"
                    : state.status === "partial"
                    ? "Partial Import Completed"
                    : "Import Failed"}
                </div>
              </div>
              <p className="result-alert-message">{state.message}</p>

              {(state.total !== undefined || state.succeeded !== undefined) && (
                <div className="result-stats-strip">
                  {state.total !== undefined && (
                    <div className="stat-pill stat-total">
                      Total Rows: <strong>{state.total}</strong>
                    </div>
                  )}
                  {state.succeeded !== undefined && (
                    <div className="stat-pill stat-inserted">
                      {state.dryRun ? "Valid" : "Succeeded"}: <strong>{state.succeeded}</strong>
                    </div>
                  )}
                  {state.failed !== undefined && state.failed > 0 && (
                    <div className="stat-pill stat-errors">
                      Failed: <strong>{state.failed}</strong>
                    </div>
                  )}
                </div>
              )}

              {state.errors && state.errors.length > 0 && (
                <div className="errors-breakdown-wrap">
                  <div className="errors-breakdown-header">
                    <h4>Failed Rows ({state.errors.length})</h4>
                    <button
                      type="button"
                      className="download-report-btn"
                      onClick={downloadErrorReport}
                    >
                      <Download size={13} />
                      <span>Download Failure CSV</span>
                    </button>
                  </div>
                  <ul className="errors-list">
                    {state.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="error-item">
                        {err}
                      </li>
                    ))}
                  </ul>
                  {state.errors.length > 10 && (
                    <p className="errors-more-hint">
                      Showing first 10 errors. Download the failure CSV report to
                      review all {state.errors.length} failed rows.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Database Export Center */}
        <div className="export-section">
          <div className="section-header-block">
            <div className="category-label">DATABASE ARCHIVE</div>
            <h2 className="section-title">One-Click Database Exports</h2>
            <p className="section-subtitle">
              Export live entity collections and audit snapshots to standard CSV files.
            </p>
          </div>

          <div className="export-grid">
            {EXPORT_ITEMS.map((item) => {
              const ItemIcon = item.Icon;
              const isExporting = exportingId === item.id;
              return (
                <div key={item.id} className="export-card">
                  <div className="export-card-top">
                    <div className="export-icon-wrap">
                      <ItemIcon size={18} />
                    </div>
                    <div>
                      <h4 className="export-item-title">{item.label}</h4>
                      <p className="export-item-desc">{item.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn export-action-btn"
                    onClick={() => handleExportData(item)}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <RefreshCw size={13} className="spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>{isExporting ? "Exporting…" : "Export CSV"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

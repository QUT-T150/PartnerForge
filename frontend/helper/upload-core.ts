import Papa from "papaparse";

export type FieldType = "string" | "int" | "bool" | "date" | "guid";

export interface FieldSpec {
  key: string;
  type: FieldType;
  required?: boolean;
  aliases?: string[];
  defaultValue?: unknown;
}

export interface TableConfig {
  label: string;
  endpoint: string;
  batchEndpoint?: string;
  fields: FieldSpec[];
}

export const TABLE_CONFIGS: Record<string, TableConfig> = {
  partners: {
    label: "Industry Partners",
    endpoint: "/api/Organisations",
    batchEndpoint: "/api/Organisations/batch",
    fields: [
      { key: "Name", type: "string", required: true, aliases: ["organisation name", "organization name", "company name", "name"] },
      { key: "RegistrationId", type: "string", aliases: ["registration id", "registration_id", "reg id"] },
      { key: "Abn", type: "string", aliases: ["abn", "australian business number"] },
      { key: "AddressLine1", type: "string", aliases: ["address", "address line 1", "street address", "location"] },
      { key: "PrimaryContactName", type: "string", aliases: ["industy partner contact name(s)", "industry partner contact name(s)", "contact name", "primary contact name", "contact"] },
      { key: "PrimaryContactPosition", type: "string", aliases: ["position title", "contact position", "title", "job title"] },
      { key: "Email", type: "string", aliases: ["email", "primary contact email", "contact email"] },
      { key: "Phone", type: "string", aliases: ["phone", "primary contact phone", "contact phone", "mobile", "telephone"] },
      { key: "Notes", type: "string", aliases: ["project_id", "project id", "notes", "comments"] },
      { key: "PartnershipStatus", type: "string", required: false, defaultValue: "active" },
    ],
  },
  projects: {
    label: "Projects",
    endpoint: "/api/Projects",
    batchEndpoint: "/api/Projects/batch",
    fields: [
      { key: "Title", type: "string", required: true, aliases: ["project title", "title", "name"] },
      { key: "Description", type: "string", aliases: ["project description", "description", "summary", "overview"] },
      { key: "ProjectPartnerAgreement", type: "string", aliases: ["project partner agreement", "partner agreement", "ppa"] },
      { key: "StudentProjectAgreement", type: "string", aliases: ["student project agreement - ip licence/assignment", "student project agreement", "spa", "ip assignment"] },
      { key: "ProjectType", type: "string", required: false, defaultValue: "Capstone" },
      { key: "Semester", type: "string", required: false, defaultValue: "Semester 1" },
      { key: "Year", type: "int", required: false, defaultValue: 2026 },
      { key: "Status", type: "string", required: false, defaultValue: "ongoing" },
    ],
  },
  organisation: {
    label: "Organisation",
    endpoint: "/api/Organisations",
    batchEndpoint: "/api/Organisations/batch",
    fields: [
      { key: "Name", type: "string", required: true, aliases: ["organisation name", "organization name", "company name", "name"] },
      { key: "AddressLine1", type: "string", aliases: ["address", "street address", "location", "office address"] },
      { key: "Abn", type: "string", aliases: ["abn", "australian business number"] },
      { key: "PrimaryContactName", type: "string", aliases: ["industry supervisor's name", "industry supervisor name", "supervisor name", "contact name"] },
      { key: "PrimaryContactPosition", type: "string", aliases: ["industry supervisor's position title", "supervisor position title", "position title", "job title"] },
      { key: "Phone", type: "string", aliases: ["business phone", "phone", "office phone", "telephone"] },
      { key: "Email", type: "string", aliases: ["business email", "email", "office email", "contact email"] },
      { key: "OrganisationInformation", type: "string", aliases: ["organisation information", "organization information", "company info", "about"] },
      { key: "PartnershipStatus", type: "string", required: false, defaultValue: "prospect" },
    ],
  },
  events: {
    label: "Events",
    endpoint: "/api/Events/attendances",
    fields: [
      { key: "OrganisationName", type: "string", aliases: ["organisation", "organization", "company", "org name"] },
      { key: "FirstName", type: "string", aliases: ["first name", "given name", "first_name"] },
      { key: "BestContactName", type: "string", aliases: ["best contact person to liaise with on this event", "best contact person", "liaison contact", "contact person"] },
      { key: "PositionTitle", type: "string", aliases: ["position title", "job title", "role", "title"] },
      { key: "Email", type: "string", aliases: ["email", "contact email", "e-mail"] },
      { key: "ListName", type: "string", aliases: ["list", "list name", "mailing list"] },
      { key: "Source", type: "string", aliases: ["source", "lead source", "referral"] },
      { key: "EventsInvitedTo", type: "string", aliases: ["events invited to", "invited events", "event name", "event"] },
      { key: "Response", type: "string", aliases: ["response", "rsvp status", "status", "attendance response"] },
    ],
  },
  applications: {
    label: "Project Applications",
    endpoint: "/api/ProjectApplications",
    fields: [
      { key: "ProposedTitle", type: "string", required: true, aliases: ["proposed title", "title", "project title"] },
      { key: "ProposedDescription", type: "string", aliases: ["proposed description", "description"] },
      { key: "ProposedProjectType", type: "string", aliases: ["proposed project type", "project type"] },
      { key: "ProposedSemester", type: "string", aliases: ["proposed semester", "semester"] },
      { key: "ProposedYear", type: "int", aliases: ["proposed year", "year"] },
      { key: "StudentProjectAgreement", type: "string", aliases: ["student project agreement", "spa"] },
      { key: "IpAssignmentRationale", type: "string", aliases: ["ip assignment rationale", "ip rationale"] },
    ],
  },
  users: {
    label: "Users",
    endpoint: "/api/Users",
    fields: [
      { key: "Email", type: "string", required: true, aliases: ["email", "user email"] },
      { key: "Password", type: "string", aliases: ["password"] },
      { key: "FullName", type: "string", required: true, aliases: ["full name", "name", "display name"] },
      { key: "Role", type: "string", required: true, aliases: ["role", "user role"] },
      { key: "IsActive", type: "bool", aliases: ["is active", "active"] },
    ],
  },
};

export interface UploadState {
  status: "idle" | "success" | "partial" | "error";
  message: string;
  total?: number;
  succeeded?: number;
  failed?: number;
  errors?: string[];
  dryRun?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateCsvForTable(
  headers: string[],
  tableKey: string,
): ValidationResult {
  const config = TABLE_CONFIGS[tableKey];
  if (!config) {
    return { valid: false, message: `Unknown target category "${tableKey}".` };
  }

  if (!headers || headers.length === 0) {
    return { valid: false, message: "The CSV file contains no header columns." };
  }

  const normHeaders = headers.map((h) => normalizeKey(h));

  const evaluateTable = (key: string) => {
    const cfg = TABLE_CONFIGS[key];
    if (!cfg) return { key, label: key, score: 0, missingRequired: [], matchedFieldsCount: 0 };

    let matchedFieldsCount = 0;
    const missingRequired: string[] = [];

    for (const field of cfg.fields) {
      const fieldNormKey = normalizeKey(field.key);
      const isMatched = normHeaders.some((hNorm) => {
        if (hNorm === fieldNormKey) return true;
        if (field.aliases) {
          return field.aliases.some((alias) => normalizeKey(alias) === hNorm);
        }
        return false;
      });

      if (isMatched) {
        matchedFieldsCount++;
      } else if (field.required) {
        const displayHeader = field.aliases?.[0] || field.key;
        missingRequired.push(displayHeader);
      }
    }

    return { key, label: cfg.label, score: matchedFieldsCount, missingRequired, matchedFieldsCount };
  };

  const currentEval = evaluateTable(tableKey);

  let bestOther: { key: string; label: string; score: number; missingRequired: string[] } | null = null;
  for (const otherKey of Object.keys(TABLE_CONFIGS)) {
    if (otherKey === tableKey) continue;
    const otherEval = evaluateTable(otherKey);
    if (!bestOther || otherEval.score > bestOther.score) {
      bestOther = otherEval;
    }
  }

  if (currentEval.missingRequired.length > 0) {
    const missingList = currentEval.missingRequired.map((m) => `"${m}"`).join(", ");
    let hint = "";
    if (bestOther && bestOther.missingRequired.length === 0 && bestOther.score > 0) {
      hint = ` (This file appears to be formatted for '${bestOther.label}'.)`;
    }
    return {
      valid: false,
      message: `Selected CSV does not match target category '${config.label}'. Missing required column(s): ${missingList}.${hint}`,
    };
  }

  if (currentEval.matchedFieldsCount === 0) {
    let hint = "";
    if (bestOther && bestOther.score > 0) {
      hint = ` (This file appears to be formatted for '${bestOther.label}'.)`;
    }
    return {
      valid: false,
      message: `Selected CSV does not contain valid headers for target category '${config.label}'.${hint}`,
    };
  }

  if (
    bestOther &&
    bestOther.missingRequired.length === 0 &&
    bestOther.score >= currentEval.score + 2 &&
    bestOther.score > headers.length * 0.4
  ) {
    return {
      valid: false,
      message: `Selected CSV does not match target category '${config.label}'. It appears to be formatted for '${bestOther.label}'.`,
    };
  }

  return { valid: true };
}


export function coerce(raw: string | undefined, type: FieldType, defaultValue?: unknown): unknown {
  const value = raw?.trim();
  if (!value) return defaultValue;

  switch (type) {
    case "int": {
      const n = Number(value);
      return Number.isFinite(n) ? n : defaultValue;
    }
    case "bool":
      return ["true", "1", "yes", "y"].includes(value.toLowerCase());
    case "guid":
    case "date":
    case "string":
    default:
      return value;
  }
}

const normalizeCache = new Map<string, string>();

export function normalizeKey(str: string): string {
  const cached = normalizeCache.get(str);
  if (cached !== undefined) return cached;

  const normalized = str.trim().toLowerCase().replace(/[\s\-_']+/g, " ");
  if (normalizeCache.size < 2000) {
    normalizeCache.set(str, normalized);
  }
  return normalized;
}

export function buildRow(
  row: Record<string, string>,
  fields: FieldSpec[],
): { body: Record<string, unknown>; error?: string } {
  const normalizedRow: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeKey(key)] = value;
  }

  const body: Record<string, unknown> = {};
  for (const field of fields) {
    let raw: string | undefined = undefined;

    // Check direct key
    const directNormalizedKey = normalizeKey(field.key);
    if (normalizedRow[directNormalizedKey] !== undefined) {
      raw = normalizedRow[directNormalizedKey];
    } else if (field.aliases) {
      // Check aliases
      for (const alias of field.aliases) {
        const normAlias = normalizeKey(alias);
        if (normalizedRow[normAlias] !== undefined) {
          raw = normalizedRow[normAlias];
          break;
        }
      }
    }

    const value = coerce(raw, field.type, field.defaultValue);

    if (field.required && (value === undefined || value === "")) {
      return { body, error: `Missing required field "${field.key}"` };
    }

    if (value !== undefined) {
      body[field.key] = value;
    }
  }

  return { body };
}

export function generateSampleCsv(tableKey: string): string {
  const config = TABLE_CONFIGS[tableKey];
  if (!config) return "";

  const headers = config.fields.map((f) => f.aliases?.[0] || f.key);
  const sampleValues = config.fields.map((f) => {
    if (f.key === "Name" || f.key === "OrganisationName") return "TechCorp Australia";
    if (f.key === "Title" || f.key === "ProposedTitle") return "Autonomous Swarm Drone Navigation";
    if (f.key === "Description" || f.key === "ProposedDescription") return "Edge-computing flight path optimization";
    if (f.key === "Email" || f.key === "Business Email") return "contact@techcorp.com.au";
    if (f.key === "Phone" || f.key === "Business Phone") return "0731234567";
    if (f.key === "PrimaryContactName" || f.key === "BestContactName") return "Sarah Jenkins";
    if (f.key === "PrimaryContactPosition" || f.key === "PositionTitle") return "VP of Technology";
    if (f.key === "AddressLine1" || f.key === "Address") return "123 Innovation Way, Brisbane QLD 4000";
    if (f.key === "Abn") return "12345678901";
    if (f.key === "RegistrationId") return "REG-2026-001";
    if (f.key === "ProjectPartnerAgreement") return "Signed PPA 2026";
    if (f.key === "StudentProjectAgreement") return "Full IP Assignment";
    if (f.key === "ListName") return "Research Symposium 2026";
    if (f.key === "Source") return "Alumni Network";
    if (f.key === "EventsInvitedTo") return "QUT IT Showcase 2026";
    if (f.key === "Response") return "Attending";
    if (f.type === "int") return "2026";
    if (f.type === "bool") return "true";
    return "Sample Data";
  });

  return [headers.join(","), sampleValues.map((v) => `"${v}"`).join(",")].join("\n");
}

export function generateReportCsv(state: UploadState, tableLabel: string): string {
  const lines = [
    `"Import Report - ${tableLabel}","Generated: ${new Date().toISOString()}"`,
    `"Status","${state.status.toUpperCase()}"`,
    `"Total Rows","${state.total || 0}"`,
    `"Succeeded","${state.succeeded || 0}"`,
    `"Failed","${state.failed || 0}"`,
    `"Dry Run","${state.dryRun ? "YES (Simulation Only)" : "NO"}"`,
    "",
    `"Log Type","Details"`,
  ];

  if (state.errors && state.errors.length > 0) {
    for (const err of state.errors) {
      lines.push(`"ERROR","${err.replace(/"/g, '""')}"`);
    }
  } else {
    lines.push(`"SUCCESS","All ${state.succeeded || 0} rows imported successfully without errors."`);
  }

  return lines.join("\n");
}

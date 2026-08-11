"use server";

import { cookies } from "next/headers";
import Papa from "papaparse";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const COOKIE_NAME = "auth-token";

type FieldType = "string" | "int" | "bool" | "date" | "guid";

interface FieldSpec {
  key: string;
  type: FieldType;
  required?: boolean;
  aliases?: string[];
  defaultValue?: unknown;
}

interface TableConfig {
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

export async function uploadFileAction(
  _prevState: UploadState | null,
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file");
  const table = formData.get("table");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Please choose a file to upload." };
  }

  if (typeof table !== "string" || !TABLE_CONFIGS[table]) {
    return { status: "error", message: "Please choose which table to populate." };
  }

  const config = TABLE_CONFIGS[table];
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return {
      status: "error",
      message: `Could not parse CSV: ${parsed.errors[0].message}`,
    };
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return { status: "error", message: "The file has no data rows." };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return { status: "error", message: "You are not authenticated." };
  }

  let succeeded = 0;
  const errors: string[] = [];
  const validBodies: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // account for header row + 1-indexing
    const { body, error } = buildRow(rows[i], config.fields);
    if (error) {
      errors.push(`Row ${rowNumber}: ${error}`);
      continue;
    }
    validBodies.push(body);
  }

  if (validBodies.length > 0) {
    if (config.batchEndpoint) {
      try {
        const res = await fetch(new URL(config.batchEndpoint, BACKEND_URL), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(validBodies),
        });

        if (res.ok) {
          succeeded = validBodies.length;
        } else {
          const detail = await res.text();
          errors.push(`Batch import error: ${res.status} ${detail || res.statusText}`);
        }
      } catch {
        errors.push("Could not reach backend server for batch import.");
      }
    } else {
      // Row-by-row import fallback for endpoints without batch route
      for (let i = 0; i < validBodies.length; i++) {
        const rowNumber = i + 2;
        try {
          const res = await fetch(new URL(config.endpoint, BACKEND_URL), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(validBodies[i]),
          });

          if (res.ok) {
            succeeded++;
          } else {
            const detail = await res.text();
            errors.push(`Row ${rowNumber}: ${res.status} ${detail || res.statusText}`);
          }
        } catch {
          errors.push(`Row ${rowNumber}: could not reach the backend server.`);
        }
      }
    }
  }

  const failed = rows.length - succeeded;
  const status = failed === 0 ? "success" : succeeded === 0 ? "error" : "partial";

  return {
    status,
    message: `Imported ${succeeded} of ${rows.length} rows into ${config.label}.`,
    total: rows.length,
    succeeded,
    failed,
    errors: errors.slice(0, 20),
  };
}

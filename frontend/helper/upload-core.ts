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

export interface ParsedAddress {
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export function parseAddress(raw: string): ParsedAddress {
  const trimmed = raw.trim();
  if (!trimmed) return { addressLine1: "" };

  let working = trimmed;
  let country: string | undefined = undefined;

  // Extract country at the end (e.g. ", Australia", ", New Zealand", ", USA")
  const countryMatch = working.match(/,\s*(Australia|New Zealand|USA|United States|UK|United Kingdom)$/i);
  if (countryMatch) {
    country = countryMatch[1];
    working = working.slice(0, countryMatch.index).trim();
  }

  let postcode: string | undefined = undefined;
  let state: string | undefined = undefined;
  let city: string | undefined = undefined;

  // Match Australian City/Suburb + State + Postcode (e.g. "Brisbane QLD 4000", "Sydney, NSW 2000", "Milton QLD 4064")
  const statePostcodeMatch = working.match(/(?:,\s*|\s+)([A-Za-z\s]+?)[,\s]+(NSW|QLD|VIC|WA|SA|TAS|ACT|NT)\s+(\d{4})\s*$/i);
  if (statePostcodeMatch) {
    city = statePostcodeMatch[1].trim();
    state = statePostcodeMatch[2].toUpperCase();
    postcode = statePostcodeMatch[3];
    working = working.slice(0, statePostcodeMatch.index).trim();
  } else {
    // Match State + Postcode without preceding city (e.g. "NSW 2000" or "QLD 4000")
    const justStatePostcode = working.match(/(?:,\s*|\s+)(NSW|QLD|VIC|WA|SA|TAS|ACT|NT)\s+(\d{4})\s*$/i);
    if (justStatePostcode) {
      state = justStatePostcode[1].toUpperCase();
      postcode = justStatePostcode[2];
      working = working.slice(0, justStatePostcode.index).trim();
    } else {
      // 4-digit postcode at end
      const justPostcode = working.match(/(?:,\s*|\s+)(\d{4})\s*$/);
      if (justPostcode) {
        postcode = justPostcode[1];
        working = working.slice(0, justPostcode.index).trim();
      }
      // State at end
      const justState = working.match(/(?:,\s*|\s+)(NSW|QLD|VIC|WA|SA|TAS|ACT|NT)\s*$/i);
      if (justState) {
        state = justState[1].toUpperCase();
        working = working.slice(0, justState.index).trim();
      }
    }

    // If city is still not found and there are commas, check if trailing segment is the suburb
    if (!city && working.includes(",")) {
      const parts = working.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        if (!/^\d/.test(lastPart) && !/^(suite|level|unit|building|floor)\b/i.test(lastPart)) {
          city = lastPart;
          parts.pop();
          working = parts.join(", ");
        }
      }
    }
  }

  let addressLine1 = working;
  let addressLine2: string | undefined = undefined;

  const remainingParts = working.split(",").map((p) => p.trim()).filter(Boolean);
  if (remainingParts.length >= 2) {
    const isUnitLevel = (s: string) =>
      /^(suite|unit|level|floor|apt|apartment|building|bld|room|lot|shop|tower|block)\b/i.test(s) ||
      /^#\d+/i.test(s);

    const unitParts: string[] = [];
    const streetParts: string[] = [];

    for (const part of remainingParts) {
      if (isUnitLevel(part)) {
        unitParts.push(part);
      } else {
        streetParts.push(part);
      }
    }

    if (streetParts.length > 0 && unitParts.length > 0) {
      addressLine1 = streetParts.join(", ");
      addressLine2 = unitParts.join(", ");
    } else if (remainingParts.length >= 2) {
      if (isUnitLevel(remainingParts[0])) {
        addressLine1 = remainingParts.slice(1).join(", ");
        addressLine2 = remainingParts[0];
      } else {
        addressLine1 = remainingParts[0];
        addressLine2 = remainingParts.slice(1).join(", ");
      }
    }
  }

  return {
    addressLine1: addressLine1 || trimmed,
    addressLine2,
    city,
    state,
    postcode,
    country: country || (state ? "Australia" : undefined),
  };
}

export const TABLE_CONFIGS: Record<string, TableConfig> = {
  partners: {
    label: "Industry Partners",
    endpoint: "/api/Organisations",
    batchEndpoint: "/api/Organisations/batch",
    fields: [
      { key: "Name", type: "string", required: true, aliases: ["organisation name", "organization name", "company name", "name", "partner"] },
      { key: "RegistrationId", type: "string", aliases: ["registration id", "registration_id", "reg id", "partner id", "organisation id", "org id"] },
      { key: "Abn", type: "string", aliases: ["abn", "australian business number"] },
      { key: "AddressLine1", type: "string", aliases: ["address", "address line 1", "street address", "location", "office address"] },
      { key: "AddressLine2", type: "string", aliases: ["address line 2", "unit", "suite", "level", "building"] },
      { key: "City", type: "string", aliases: ["city", "suburb", "town", "locality"] },
      { key: "State", type: "string", aliases: ["state", "province", "region"] },
      { key: "Postcode", type: "string", aliases: ["postcode", "postal code", "zip", "zip code"] },
      { key: "Country", type: "string", aliases: ["country", "nation"], defaultValue: "Australia" },
      { key: "Website", type: "string", aliases: ["website", "url", "web", "company website"] },
      { key: "PrimaryContactName", type: "string", aliases: ["primary contact name", "contact name", "contact", "industry partner contact name(s)", "industy partner contact name(s)", "industry supervisor's name", "supervisor name"] },
      { key: "PrimaryContactPosition", type: "string", aliases: ["position title", "contact position", "title", "job title", "industry supervisor's position title", "supervisor position title"] },
      { key: "PrimaryContactEmail", type: "string", aliases: ["primary contact email", "contact email", "supervisor email"] },
      { key: "PrimaryContactPhone", type: "string", aliases: ["primary contact phone", "contact phone", "supervisor phone", "contact mobile"] },
      { key: "Email", type: "string", aliases: ["business email", "email", "office email", "company email", "organisation email"] },
      { key: "Phone", type: "string", aliases: ["business phone", "phone", "office phone", "company phone", "telephone"] },
      { key: "OrganisationInformation", type: "string", aliases: ["organisation information", "organization information", "company info", "about", "description"] },
      { key: "Notes", type: "string", aliases: ["notes", "comments", "remarks", "notes/comments"] },
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
      { key: "OrganisationName", type: "string", aliases: ["organisation", "organization", "company", "partner", "organisation name"] },
      { key: "FacultyId", type: "int", aliases: ["faculty id", "faculty"] },
      { key: "ProjectPartnerAgreement", type: "string", aliases: ["project partner agreement", "partner agreement", "ppa"] },
      { key: "StudentProjectAgreement", type: "string", aliases: ["student project agreement - ip licence/assignment", "student project agreement", "spa", "ip assignment"] },
      { key: "IpAssignmentRationale", type: "string", aliases: ["ip assignment rationale", "assignment of ip - rationale", "ip rationale"] },
      { key: "DisciplineArea", type: "string", aliases: ["discipline area", "discipline", "primary discipline"] },
      { key: "SecondaryItDiscipline", type: "string", aliases: ["secondary it discipline", "secondary discipline"] },
      { key: "ProjectDeliverables", type: "string", aliases: ["project deliverables", "deliverables"] },
      { key: "ProjectType", type: "string", required: false, defaultValue: "Capstone", aliases: ["project type", "type"] },
      { key: "Semester", type: "string", required: false, defaultValue: "Semester 1", aliases: ["semester", "term"] },
      { key: "Year", type: "int", required: false, defaultValue: 2026, aliases: ["year"] },
      { key: "Status", type: "string", required: false, defaultValue: "ongoing", aliases: ["status", "project status"] },
      { key: "MultipleTeams", type: "bool", aliases: ["multiple teams", "multi team"] },
      { key: "Notes", type: "string", aliases: ["notes", "comments", "remarks"] },
    ],
  },
  organisation: {
    label: "Organisation",
    endpoint: "/api/Organisations",
    batchEndpoint: "/api/Organisations/batch",
    fields: [
      { key: "Name", type: "string", required: true, aliases: ["organisation name", "organization name", "company name", "name", "partner"] },
      { key: "RegistrationId", type: "string", aliases: ["registration id", "registration_id", "reg id", "partner id", "organisation id", "org id"] },
      { key: "Abn", type: "string", aliases: ["abn", "australian business number"] },
      { key: "AddressLine1", type: "string", aliases: ["address", "address line 1", "street address", "location", "office address"] },
      { key: "AddressLine2", type: "string", aliases: ["address line 2", "unit", "suite", "level", "building"] },
      { key: "City", type: "string", aliases: ["city", "suburb", "town", "locality"] },
      { key: "State", type: "string", aliases: ["state", "province", "region"] },
      { key: "Postcode", type: "string", aliases: ["postcode", "postal code", "zip", "zip code"] },
      { key: "Country", type: "string", aliases: ["country", "nation"], defaultValue: "Australia" },
      { key: "Website", type: "string", aliases: ["website", "url", "web", "company website"] },
      { key: "PrimaryContactName", type: "string", aliases: ["primary contact name", "contact name", "contact", "industry supervisor's name", "industry supervisor name", "supervisor name"] },
      { key: "PrimaryContactPosition", type: "string", aliases: ["position title", "contact position", "job title", "title", "industry supervisor's position title", "supervisor position title"] },
      { key: "PrimaryContactEmail", type: "string", aliases: ["primary contact email", "contact email", "supervisor email"] },
      { key: "PrimaryContactPhone", type: "string", aliases: ["primary contact phone", "contact phone", "supervisor phone", "contact mobile"] },
      { key: "Phone", type: "string", aliases: ["business phone", "phone", "office phone", "company phone", "telephone"] },
      { key: "Email", type: "string", aliases: ["business email", "email", "office email", "company email", "organisation email"] },
      { key: "OrganisationInformation", type: "string", aliases: ["organisation information", "organization information", "company info", "about", "description"] },
      { key: "Notes", type: "string", aliases: ["notes", "comments", "remarks", "notes/comments"] },
      { key: "PartnershipStatus", type: "string", required: false, defaultValue: "prospect" },
    ],
  },
  events: {
    label: "Events",
    endpoint: "/api/Events/attendances",
    fields: [
      { key: "Name", type: "string", aliases: ["event name", "name", "title", "events invited to"] },
      { key: "Description", type: "string", aliases: ["event description", "description"] },
      { key: "EventType", type: "string", aliases: ["event type", "type"] },
      { key: "EventDate", type: "string", aliases: ["event date", "date"] },
      { key: "Location", type: "string", aliases: ["location", "venue", "address"] },
      { key: "FacultyId", type: "int", aliases: ["faculty id"] },
      { key: "OrganisationName", type: "string", aliases: ["organisation", "organization", "company", "org name"] },
      { key: "FirstName", type: "string", aliases: ["first name", "given name", "first_name"] },
      { key: "BestContactName", type: "string", aliases: ["best contact person to liaise with on this event", "best contact person", "liaison contact", "contact person"] },
      { key: "PositionTitle", type: "string", aliases: ["position title", "job title", "role", "title"] },
      { key: "Email", type: "string", aliases: ["email", "contact email", "e-mail"] },
      { key: "ListName", type: "string", aliases: ["list", "list name", "mailing list"] },
      { key: "Source", type: "string", aliases: ["source", "lead source", "referral"] },
      { key: "EventsInvitedTo", type: "string", aliases: ["events invited to", "invited events", "event name", "event"] },
      { key: "Response", type: "string", aliases: ["response", "rsvp status", "status", "attendance response"] },
      { key: "Notes", type: "string", aliases: ["notes", "comments", "remarks"] },
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
      { key: "ProposedFacultyId", type: "int", aliases: ["proposed faculty id", "faculty id", "proposed faculty"] },
      { key: "ProposedMultipleTeams", type: "bool", aliases: ["proposed multiple teams", "multiple teams"] },
      { key: "ProposedDisciplineArea", type: "string", aliases: ["proposed discipline area", "discipline area"] },
      { key: "ProposedSecondaryItDiscipline", type: "string", aliases: ["proposed secondary it discipline", "secondary it discipline"] },
      { key: "ProposedDeliverables", type: "string", aliases: ["proposed deliverables", "deliverables"] },
      { key: "StudentProjectAgreement", type: "string", aliases: ["student project agreement", "spa", "student project agreement - ip licence/assignment"] },
      { key: "IpAssignmentRationale", type: "string", aliases: ["ip assignment rationale", "ip rationale", "assignment of ip - rationale"] },
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
      { key: "FacultyId", type: "int", aliases: ["faculty id", "faculty"] },
      { key: "OrganisationId", type: "guid", aliases: ["organisation id", "organization id"] },
      { key: "IsActive", type: "bool", aliases: ["is active", "active"], defaultValue: true },
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

export function suggestColumnMapping(
  headers: string[],
  fields: FieldSpec[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normHeaders = headers.map((h) => ({ original: h, norm: normalizeKey(h) }));

  for (const field of fields) {
    const fieldNorm = normalizeKey(field.key);
    const aliasesNorm = (field.aliases || []).map((a) => normalizeKey(a));

    // 1. Direct exact key match
    let match = normHeaders.find((h) => h.original.toLowerCase() === field.key.toLowerCase());
    if (match) {
      mapping[field.key] = match.original;
      continue;
    }

    // 2. Direct normalized key match
    match = normHeaders.find((h) => h.norm === fieldNorm);
    if (match) {
      mapping[field.key] = match.original;
      continue;
    }

    // 3. Exact alias match
    match = normHeaders.find((h) =>
      (field.aliases || []).some((a) => a.toLowerCase() === h.original.toLowerCase()),
    );
    if (match) {
      mapping[field.key] = match.original;
      continue;
    }

    // 4. Normalized alias match
    match = normHeaders.find((h) => aliasesNorm.includes(h.norm));
    if (match) {
      mapping[field.key] = match.original;
      continue;
    }

    // 5. Substring / Token matching
    // Check if any header contains the field key or alias tokens, or vice versa
    const tokens = [fieldNorm, ...aliasesNorm];
    match = normHeaders.find((h) => {
      return tokens.some((t) => {
        if (!t || t.length < 3) return false;
        return h.norm.includes(t) || t.includes(h.norm);
      });
    });

    if (match) {
      mapping[field.key] = match.original;
    } else {
      mapping[field.key] = "";
    }
  }

  return mapping;
}

export function validateCsvForTable(
  headers: string[],
  tableKey: string,
  columnMapping?: Record<string, string>,
): ValidationResult {
  const config = TABLE_CONFIGS[tableKey];
  if (!config) {
    return { valid: false, message: `Unknown target category "${tableKey}".` };
  }

  if (!headers || headers.length === 0) {
    return { valid: false, message: "The CSV file contains no header columns." };
  }

  // If explicit columnMapping is provided
  if (columnMapping && Object.keys(columnMapping).length > 0) {
    const missingRequired: string[] = [];
    let mappedCount = 0;

    for (const field of config.fields) {
      const mappedHeader = columnMapping[field.key];
      if (mappedHeader && mappedHeader.trim() !== "") {
        const headerExists = headers.some(
          (h) => h === mappedHeader || normalizeKey(h) === normalizeKey(mappedHeader),
        );
        if (headerExists) {
          mappedCount++;
        } else if (field.required) {
          const displayHeader = field.aliases?.[0] || field.key;
          missingRequired.push(displayHeader);
        }
      } else if (field.required) {
        const displayHeader = field.aliases?.[0] || field.key;
        missingRequired.push(displayHeader);
      }
    }

    if (missingRequired.length > 0) {
      return {
        valid: false,
        message: `Missing required column mapping(s): ${missingRequired.map((m) => `"${m}"`).join(", ")}. Please select a corresponding CSV column.`,
      };
    }

    if (mappedCount === 0) {
      return {
        valid: false,
        message: `No columns from the CSV are mapped to target category '${config.label}'.`,
      };
    }

    return { valid: true };
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
  columnMapping?: Record<string, string>,
): { body: Record<string, unknown>; error?: string } {
  const normalizedRow: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeKey(key)] = value;
  }

  const body: Record<string, unknown> = {};
  for (const field of fields) {
    let raw: string | undefined = undefined;

    if (columnMapping !== undefined) {
      const mappedHeader = columnMapping[field.key];
      if (mappedHeader && mappedHeader.trim() !== "") {
        if (row[mappedHeader] !== undefined) {
          raw = row[mappedHeader];
        } else {
          const normMapped = normalizeKey(mappedHeader);
          if (normalizedRow[normMapped] !== undefined) {
            raw = normalizedRow[normMapped];
          }
        }
      }
    } else {
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
    }

    const value = coerce(raw, field.type, field.defaultValue);

    if (field.required && (value === undefined || value === "")) {
      return { body, error: `Missing required field "${field.key}"` };
    }

    if (value !== undefined) {
      body[field.key] = value;
    }
  }

  // If AddressLine1 exists, intelligently split into AddressLine2, City (suburb), State, Postcode, Country if not already provided
  if (typeof body.AddressLine1 === "string" && (body.AddressLine1 as string).trim() !== "") {
    const rawAddress = body.AddressLine1 as string;
    if (!body.City || !body.State || !body.Postcode) {
      const parsed = parseAddress(rawAddress);
      if (parsed.city && !body.City) body.City = parsed.city;
      if (parsed.state && !body.State) body.State = parsed.state;
      if (parsed.postcode && !body.Postcode) body.Postcode = parsed.postcode;
      if (parsed.addressLine2 && !body.AddressLine2) body.AddressLine2 = parsed.addressLine2;
      if (parsed.country && !body.Country) body.Country = parsed.country;
      body.AddressLine1 = parsed.addressLine1;
    }
  }

  // Synchronize PrimaryContact details with general Email/Phone if only one was provided
  if (body.PrimaryContactName) {
    if (!body.PrimaryContactEmail && body.Email) {
      body.PrimaryContactEmail = body.Email;
    }
    if (!body.PrimaryContactPhone && body.Phone) {
      body.PrimaryContactPhone = body.Phone;
    }
  }

  return { body };
}

export function generateSampleCsv(tableKey: string): string {
  const config = TABLE_CONFIGS[tableKey];
  if (!config) return "";

  const headers = config.fields.map((f) => {
    if (f.key === "AddressLine1") return "Address Line 1";
    if (f.key === "AddressLine2") return "Address Line 2";
    if (f.key === "PrimaryContactName") return "Primary Contact Name";
    if (f.key === "PrimaryContactPosition") return "Primary Contact Position";
    if (f.key === "PrimaryContactEmail") return "Primary Contact Email";
    if (f.key === "PrimaryContactPhone") return "Primary Contact Phone";
    if (f.key === "RegistrationId") return "Registration ID";
    if (f.key === "Abn") return "ABN";
    if (f.key === "OrganisationInformation") return "Organisation Information";
    if (f.key === "PartnershipStatus") return "Partnership Status";
    if (f.key === "OrganisationName") return "Organisation Name";
    if (f.key === "ProjectPartnerAgreement") return "Project Partner Agreement";
    if (f.key === "StudentProjectAgreement") return "Student Project Agreement";
    if (f.key === "IpAssignmentRationale") return "IP Assignment Rationale";
    if (f.key === "DisciplineArea") return "Discipline Area";
    if (f.key === "SecondaryItDiscipline") return "Secondary IT Discipline";
    if (f.key === "ProjectDeliverables") return "Project Deliverables";
    if (f.key === "ProjectType") return "Project Type";
    if (f.key === "FullName") return "Full Name";
    if (f.key === "IsActive") return "Is Active";
    if (f.key === "FacultyId") return "Faculty ID";
    if (f.key === "OrganisationId") return "Organisation ID";
    if (f.key === "ProposedTitle") return "Proposed Title";
    if (f.key === "ProposedDescription") return "Proposed Description";
    if (f.key === "ProposedProjectType") return "Proposed Project Type";
    if (f.key === "ProposedSemester") return "Proposed Semester";
    if (f.key === "ProposedYear") return "Proposed Year";
    if (f.key === "ProposedFacultyId") return "Proposed Faculty ID";
    if (f.key === "ProposedMultipleTeams") return "Proposed Multiple Teams";
    if (f.key === "ProposedDisciplineArea") return "Proposed Discipline Area";
    if (f.key === "ProposedSecondaryItDiscipline") return "Proposed Secondary IT Discipline";
    if (f.key === "ProposedDeliverables") return "Proposed Deliverables";
    if (f.aliases && f.aliases.length > 0) {
      return f.aliases[0].replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return f.key.replace(/([A-Z])/g, " $1").trim();
  });
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

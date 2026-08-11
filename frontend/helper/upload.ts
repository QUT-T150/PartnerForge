"use server";

import { cookies } from "next/headers";
import Papa from "papaparse";
import {
  TABLE_CONFIGS,
  buildRow,
  validateCsvForTable,
  type UploadState,
} from "./upload-core";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const COOKIE_NAME = "auth-token";

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

  const headers = parsed.meta.fields || [];
  const validation = validateCsvForTable(headers, table);
  if (!validation.valid) {
    return {
      status: "error",
      message: validation.message || "Invalid CSV format for target category.",
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

  const isDryRun = formData.get("dryRun") === "true";

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // account for header row + 1-indexing
    const { body, error } = buildRow(rows[i], config.fields);
    if (error) {
      errors.push(`Row ${rowNumber}: ${error}`);
      continue;
    }
    validBodies.push(body);
  }

  if (isDryRun) {
    const failed = rows.length - validBodies.length;
    const status = failed === 0 ? "success" : validBodies.length === 0 ? "error" : "partial";
    return {
      status,
      message: `[Dry Run Simulation] ${validBodies.length} of ${rows.length} rows valid for ${config.label}. No database changes were made.`,
      total: rows.length,
      succeeded: validBodies.length,
      failed,
      errors: errors.slice(0, 20),
      dryRun: true,
    };
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

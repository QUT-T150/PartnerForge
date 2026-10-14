import { request } from "@/lib/api";

export interface AnalyticsSummary {
  totalPartners: number;
  activePartners: number;
  prospectPartners: number;
  partnersWithoutProjects: number;
  totalProjects: number;
  projectsThisYear: number;
  pendingApplications: number;
  upcomingEvents: number;
}

export interface OrganisationStat {
  id: string;
  name: string;
  industryId: number | null;
  industry: string | null;
  partnershipStatus: string;
  totalProjects: number;
  firstProjectDate: string | null;
  lastProjectDate: string | null;
  eventsAttended: number;
}

export interface IntakeSummary {
  year: number;
  semester: string;
  label: string;
  totalProjects: number;
  uniquePartners: number;
  newPartners: number;
  returningPartners: number;
}

export interface MostActivePartner {
  id: string;
  name: string;
  industry: string | null;
  projectCount: number;
}

export type OrganisationStatSort =
  | "name"
  | "totalProjects"
  | "lastProjectDate"
  | "eventsAttended";

export interface OrganisationStatQuery {
  search?: string;
  industryId?: number;
  status?: string;
  sortBy?: OrganisationStatSort;
  sortDirection?: "asc" | "desc";
  limit?: number;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchSummary(): Promise<AnalyticsSummary | null> {
  return request<AnalyticsSummary>("/analytics/summary");
}

export async function fetchOrganisationStats(
  query: OrganisationStatQuery = {},
): Promise<OrganisationStat[]> {
  const rows = await request<OrganisationStat[]>(
    `/analytics/organisations${toQueryString({ ...query })}`,
  );
  return rows ?? [];
}

export async function fetchIntakes(
  fromYear?: number,
  toYear?: number,
): Promise<IntakeSummary[]> {
  const rows = await request<IntakeSummary[]>(
    `/analytics/intakes${toQueryString({ fromYear, toYear })}`,
  );
  return rows ?? [];
}

export async function fetchMostActivePartners(
  limit?: number,
): Promise<MostActivePartner[]> {
  const rows = await request<MostActivePartner[]>(
    `/analytics/most-active-partners${toQueryString({ limit })}`,
  );
  return rows ?? [];
}

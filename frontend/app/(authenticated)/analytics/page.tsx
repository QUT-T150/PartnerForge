"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPermissions, type Role } from "@/lib/permissions";
import { formatDate, StatusBadge } from "@/components/DataTable";
import StackedBarChart from "@/components/charts/StackedBarChart";
import RankedBarChart from "@/components/charts/RankedBarChart";
import { SERIES_COLORS } from "@/components/charts/palette";
import {
  fetchIntakes,
  fetchMostActivePartners,
  fetchOrganisationStats,
  fetchSummary,
  type AnalyticsSummary,
  type IntakeSummary,
  type MostActivePartner,
  type OrganisationStat,
  type OrganisationStatSort,
} from "@/lib/api/analytics";
import "./analytics.css";

const STAT_TILES: { key: keyof AnalyticsSummary; label: string; hint: string }[] = [
  { key: "totalPartners", label: "Industry partners", hint: "Organisations on record" },
  { key: "activePartners", label: "Active partnerships", hint: "Currently engaged" },
  { key: "prospectPartners", label: "Prospects", hint: "Not yet engaged" },
  { key: "partnersWithoutProjects", label: "No projects yet", hint: "Never delivered a project" },
  { key: "totalProjects", label: "Projects", hint: "All intakes" },
  { key: "projectsThisYear", label: "Projects this year", hint: "Current calendar year" },
  { key: "pendingApplications", label: "Pending applications", hint: "Awaiting review" },
  { key: "upcomingEvents", label: "Upcoming events", hint: "Dated today or later" },
];

const INTAKE_RANGES = [
  { label: "Last 3 years", years: 3 },
  { label: "Last 5 years", years: 5 },
  { label: "Last 10 years", years: 10 },
  { label: "All time", years: 0 },
];

const PARTNER_LIMITS = [5, 10, 20];

const STATUS_OPTIONS = ["prospect", "active", "completed", "inactive"];

const SORT_OPTIONS: { value: OrganisationStatSort; label: string }[] = [
  { value: "totalProjects", label: "Project count" },
  { value: "name", label: "Name" },
  { value: "lastProjectDate", label: "Most recent project" },
  { value: "eventsAttended", label: "Events attended" },
];

export default function AnalyticsPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [intakes, setIntakes] = useState<IntakeSummary[]>([]);
  const [partners, setPartners] = useState<MostActivePartner[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationStat[]>([]);

  const [intakeRange, setIntakeRange] = useState(5);
  const [partnerLimit, setPartnerLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState<OrganisationStatSort>("totalProjects");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [showIntakeTable, setShowIntakeTable] = useState(false);
  const [showPartnerTable, setShowPartnerTable] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = user?.role as Role | undefined;
  const canView = role ? getPermissions(role).analytics !== "no" : false;

  const loadHeadline = useCallback(async () => {
    const fromYear =
      intakeRange === 0 ? undefined : new Date().getFullYear() - (intakeRange - 1);

    const [summaryResult, intakeResult, partnerResult] = await Promise.all([
      fetchSummary(),
      fetchIntakes(fromYear),
      fetchMostActivePartners(partnerLimit),
    ]);

    setSummary(summaryResult);
    setIntakes(intakeResult);
    setPartners(partnerResult);
  }, [intakeRange, partnerLimit]);

  const loadOrganisations = useCallback(async () => {
    const rows = await fetchOrganisationStats({
      search: search.trim() || undefined,
      status: status || undefined,
      sortBy,
      sortDirection,
      limit: 100,
    });
    setOrganisations(rows);
  }, [search, status, sortBy, sortDirection]);

  // Nothing is fetched until the role allows it; the denied panel never reads `loading`.
  useEffect(() => {
    if (!canView) return;

    let cancelled = false;

    // setState happens after the awaited fetch, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHeadline()
      .catch(() => {
        if (!cancelled) setError("Could not load analytics. Try refreshing.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canView, loadHeadline]);

  useEffect(() => {
    if (!canView) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      loadOrganisations().catch(() => {
        if (!cancelled) setError("Could not load the organisation breakdown.");
      });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canView, loadOrganisations]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([loadHeadline(), loadOrganisations()]);
    } catch {
      setError("Could not refresh analytics.");
    } finally {
      setRefreshing(false);
    }
  }

  const intakeChartData = useMemo(
    () =>
      intakes.map((intake) => ({
        label: intake.label,
        values: {
          returning: intake.returningPartners,
          new: intake.newPartners,
        },
      })),
    [intakes],
  );

  const partnerChartData = useMemo(
    () =>
      partners.map((partner) => ({
        id: partner.id,
        label: partner.name,
        meta: partner.industry,
        value: partner.projectCount,
      })),
    [partners],
  );

  if (!user) return null;

  if (!canView) {
    return (
      <div className="analytics-page">
        <div className="analytics-container">
          <div className="analytics-denied">
            <ShieldAlert size={20} />
            <div>
              <h3>Analytics is not available for your role</h3>
              <p>
                These reports aggregate every organisation in the database, so access is
                limited to administrators and course organisers.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-container">
        <div className="analytics-header">
          <div className="analytics-heading">
            <BarChart3 size={20} />
            <div>
              <h2>Analytics</h2>
              <p>
                Partner activity, intake trends, and engagement across the whole partner
                database.
              </p>
            </div>
          </div>
          <button
            className="analytics-refresh"
            type="button"
            onClick={refresh}
            disabled={refreshing || loading}
          >
            <RefreshCw size={14} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {error && <div className="analytics-error">{error}</div>}

        <div className="stat-grid">
          {STAT_TILES.map((tile) => (
            <div key={tile.key} className="stat-tile">
              <div className="stat-value">
                {loading || !summary ? <span className="stat-skeleton" /> : summary[tile.key]}
              </div>
              <div className="stat-label">{tile.label}</div>
              <div className="stat-hint">{tile.hint}</div>
            </div>
          ))}
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Partner intake trend</h3>
              <p>
                Partners per intake, split by whether it was their first project with QUT or a
                return.
              </p>
            </div>
            <div className="panel-controls">
              <label>
                <span>Range</span>
                <select
                  value={intakeRange}
                  onChange={(e) => setIntakeRange(Number(e.target.value))}
                >
                  {INTAKE_RANGES.map((range) => (
                    <option key={range.years} value={range.years}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => setShowIntakeTable((v) => !v)}>
                {showIntakeTable ? "Hide table" : "Show table"}
              </button>
            </div>
          </div>

          <StackedBarChart
            data={intakeChartData}
            series={[
              { key: "returning", label: "Returning partners", color: SERIES_COLORS.primary },
              { key: "new", label: "New partners", color: SERIES_COLORS.secondary },
            ]}
            caption="Stacked bar chart of new and returning industry partners per intake."
            emptyMessage="No intakes recorded in this range yet."
          />

          {showIntakeTable && (
            <table className="data-view">
              <thead>
                <tr>
                  <th>Intake</th>
                  <th>Projects</th>
                  <th>Partners</th>
                  <th>New</th>
                  <th>Returning</th>
                </tr>
              </thead>
              <tbody>
                {intakes.map((intake) => (
                  <tr key={intake.label}>
                    <td>{intake.label}</td>
                    <td>{intake.totalProjects}</td>
                    <td>{intake.uniquePartners}</td>
                    <td>{intake.newPartners}</td>
                    <td>{intake.returningPartners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Most active partners</h3>
              <p>Projects delivered over the trailing three years.</p>
            </div>
            <div className="panel-controls">
              <label>
                <span>Show</span>
                <select
                  value={partnerLimit}
                  onChange={(e) => setPartnerLimit(Number(e.target.value))}
                >
                  {PARTNER_LIMITS.map((limit) => (
                    <option key={limit} value={limit}>
                      Top {limit}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => setShowPartnerTable((v) => !v)}>
                {showPartnerTable ? "Hide table" : "Show table"}
              </button>
            </div>
          </div>

          <RankedBarChart
            data={partnerChartData}
            color={SERIES_COLORS.primary}
            caption="Horizontal bar chart ranking industry partners by projects delivered in the last three years."
            emptyMessage="No projects recorded in the last three years."
          />

          {showPartnerTable && (
            <table className="data-view">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Industry</th>
                  <th>Projects</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr key={partner.id}>
                    <td>{partner.name}</td>
                    <td>{partner.industry ?? "—"}</td>
                    <td>{partner.projectCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Engagement by organisation</h3>
              <p>Every partner with their project count, engagement window, and events attended.</p>
            </div>
            <div className="panel-controls">
              <input
                type="search"
                placeholder="Search organisations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as OrganisationStatSort)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort by {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
              >
                {sortDirection === "asc" ? "Ascending" : "Descending"}
              </button>
            </div>
          </div>

          {organisations.length === 0 ? (
            <div className="analytics-empty">No organisations match these filters.</div>
          ) : (
            <table className="data-view">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th>Projects</th>
                  <th>First project</th>
                  <th>Last project</th>
                  <th>Events</th>
                </tr>
              </thead>
              <tbody>
                {organisations.map((org) => (
                  <tr key={org.id}>
                    <td>{org.name}</td>
                    <td>{org.industry ?? "—"}</td>
                    <td>
                      <StatusBadge value={org.partnershipStatus} />
                    </td>
                    <td>{org.totalProjects}</td>
                    <td>{formatDate(org.firstProjectDate) || "—"}</td>
                    <td>{formatDate(org.lastProjectDate) || "—"}</td>
                    <td>{org.eventsAttended}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { request } from "@/lib/api";
import {
  canCreate,
  canEdit,
  canDelete,
  prettyRole,
  getPermissions,
  type Role,
  type EntityType,
} from "@/lib/permissions";
import DataTable, {
  StatusBadge,
  formatDate,
  type Column,
} from "@/components/DataTable";
import FilterBuilder from "@/components/FilterBuilder";
import RecordModal, { type FieldDef } from "@/components/RecordModal";
import ConfirmModal from "@/components/ConfirmModal";
import { Plus, Search } from "lucide-react";
import "./platform.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VIEW_COPY: Record<string, { category: string; title: string; context: string }> = {
  partners: {
    category: "PARTNERFORGE — ORGANISATIONS",
    title: "Industry Partners",
    context:
      "Partners can have multiple approved projects and pending project applications.",
  },
  projects: {
    category: "PARTNERFORGE — PROJECTS",
    title: "Projects",
    context: "Approved project records linked to industry partners.",
  },
  applications: {
    category: "PARTNERFORGE — APPLICATIONS",
    title: "Project Applications",
    context:
      "Pending partner-submitted applications waiting for review or approval.",
  },
  events: {
    category: "PARTNERFORGE — EVENTS",
    title: "Events",
    context:
      "Showcases, expos, meetings, and other industry engagement records.",
  },
  users: {
    category: "PARTNERFORGE — ACCESS & USERS",
    title: "User Management",
    context: "Admin-only account, role, and access management.",
  },
};

const FIELD_SETS: Record<string, FieldDef[]> = {
  partner: [
    ["name", "Organisation name", "text", true],
    ["registrationId", "Registration ID", "text", false],
    ["abn", "ABN", "text", false],
    ["industryId", "Industry", "select-industry", false],
    ["email", "Email", "email", false],
    ["website", "Website", "text", false],
    ["phone", "Phone", "text", false],
    ["addressLine1", "Address line 1", "text", false],
    ["addressLine2", "Address line 2", "text", false],
    ["city", "City", "text", false],
    ["state", "State", "text", false],
    ["postcode", "Postcode", "text", false],
    ["country", "Country", "text", false],
    ["primaryContactName", "Industry partner contact / supervisor", "text", false],
    ["primaryContactPosition", "Position title", "text", false],
    ["primaryContactEmail", "Contact email", "email", false],
    ["primaryContactPhone", "Contact phone", "text", false],
    [
      "partnershipStatus",
      "Partnership status",
      "select",
      true,
      ["prospect", "active", "completed", "inactive"],
    ],
    ["organisationInformation", "Organisation information", "textarea", false],
    ["notes", "Notes", "textarea", false],
  ],
  project: [
    ["title", "Project title", "text", true],
    ["description", "Description", "textarea", false],
    ["organisationId", "Organisation", "select-org", true],
    ["facultyId", "Faculty ID", "number", false],
    [
      "projectType",
      "Project type",
      "select",
      true,
      ["capstone", "undergrad", "postgrad"],
    ],
    ["semester", "Semester", "select", true, ["S1", "S2", "SS"]],
    ["year", "Year", "number", true],
    [
      "status",
      "Status",
      "select",
      true,
      ["proposed", "ongoing", "completed", "cancelled"],
    ],
    ["multipleTeams", "Multiple teams", "select", true, ["false", "true"]],
    ["disciplineArea", "Discipline area", "text", false],
    ["secondaryItDiscipline", "Secondary IT discipline", "text", false],
    ["projectDeliverables", "Project deliverables", "textarea", false],
    ["projectPartnerAgreement", "Project partner agreement", "textarea", false],
    ["studentProjectAgreement", "Student project agreement - IP licence/assignment", "textarea", false],
    ["ipAssignmentRationale", "Assignment of IP - rationale", "textarea", false],
    ["notes", "Notes", "textarea", false],
  ],
  application: [
    ["proposedTitle", "Title of the proposed project", "text", true],
    ["proposedDescription", "Description", "textarea", false],
    ["organisationId", "Organisation", "select-org", true],
    ["contactId", "Contact ID", "text", false],
    [
      "proposedProjectType",
      "Project type",
      "select",
      false,
      ["capstone", "undergrad", "postgrad"],
    ],
    ["proposedSemester", "Semester", "select", false, ["S1", "S2", "SS"]],
    ["proposedYear", "Year", "number", false],
    ["proposedFacultyId", "Faculty ID", "number", false],
    ["proposedMultipleTeams", "Multiple teams", "select", true, ["false", "true"]],
    ["proposedDisciplineArea", "Discipline area", "text", false],
    ["proposedSecondaryItDiscipline", "Secondary IT discipline", "text", false],
    ["proposedDeliverables", "Project deliverables", "textarea", false],
    [
      "studentProjectAgreement",
      "Student project agreement - IP licence/assignment",
      "textarea",
      false,
    ],
    ["ipAssignmentRationale", "Assignment of IP - rationale", "textarea", false],
  ],
  event: [
    ["name", "Name", "text", true],
    ["description", "Description", "textarea", false],
    [
      "eventType",
      "Event type",
      "select",
      false,
      ["showcase", "expo", "meeting", "scholar_program"],
    ],
    ["eventDate", "Date", "date", true],
    ["location", "Location", "text", false],
    ["facultyId", "Faculty ID", "number", false],
    ["notes", "Notes", "textarea", false],
  ],
  user: [
    ["email", "Email", "email", true],
    ["password", "Password", "password", false],
    ["fullName", "Full name", "text", true],
    [
      "role",
      "Role",
      "select",
      true,
      ["admin", "course_organiser", "industry_partner","industry_team", "industry_team_manager"],
    ],
    ["facultyId", "Faculty ID", "number", false],
    ["organisationId", "Organisation", "select-org-empty", false],
    ["isActive", "Active", "select", true, ["true", "false"]],
  ],
};

const API_PATHS: Record<string, string> = {
  partner: "/organisations",
  project: "/projects",
  application: "/projectapplications",
  event: "/events",
  user: "/users",
};
const AUDIT_TABLE_NAMES: Record<string, string> = {
  partner: "organisations",
  project: "projects",
  application: "project_applications",
  event: "events",
  user: "users",
};

function filterRows(rows: any[], filters: Record<string, string>): any[] {
  return rows.filter((row) =>
    Object.entries(filters).every(([key, expected]) => {
      if (!expected) return true;
      return String(row[key] ?? "")
        .toLowerCase()
        .includes(expected.toLowerCase());
    }),
  );
}

function PlatformContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const role = (user?.role || "industry_partner") as Role;
  const perms = getPermissions(role);

  const [partners, setPartners] = useState<any[]>([]);
  // Bumped after any add/edit/delete so each FilterBuilder re-runs its
  // current search and reloads its filter options (see refreshKey there).
  const [dataVersion, setDataVersion] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  // Full, unfiltered/unpaginated project list, kept in sync with loadData()
  // independently of the Projects tab's own FilterBuilder (which overwrites
  // `projects` with just its current filtered/paginated page). The
  // Organisations tab's per-org expandable Projects panel reads from this
  // instead, so it always reflects every project regardless of what filters
  // or paging the Projects tab currently has applied. Also used to work out
  // which page a specific project falls on when jumping to it from
  // elsewhere (see pageForProjectId below).
  const [allProjects, setAllProjects] = useState<any[]>([]);
  // Same idea, mirrored for organisations (see pageForPartnerId below).
  const [allPartners, setAllPartners] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search results are paginated, so the rows in state are one page rather than
  // the whole set. The search response carries the real count -- keep it so the
  // summary tiles report the total (or the filtered total) instead of the page
  // size. Null means no search has run and the row arrays are already complete.
  const [partnersTotal, setPartnersTotal] = useState<number | null>(null);
  const [projectsTotal, setProjectsTotal] = useState<number | null>(null);
  const [eventsTotal, setEventsTotal] = useState<number | null>(null);

  // Which page of results the Partners/Projects tables are currently
  // showing (results are paginated 25/page - see FilterBuilder). Normally
  // driven by the table's own Previous/Next controls, but also set
  // directly when jumping to a specific record from elsewhere, so that
  // record's page loads before we try to highlight/scroll to its row (see
  // pageForProjectId/pageForPartnerId and goToProjectsTab/
  // goToOrganisationsTab).
  const [partnerPage, setPartnerPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);

  // Filters
  const [applicationsSearch, setApplicationsSearch] = useState("");
  const [applicationsStatus, setApplicationsStatus] = useState("pending");
  const [applicationsSemester, setApplicationsSemester] = useState("");
  const [applicationsYear, setApplicationsYear] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRole, setUsersRole] = useState("");
  const [usersActive, setUsersActive] = useState("");

  // Modal
  const [modalType, setModalType] = useState("");
  const [modalId, setModalId] = useState<string | null>(null);
  const [modalRecord, setModalRecord] = useState<Record<string, unknown>>({});
  // True while the modal is a quick read-only peek opened from a Partner link
  // elsewhere (e.g. a project's organisation), rather than the Organisations
  // tab's own Edit action - swaps the modal's Edit button for a plain link
  // back to the Organisations tab instead of letting you edit from here.
  const [partnerPeek, setPartnerPeek] = useState(false);
  // Which organisation row (if any) has its inline "Projects" list expanded,
  // toggled by clicking the Projects count in the Organisations table.
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  // Which project row (if any) was just jumped to from elsewhere (e.g. the
  // "View in Projects" link out of an organisation's peeked project) - it
  // gets a highlight fill on the Projects table so it's obvious at a glance,
  // and is cleared again once the user leaves the Projects tab.
  const [highlightProjectId, setHighlightProjectId] = useState<string | null>(
    null,
  );
  // Same idea, mirrored for the Organisations table - set when "View in
  // Organisations" is used to jump there from a peeked Partner record.
  const [highlightPartnerId, setHighlightPartnerId] = useState<string | null>(
    null,
  );

  const view = searchParams.get("view") || "all";
  const effectiveView =
    view === "users" && perms.users === "no" ? "all" : VIEW_COPY[view] ? view : "all";

  useEffect(() => {
    if (effectiveView !== "projects") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightProjectId(null);
      // Reset paging too, so reopening the Projects tab normally (not via a
      // "View in Projects" jump) starts back on page 1 instead of wherever
      // a previous jump left it.
      setProjectPage(1);
    }
    if (effectiveView !== "partners") {
      setHighlightPartnerId(null);
      setPartnerPage(1);
    }
  }, [effectiveView]);

  const loadData = useCallback(async () => {
    try {
      const reqs: Promise<any>[] = [
        request("/organisations"),
        request("/projects"),
        request("/projectapplications"),
        request("/events"),
        request("/organisations/industries"),
      ];
      if (perms.users !== "no") reqs.push(request("/users"));

      const results = await Promise.all(reqs);
      // partners/projects/events (the table rows) are owned by each
      // section's FilterBuilder, which loads its own filtered, paginated
      // results - setting them here too would overwrite the filtered view
      // with every record (e.g. right after saving). Only the full lists
      // used for lookups (peeks, dropdowns, expanded rows) are set here.
      setAllPartners(results[0] || []);
      setAllProjects(results[1] || []);
      setApplications(results[2] || []);
      setIndustries(results[4] || []);
      setUsers(results[5] || []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, [role]);

  useEffect(() => {
    // Platform records are loaded from the API after auth state is known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handlePartnerResults = useCallback(
    (data: { items: any[]; total: number; page?: number }) => {
      setPartners(data.items);
      setPartnersTotal(data.total);
      // Keep our page state truthful to what actually loaded (e.g. if a
      // requested page turned out past the last page).
      if (data.page != null) setPartnerPage(data.page);
    },
    [],
  );

  const handleProjectResults = useCallback(
    (data: { items: any[]; total: number; page?: number }) => {
      setProjects(data.items);
      setProjectsTotal(data.total);
      if (data.page != null) setProjectPage(data.page);
    },
    [],
  );

  const handleEventResults = useCallback((data: { items: any[]; total: number }) => {
    setEvents(data.items);
    setEventsTotal(data.total);
  }, []);

  // Filtered rows
  const filteredApplications = filterRows(applications, {
    proposedTitle: applicationsSearch,
    applicationStatus: applicationsStatus,
    proposedSemester: applicationsSemester,
    proposedYear: applicationsYear,
  });
  const filteredUsers =
    perms.users !== "no"
      ? filterRows(users, {
          fullName: usersSearch,
          role: usersRole,
          isActive: usersActive,
        })
      : [];

  const copy = VIEW_COPY[effectiveView];
  const pageCategory = copy ? copy.category : "PARTNERFORGE — PLATFORM";
  const pageTitle = copy ? copy.title : "Platform Overview";
  const pageContext = copy
    ? copy.context
    : `${user?.fullName || "User"} (${prettyRole(role) || "signed in"}) can see records scoped by the API.`;

  const isSingleView = effectiveView !== "all";

  const singleEntityMeta: Record<
    string,
    { type: string; label: string; count: string; canAdd: boolean }
  > = {
    partners: {
      type: "partner",
      label: "Add Partner",
      count: `${partnersTotal ?? partners.length} records`,
      canAdd: canCreate(role, "partner"),
    },
    projects: {
      type: "project",
      label: "Add Project",
      count: `${projectsTotal ?? projects.length} records`,
      canAdd: canCreate(role, "project"),
    },
    applications: {
      type: "application",
      label: "Add Application",
      count: `${filteredApplications.length} proposals`,
      canAdd: canCreate(role, "application"),
    },
    events: {
      type: "event",
      label: "Add Event",
      count: `${eventsTotal ?? events.length} records`,
      canAdd: canCreate(role, "event"),
    },
    users: {
      type: "user",
      label: "Add User",
      count: `${filteredUsers.length} accounts`,
      canAdd: canCreate(role, "user"),
    },
  };

  const currentMeta = isSingleView ? singleEntityMeta[effectiveView] : null;

  function isVisible(section: string) {
    return effectiveView === "all" || effectiveView === section;
  }

  function openModal(type: string, record: any = {}, peek: boolean = false) {
    setModalType(type);
    setModalId(record.id || null);
    setModalRecord(record);
    setPartnerPeek(peek);
  }

  function closeModal() {
    setModalType("");
    setModalId(null);
    setModalRecord({});
    setPartnerPeek(false);
  }

  // Lets a Partner cell in the Projects/Applications tables show that
  // organisation's record as a quick read-only peek, without leaving the
  // current tab - no more one-click jump to a whole different section.
  function openPartnerPeek(organisationId?: string) {
    if (!organisationId) return;
    const record = allPartners.find((p) => p.id === organisationId);
    if (record) openModal("partner", record, true);
  }

  // Organisations results are paginated 25/page, sorted by name (see the
  // Organisations FilterBuilder below) - a highlighted row only ends up
  // visible if that same page is actually loaded first. allPartners holds
  // every organisation regardless of the Organisations tab's own paging, so
  // sorting a copy the same way the API does tells us which page a given
  // organisation would land on.
  function pageForPartnerId(id: string, pageSize = 25): number {
    const sorted = [...allPartners].sort((a, b) =>
      String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
        sensitivity: "base",
      }),
    );
    const idx = sorted.findIndex((p) => String(p?.id) === id);
    return idx === -1 ? 1 : Math.floor(idx / pageSize) + 1;
  }

  // Called from inside that peek when the user actually wants to manage the
  // organisation - navigates to the Organisations tab and turns the still-open
  // modal into a normal, editable view.
  function goToOrganisationsTab() {
    setPartnerPeek(false);
    const id = modalRecord.id ? String(modalRecord.id) : null;
    setHighlightPartnerId(id);
    // Jump the Organisations table to whichever page actually contains this
    // row - otherwise the highlight effect finds nothing to highlight
    // whenever the row isn't on page 1.
    setPartnerPage(id ? pageForPartnerId(id) : 1);
    // scroll: false - we're about to scroll the highlighted row into view
    // ourselves (see DataTable's highlightRowId effect); without this,
    // Next.js resets the page scroll to the top right after navigating and
    // wins the race against our scrollIntoView.
    router.push("/platform?view=partners", { scroll: false });
  }

  // Lets a project title in an organisation's expanded Projects list show
  // that project's record as a quick read-only peek, without leaving the
  // Organisations tab.
  function openProjectPeek(project: any) {
    openModal("project", project, true);
  }

  // Same idea as pageForPartnerId above, mirrored for projects (sorted by
  // title, matching the Projects FilterBuilder's sortBy="title" below).
  function pageForProjectId(id: string, pageSize = 25): number {
    const sorted = [...allProjects].sort((a, b) =>
      String(a?.title ?? "").localeCompare(String(b?.title ?? ""), undefined, {
        sensitivity: "base",
      }),
    );
    const idx = sorted.findIndex((p) => String(p?.id) === id);
    return idx === -1 ? 1 : Math.floor(idx / pageSize) + 1;
  }

  // Called from inside that peek when the user actually wants to manage the
  // project - navigates to the Projects tab and turns the still-open modal
  // into a normal, editable view.
  function goToProjectsTab() {
    setPartnerPeek(false);
    setExpandedOrgId(null);
    const id = modalRecord.id ? String(modalRecord.id) : null;
    setHighlightProjectId(id);
    // Same reasoning as pageForPartnerId/goToOrganisationsTab above.
    setProjectPage(id ? pageForProjectId(id) : 1);
    router.push("/platform?view=projects", { scroll: false });
  }

  async function handleSave(data: Record<string, unknown>) {
    const path = API_PATHS[modalType];
    await request(`${path}${modalId ? `/${modalId}` : ""}`, {
      method: modalId ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    closeModal();
    setDataVersion((v) => v + 1);
    await loadData();
  }

  const [deleteTarget, setDeleteTarget] = useState<{
    type: EntityType;
    id: string;
    name?: string;
  } | null>(null);

  function requestDelete(type: EntityType, id: string, name?: string) {
    setDeleteTarget({ type, id, name });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const path = API_PATHS[deleteTarget.type];
    try {
      await request(`${path}/${deleteTarget.id}`, { method: "DELETE" });
      setDataVersion((v) => v + 1);
      await loadData();
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleteTarget(null);
    }
  }

  function ActionButtons({ type, id }: { type: EntityType; id: string }) {
    const collections: Record<string, any[]> = {
      partner: partners,
      project: projects,
      application: applications,
      event: events,
      user: users,
    };
    return (
      <div className="action-buttons-group">
        {canEdit(role, type) && (
          <button
            type="button"
            className="action-btn edit-btn"
            onClick={() => {
              const record = collections[type]?.find((r: any) => r.id === id);
              if (record) openModal(type, record);
            }}
          >
            Edit
          </button>
        )}
        {canDelete(role, type) && (
          <button
            type="button"
            className="action-btn delete-btn"
            onClick={() => {
              const record = collections[type]?.find((r: any) => r.id === id);
              requestDelete(
                type,
                id,
                record?.name || record?.title || record?.fullName || record?.proposedTitle,
              );
            }}
          >
            Delete
          </button>
        )}
      </div>
    );
  }

  // Renders a compact list of an organisation's own projects for the
  // expandable row under its "Projects" count - traces from an organisation
  // straight to what it's linked to, without leaving the Organisations tab.
  function renderOrgProjects(r: any) {
    const orgProjects = allProjects.filter((p) => p.organisationId === r.id);
    if (orgProjects.length === 0) {
      return (
        <div className="org-projects-empty">
          No projects recorded for this organisation yet.
        </div>
      );
    }
    return (
      <table className="org-projects-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Discipline</th>
            <th>Intake</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {orgProjects.map((p) => (
            <tr key={p.id}>
              <td>
                <button
                  type="button"
                  className="partner-link"
                  onClick={() => openProjectPeek(p)}
                >
                  {p.title}
                </button>
              </td>
              <td>{p.projectType}</td>
              <td>{p.disciplineArea || ""}</td>
              <td>{`${p.semester} ${p.year}`}</td>
              <td>
                <StatusBadge value={p.status} />
              </td>
              <td>{formatDate(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const partnerColumns: Column<any>[] = [
    { label: "Name", minWidth: "150px", render: (r) => r.name },
    {
      label: "Registration",
      minWidth: "125px",
      render: (r) => <span className="mono nowrap">{r.registrationId || "\u2014"}</span>,
    },
    {
      label: "ABN",
      minWidth: "115px",
      render: (r) => <span className="mono nowrap">{r.abn || "\u2014"}</span>,
    },
    { label: "Industry", minWidth: "130px", render: (r) => r.industry || "Unspecified" },
    {
      label: "Primary contact",
      minWidth: "135px",
      render: (r) => r.primaryContactName || "\u2014",
    },
    {
      label: "Partnership",
      minWidth: "105px",
      render: (r) => <StatusBadge value={r.partnershipStatus} />,
    },
    {
      label: "Email",
      minWidth: "170px",
      render: (r) => <span className="nowrap">{r.primaryContactEmail || r.email || "\u2014"}</span>,
    },
    {
      label: "Projects",
      minWidth: "75px",
      render: (r) => (
        <button
          type="button"
          className="expand-toggle"
          onClick={() =>
            setExpandedOrgId((prev) => (prev === r.id ? null : r.id))
          }
        >
          {r.projectCount ?? 0} {expandedOrgId === r.id ? "\u25be" : "\u25b8"}
        </button>
      ),
    },
    {
      label: "Since",
      minWidth: "65px",
      render: (r) => <span className="nowrap">{r.firstProjectYear ?? "\u2014"}</span>,
    },
    {
      label: "Latest",
      minWidth: "65px",
      render: (r) => <span className="nowrap">{r.latestProjectYear ?? "\u2014"}</span>,
    },
    { label: "Pending apps", minWidth: "95px", render: (r) => r.pendingApplicationCount },
    {
      label: "Actions",
      minWidth: "130px",
      render: (r) => <ActionButtons type="partner" id={r.id} />,
    },
  ];

  const projectColumns: Column<any>[] = [
    { label: "Title", minWidth: "180px", render: (r) => r.title },
    {
      label: "Partner",
      minWidth: "140px",
      render: (r) => (
        <button
          type="button"
          className="partner-link"
          onClick={() => openPartnerPeek(r.organisationId)}
        >
          {r.organisationName}
        </button>
      ),
    },
    { label: "Type", minWidth: "100px", render: (r) => r.projectType },
    { label: "Discipline", minWidth: "130px", render: (r) => r.disciplineArea || "" },
    {
      label: "Teams",
      minWidth: "85px",
      render: (r) => (r.multipleTeams ? "Multiple" : "Single"),
    },
    {
      label: "Intake",
      minWidth: "95px",
      render: (r) => <span className="nowrap">{`${r.semester} ${r.year}`}</span>,
    },
    { label: "Status", minWidth: "95px", render: (r) => <StatusBadge value={r.status} /> },
    {
      label: "Updated",
      minWidth: "95px",
      render: (r) => <span className="nowrap">{formatDate(r.updatedAt)}</span>,
    },
    {
      label: "Actions",
      minWidth: "130px",
      render: (r) => <ActionButtons type="project" id={r.id} />,
    },
  ];

  const applicationColumns: Column<any>[] = [
    { label: "Proposed title", minWidth: "180px", render: (r) => r.proposedTitle },
    {
      label: "Partner",
      minWidth: "140px",
      render: (r) => (
        <button
          type="button"
          className="partner-link"
          onClick={() => openPartnerPeek(r.organisationId)}
        >
          {r.organisationName}
        </button>
      ),
    },
    { label: "Type", minWidth: "100px", render: (r) => r.proposedProjectType || "" },
    {
      label: "Discipline",
      minWidth: "130px",
      render: (r) => r.proposedDisciplineArea || "",
    },
    {
      label: "Teams",
      minWidth: "85px",
      render: (r) => (r.proposedMultipleTeams ? "Multiple" : "Single"),
    },
    {
      label: "Intake",
      minWidth: "95px",
      render: (r) => (
        <span className="nowrap">
          {[r.proposedSemester, r.proposedYear].filter(Boolean).join(" ")}
        </span>
      ),
    },
    {
      label: "Status",
      minWidth: "95px",
      render: (r) => <StatusBadge value={r.applicationStatus} />,
    },
    {
      label: "Submitted",
      minWidth: "95px",
      render: (r) => <span className="nowrap">{formatDate(r.submittedAt)}</span>,
    },
    {
      label: "Actions",
      minWidth: "130px",
      render: (r) => <ActionButtons type="application" id={r.id} />,
    },
  ];

  const eventColumns: Column<any>[] = [
    { label: "Name", minWidth: "160px", render: (r) => r.name },
    { label: "Type", minWidth: "100px", render: (r) => r.eventType || "" },
    {
      label: "Date",
      minWidth: "95px",
      render: (r) => <span className="nowrap">{formatDate(r.eventDate)}</span>,
    },
    { label: "Location", minWidth: "130px", render: (r) => r.location || "" },
    { label: "Faculty", minWidth: "120px", render: (r) => r.faculty || "All faculties" },
    { label: "Attendees", minWidth: "85px", render: (r) => r.attendanceCount },
    {
      label: "Actions",
      minWidth: "130px",
      render: (r) => <ActionButtons type="event" id={r.id} />,
    },
  ];

  const userColumns: Column<any>[] = [
    { label: "Name", minWidth: "140px", render: (r) => r.fullName },
    {
      label: "Email",
      minWidth: "160px",
      render: (r) => <span className="nowrap">{r.email}</span>,
    },
    {
      label: "Role",
      minWidth: "170px",
      render: (r) => (
        <span className="role-cell">
          <StatusBadge value={prettyRole(r.role)} />
        </span>
      ),
    },
    { label: "Faculty", minWidth: "110px", render: (r) => r.faculty || "" },
    {
      label: "Organisation",
      minWidth: "130px",
      render: (r) => r.organisationName || "",
    },
    {
      label: "Active",
      minWidth: "85px",
      render: (r) => <StatusBadge value={r.isActive ? "active" : "inactive"} />,
    },
    {
      label: "Last login",
      minWidth: "95px",
      render: (r) => <span className="nowrap">{formatDate(r.lastLoginAt)}</span>,
    },
    {
      label: "Actions",
      minWidth: "130px",
      render: (r) => <ActionButtons type="user" id={r.id} />,
    },
  ];

  return (
    <div className="platform-page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-main">
            <div className="category-label">{pageCategory}</div>
            <div className="page-header-title-row">
              <h1 className="page-heading">{pageTitle}</h1>
              {currentMeta && (
                <span className="section-badge">{currentMeta.count}</span>
              )}
            </div>
            <p className="page-subtitle">{pageContext}</p>
          </div>
          {currentMeta && currentMeta.canAdd && (
            <button
              className="primary-btn"
              onClick={() => openModal(currentMeta.type)}
            >
              <Plus size={15} strokeWidth={2} />
              <span>{currentMeta.label}</span>
            </button>
          )}
        </div>

        {!isSingleView && (
          <div className="summary-grid">
            {isVisible("partners") && (
              <div className="summary-card">
                <div className="summary-label">Industry Partners</div>
                <div className="summary-value">{partnersTotal ?? partners.length}</div>
              </div>
            )}
            {isVisible("projects") && (
              <div className="summary-card">
                <div className="summary-label">Projects</div>
                <div className="summary-value">{projectsTotal ?? projects.length}</div>
              </div>
            )}
            {isVisible("applications") && (
              <div className="summary-card">
                <div className="summary-label">Applications</div>
                <div className="summary-value">
                  {filteredApplications.length}
                </div>
              </div>
            )}
            {isVisible("events") && (
              <div className="summary-card">
                <div className="summary-label">Events</div>
                <div className="summary-value">{eventsTotal ?? events.length}</div>
              </div>
            )}
            {isVisible("users") && perms.users !== "no" && (
              <div className="summary-card">
                <div className="summary-label">Users</div>
                <div className="summary-value">{filteredUsers.length}</div>
              </div>
            )}
          </div>
        )}

        {/* Partners Section */}
        {isVisible("partners") && (
          <section className="section">
            {!isSingleView && (
              <div className="section-header">
                <div className="section-title-wrap">
                  <h2>Industry Partners</h2>
                  <span className="section-badge">
                    {partnersTotal ?? partners.length} records
                  </span>
                </div>
                {canCreate(role, "partner") && (
                  <button
                    className="primary-btn"
                    onClick={() => openModal("partner")}
                  >
                    <Plus size={15} strokeWidth={2} />
                    <span>Add Partner</span>
                  </button>
                )}
              </div>
            )}
            <FilterBuilder
              entity="organisations"
              refreshKey={dataVersion}
              sortBy="name"
              onResults={handlePartnerResults}
              page={partnerPage}
              onPageChange={setPartnerPage}
            />
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable
                columns={partnerColumns}
                rows={partners}
                emptyMessage="No partner organisations found matching your filters."
                expandedRowId={expandedOrgId}
                getRowId={(r: any) => r.id}
                renderExpandedRow={renderOrgProjects}
                highlightRowId={highlightPartnerId}
                page={partnerPage}
                pageSize={25}
                total={partnersTotal ?? undefined}
                onPageChange={setPartnerPage}
              />
            )}
          </section>
        )}

        {/* Projects Section */}
        {isVisible("projects") && (
          <section className="section">
            {!isSingleView && (
              <div className="section-header">
                <div className="section-title-wrap">
                  <h2>Projects</h2>
                  <span className="section-badge">
                    {projectsTotal ?? projects.length} records
                  </span>
                </div>
                {canCreate(role, "project") && (
                  <button
                    className="primary-btn"
                    onClick={() => openModal("project")}
                  >
                    <Plus size={15} strokeWidth={2} />
                    <span>Add Project</span>
                  </button>
                )}
              </div>
            )}
            <FilterBuilder
              entity="projects"
              refreshKey={dataVersion}
              sortBy="title"
              onResults={handleProjectResults}
              page={projectPage}
              onPageChange={setProjectPage}
            />
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable
                columns={projectColumns}
                rows={projects}
                emptyMessage="No projects found matching your filters."
                getRowId={(r: any) => r.id}
                highlightRowId={highlightProjectId}
                page={projectPage}
                pageSize={25}
                total={projectsTotal ?? undefined}
                onPageChange={setProjectPage}
              />
            )}
          </section>
        )}

        {/* Applications Section */}
        {isVisible("applications") && (
          <section className="section">
            {!isSingleView && (
              <div className="section-header">
                <div className="section-title-wrap">
                  <h2>Project Applications</h2>
                  <span className="section-badge">
                    {filteredApplications.length} proposals
                  </span>
                </div>
                {canCreate(role, "application") && (
                  <button
                    className="primary-btn"
                    onClick={() => openModal("application")}
                  >
                    <Plus size={15} strokeWidth={2} />
                    <span>Add Application</span>
                  </button>
                )}
              </div>
            )}
            <div className="section-tools">
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="search"
                  placeholder="Search applications..."
                  value={applicationsSearch}
                  onChange={(e) => setApplicationsSearch(e.target.value)}
                />
              </div>
              <select
                value={applicationsStatus}
                onChange={(e) => setApplicationsStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={applicationsSemester}
                onChange={(e) => setApplicationsSemester(e.target.value)}
              >
                <option value="">All semesters</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="SS">SS</option>
              </select>
              <input
                type="number"
                min={2019}
                max={2100}
                placeholder="Year"
                value={applicationsYear}
                onChange={(e) => setApplicationsYear(e.target.value)}
              />
            </div>
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable
                columns={applicationColumns}
                rows={filteredApplications}
                emptyMessage="No project applications found matching your criteria."
              />
            )}
          </section>
        )}

        {/* Events Section */}
        {isVisible("events") && (
          <section className="section">
            {!isSingleView && (
              <div className="section-header">
                <div className="section-title-wrap">
                  <h2>Events</h2>
                  <span className="section-badge">
                    {eventsTotal ?? events.length} records
                  </span>
                </div>
                {canCreate(role, "event") && (
                  <button
                    className="primary-btn"
                    onClick={() => openModal("event")}
                  >
                    <Plus size={15} strokeWidth={2} />
                    <span>Add Event</span>
                  </button>
                )}
              </div>
            )}
            <FilterBuilder
              entity="events"
              refreshKey={dataVersion}
              sortBy="event_date"
              onResults={handleEventResults}
            />
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable
                columns={eventColumns}
                rows={events}
                emptyMessage="No events found matching your filters."
              />
            )}
          </section>
        )}

        {/* Users Section (admin only) */}
        {isVisible("users") && perms.users !== "no" && (
          <section className="section">
            {!isSingleView && (
              <div className="section-header">
                <div className="section-title-wrap">
                  <h2>User Management</h2>
                  <span className="section-badge">
                    {filteredUsers.length} accounts
                  </span>
                </div>
                {canCreate(role, "user") && (
                  <button
                    className="primary-btn"
                    onClick={() => openModal("user")}
                  >
                    <Plus size={15} strokeWidth={2} />
                    <span>Add User</span>
                  </button>
                )}
              </div>
            )}
            <div className="section-tools">
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="search"
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                />
              </div>
              <select
                value={usersRole}
                onChange={(e) => setUsersRole(e.target.value)}
              >
                <option value="">All roles</option>
                <option value="admin">Admin</option>
                <option value="course_organiser">Course organiser</option>
                <option value="industry_partner">Industry partner</option>
                <option value="industry_team">Industry team</option>
<option value="industry_team_manager">Industry team manager</option>
              </select>
              <select
                value={usersActive}
                onChange={(e) => setUsersActive(e.target.value)}
              >
                <option value="">All account states</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable
                columns={userColumns}
                rows={filteredUsers}
                emptyMessage="No user accounts found matching your query."
              />
            )}
          </section>
        )}
      </div>

      {modalType && FIELD_SETS[modalType] && (
        <RecordModal
          open={!!modalType}
          title={modalType}
          fields={FIELD_SETS[modalType]}
          record={modalRecord}
          partners={allPartners}
          industries={industries}
          isNew={!modalId}
          onClose={closeModal}
          onSubmit={handleSave}
          tableName={AUDIT_TABLE_NAMES[modalType]}
          canViewHistory={role === "admin" || role === "course_organiser"}
          peekMode={partnerPeek}
          peekLinkLabel={modalType === "project" ? "View in Projects" : "View in Organisations"}
          onPeekNavigate={modalType === "project" ? goToProjectsTab : goToOrganisationsTab}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget ? deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1) : "Record"}`}
        message={
          deleteTarget?.name
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action will remove or archive the record.`
            : "Are you sure you want to delete this record? This action will remove or archive the record."
        }
        confirmText="Delete Record"
        destructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function PlatformPage() {
  return (
    <Suspense>
      <PlatformContent />
    </Suspense>
  );
}

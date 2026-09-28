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
import "./platform.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VIEW_COPY: Record<string, { title: string; context: string }> = {
  partners: {
    title: "Organisations",
    context:
      "Partners can have multiple approved projects and pending project applications.",
  },
  projects: {
    title: "Projects",
    context: "Approved project records linked to industry partners.",
  },
  applications: {
    title: "Project Applications",
    context:
      "Pending partner-submitted applications waiting for review or approval.",
  },
  events: {
    title: "Events",
    context:
      "Showcases, expos, meetings, and other industry engagement records.",
  },
  users: {
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
    [
      "studentProjectAgreement",
      "Student project agreement - IP licence/assignment",
      "textarea",
      false,
    ],
    ["ipAssignmentRationale", "Assignment of IP - rationale", "textarea", false],
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
  const pageTitle = copy ? copy.title : "Partner and Projects View";
  const pageContext = copy
    ? copy.context
    : `${user?.fullName || "User"} (${prettyRole(role) || "signed in"}) can see records scoped by the API.`;

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

  async function handleDelete(type: EntityType, id: string) {
    if (!confirm("Move this record to deleted records?")) return;
    const path = API_PATHS[type];
    await request(`${path}/${id}`, { method: "DELETE" });
    setDataVersion((v) => v + 1);
    await loadData();
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
      <>
        {canEdit(role, type) && (
          <button
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
            className="action-btn delete-btn"
            onClick={() => handleDelete(type, id)}
          >
            Delete
          </button>
        )}
      </>
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
    { label: "Name", width: "12%", render: (r) => r.name },
    { label: "Registration", width: "8%", render: (r) => r.registrationId || "" },
    { label: "ABN", width: "9%", render: (r) => r.abn || "" },
    { label: "Industry", width: "10%", render: (r) => r.industry || "Unspecified" },
    {
      label: "Primary contact",
      width: "8%",
      render: (r) => r.primaryContactName || "",
    },
    {
      label: "Partnership",
      width: "8%",
      render: (r) => <StatusBadge value={r.partnershipStatus} />,
    },
    {
      label: "Email",
      width: "10%",
      render: (r) => r.primaryContactEmail || r.email || "",
    },
    {
      label: "Projects",
      width: "7%",
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
    // First / most recent project year - partnership longevity and recency
    // at a glance (also filterable via First/Latest project year).
    { label: "Since", width: "7%", render: (r) => r.firstProjectYear ?? "\u2014" },
    { label: "Latest", width: "7%", render: (r) => r.latestProjectYear ?? "\u2014" },
    { label: "Pending apps", width: "6%", render: (r) => r.pendingApplicationCount },
    {
      label: "Actions",
      width: "8%",
      render: (r) => <ActionButtons type="partner" id={r.id} />,
    },
  ];

  const projectColumns: Column<any>[] = [
    { label: "Title", width: "20%", render: (r) => r.title },
    {
      label: "Partner",
      width: "13%",
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
    { label: "Type", width: "9%", render: (r) => r.projectType },
    { label: "Discipline", width: "14%", render: (r) => r.disciplineArea || "" },
    {
      label: "Teams",
      width: "8%",
      render: (r) => (r.multipleTeams ? "Multiple" : "Single"),
    },
    { label: "Intake", width: "8%", render: (r) => `${r.semester} ${r.year}` },
    { label: "Status", width: "9%", render: (r) => <StatusBadge value={r.status} /> },
    { label: "Updated", width: "10%", render: (r) => formatDate(r.updatedAt) },
    {
      label: "Actions",
      width: "9%",
      render: (r) => <ActionButtons type="project" id={r.id} />,
    },
  ];

  const applicationColumns: Column<any>[] = [
    { label: "Proposed title", width: "20%", render: (r) => r.proposedTitle },
    {
      label: "Partner",
      width: "13%",
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
    { label: "Type", width: "9%", render: (r) => r.proposedProjectType || "" },
    {
      label: "Discipline",
      width: "14%",
      render: (r) => r.proposedDisciplineArea || "",
    },
    {
      label: "Teams",
      width: "8%",
      render: (r) => (r.proposedMultipleTeams ? "Multiple" : "Single"),
    },
    {
      label: "Intake",
      width: "8%",
      render: (r) =>
        [r.proposedSemester, r.proposedYear].filter(Boolean).join(" "),
    },
    {
      label: "Status",
      width: "9%",
      render: (r) => <StatusBadge value={r.applicationStatus} />,
    },
    { label: "Submitted", width: "10%", render: (r) => formatDate(r.submittedAt) },
    {
      label: "Actions",
      width: "9%",
      render: (r) => <ActionButtons type="application" id={r.id} />,
    },
  ];

  const eventColumns: Column<any>[] = [
    { label: "Name", render: (r) => r.name },
    { label: "Type", render: (r) => r.eventType || "" },
    { label: "Date", render: (r) => formatDate(r.eventDate) },
    { label: "Location", render: (r) => r.location || "" },
    { label: "Faculty", render: (r) => r.faculty || "All faculties" },
    { label: "Attendees", render: (r) => r.attendanceCount },
    { label: "Actions", render: (r) => <ActionButtons type="event" id={r.id} /> },
  ];

  const userColumns: Column<any>[] = [
    { label: "Name", width: "13%", render: (r) => r.fullName },
    { label: "Email", width: "14%", render: (r) => r.email },
    // "Industry Team Manager" is the longest badge label in the app - this
    // column gets extra width (borrowed from Name/Email/Faculty/Organisation
    // below) so the badge can stay a normal single-line pill like every other
    // status badge (e.g. the Active column), instead of wrapping into an
    // odd-looking multi-line blob.
    {
      label: "Role",
      width: "23%",
      // .role-cell trims the badge's font size a touch (see platform.css) -
      // still needed even at 23% width for this one long value. prettyRole()
      // shows "Industry Team Manager" instead of the raw snake_case value.
      render: (r) => (
        <span className="role-cell">
          <StatusBadge value={prettyRole(r.role)} />
        </span>
      ),
    },
    { label: "Faculty", width: "11%", render: (r) => r.faculty || "" },
    {
      label: "Organisation",
      width: "13%",
      render: (r) => r.organisationName || "",
    },
    {
      label: "Active",
      width: "8%",
      render: (r) => <StatusBadge value={r.isActive ? "active" : "inactive"} />,
    },
    { label: "Last login", width: "10%", render: (r) => formatDate(r.lastLoginAt) },
    {
      label: "Actions",
      width: "8%",
      render: (r) => <ActionButtons type="user" id={r.id} />,
    },
  ];

  return (
    <div className="platform-page">
      <div className="container">
        <div className="page-title">
          <h1>{pageTitle}</h1>
          <p>{pageContext}</p>
        </div>

        <div className="summary-grid">
          {isVisible("partners") && (
            <div className="summary-card">
              <div className="summary-label">Partners</div>
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
          {isVisible("users") && perms.users !== "no"  && (
            <div className="summary-card">
              <div className="summary-label">Users</div>
              <div className="summary-value">{filteredUsers.length}</div>
            </div>
          )}
        </div>

        {/* Partners Section */}
        {isVisible("partners") && (
          <section className="section">
            <div className="section-header">
              <h2>Organisations</h2>
              <span>Organisations visible to your role</span>
            </div>
            <div className="section-tools">
              {canCreate(role, "partner") && (
                <button
                  className="primary-btn"
                  onClick={() => openModal("partner")}
                >
                  Add Partner
                </button>
              )}
            </div>
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
            <div className="section-header">
              <h2>Projects</h2>
              <span>Approved and active project records</span>
            </div>
            <div className="section-tools">
              {canCreate(role, "project") && (
                <button
                  className="primary-btn"
                  onClick={() => openModal("project")}
                >
                  Add Project
                </button>
              )}
            </div>
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
            <div className="section-header">
              <h2>Project Applications</h2>
              <span>Partner-facing project submissions</span>
            </div>
            <div className="section-tools">
              <input
                type="search"
                placeholder="Search applications..."
                value={applicationsSearch}
                onChange={(e) => setApplicationsSearch(e.target.value)}
              />
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
              {canCreate(role, "application") && (
                <button
                  className="primary-btn"
                  onClick={() => openModal("application")}
                >
                  Add Application
                </button>
              )}
            </div>
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable
                columns={applicationColumns}
                rows={filteredApplications}
              />
            )}
          </section>
        )}

        {/* Events Section */}
        {isVisible("events") && (
          <section className="section">
            <div className="section-header">
              <h2>Events</h2>
              <span>
                Showcases, expos, meetings, and partner engagement activity
              </span>
            </div>
            <div className="section-tools">
              {canCreate(role, "event") && (
                <button
                  className="primary-btn"
                  onClick={() => openModal("event")}
                >
                  Add Event
                </button>
              )}
            </div>
            <FilterBuilder
              entity="events"
              refreshKey={dataVersion}
              sortBy="event_date"
              onResults={handleEventResults}
            />
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable columns={eventColumns} rows={events} />
            )}
          </section>
        )}

        {/* Users Section (admin only) */}
        {isVisible("users") && perms.users !== "no" && (
          <section className="section">
            <div className="section-header">
              <h2>User Management</h2>
              <span>Admin-only account and role management</span>
            </div>
            <div className="section-tools">
              <input
                type="search"
                placeholder="Search users..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
              />
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
              {canCreate(role, "user") && (
                <button
                  className="primary-btn"
                  onClick={() => openModal("user")}
                >
                  Add User
                </button>
              )}
            </div>
            {loadError ? (
              <div className="error">Could not load data ({loadError}).</div>
            ) : (
              <DataTable columns={userColumns} rows={filteredUsers} />
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

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Code2,
  ShieldCheck,
  Database,
  Layers,
  Terminal,
  ExternalLink,
  ArrowLeft,
  Copy,
  Check,
  BarChart3,
  FileSpreadsheet,
  Cpu,
  Flame,
  KeyRound,
  Server,
  Globe,
  Radio,
} from "lucide-react";
import "./docs.css";

type CodeLang = "curl" | "ts" | "csharp" | "python";

interface EndpointDoc {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  category: string;
  title: string;
  description: string;
  roles: string[];
  requestBody?: string;
  responseBody?: string;
  codeSnippets: {
    curl: string;
    ts: string;
    csharp: string;
    python: string;
  };
}

const API_BASE = "http://localhost:8080";

const ENDPOINTS: EndpointDoc[] = [
  // --- AUTHENTICATION & SESSION ROTATION ---
  {
    id: "auth-login",
    method: "POST",
    path: "/api/Auth/login",
    category: "Authentication",
    title: "User Login & Key Exchange",
    description: "Authenticates email and password credentials. Returns an RSA-signed JWT access token alongside a secure single-use refresh token and user claims.",
    roles: ["Public / Anonymous"],
    requestBody: JSON.stringify({ email: "admin@system.com", password: "AdminPassword123!" }, null, 2),
    responseBody: JSON.stringify({
      token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      refreshToken: "b59a953e-52f0-466d-a1c0-0b65f7c32b50",
      expiresInSeconds: 3600,
      email: "admin@system.com",
      fullName: "System Administrator",
      role: "admin",
      facultyId: null,
      organisationId: null
    }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "${API_BASE}/api/Auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@system.com","password":"AdminPassword123!"}'`,
      ts: `const res = await fetch("${API_BASE}/api/Auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@system.com", password: "AdminPassword123!" })
});
const data = await res.json();`,
      csharp: `var client = new HttpClient();
var payload = new { email = "admin@system.com", password = "AdminPassword123!" };
var res = await client.PostAsJsonAsync("${API_BASE}/api/Auth/login", payload);
var data = await res.Content.ReadAsStringAsync();`,
      python: `import requests

res = requests.post(
    "${API_BASE}/api/Auth/login",
    json={"email": "admin@system.com", "password": "AdminPassword123!"}
)
data = res.json()`
    }
  },
  {
    id: "auth-refresh",
    method: "POST",
    path: "/api/Auth/refresh",
    category: "Authentication",
    title: "Rotate Refresh Token",
    description: "Swaps an unspent, single-use refresh token for a newly generated RSA access token and a replacement refresh token. Revokes the prior refresh token.",
    roles: ["Public / Active Session"],
    requestBody: JSON.stringify({ refreshToken: "b59a953e-52f0-466d-a1c0-0b65f7c32b50" }, null, 2),
    responseBody: JSON.stringify({
      token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      refreshToken: "f421b8c1-1e9a-4c22-901d-9e123456789a",
      expiresInSeconds: 3600,
      email: "admin@system.com",
      fullName: "System Administrator",
      role: "admin"
    }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "${API_BASE}/api/Auth/refresh" \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken":"b59a953e-52f0-466d-a1c0-0b65f7c32b50"}'`,
      ts: `const res = await fetch("${API_BASE}/api/Auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refreshToken: "b59a953e-52f0-466d-a1c0-0b65f7c32b50" })
});
const data = await res.json();`,
      csharp: `var res = await client.PostAsJsonAsync(
    "${API_BASE}/api/Auth/refresh",
    new { refreshToken = "b59a953e-52f0-466d-a1c0-0b65f7c32b50" }
);`,
      python: `res = requests.post(
    "${API_BASE}/api/Auth/refresh",
    json={"refreshToken": "b59a953e-52f0-466d-a1c0-0b65f7c32b50"}
)`
    }
  },
  {
    id: "auth-logout",
    method: "POST",
    path: "/api/Auth/logout",
    category: "Authentication",
    title: "Revoke Token & Sign Out",
    description: "Explicitly revokes the active refresh token in the database, invalidating the session and preventing further renewals.",
    roles: ["Authenticated"],
    requestBody: JSON.stringify({ refreshToken: "b59a953e-52f0-466d-a1c0-0b65f7c32b50" }, null, 2),
    responseBody: JSON.stringify({ message: "Successfully logged out and revoked refresh token." }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "${API_BASE}/api/Auth/logout" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken":"b59a953e-52f0-466d-a1c0-0b65f7c32b50"}'`,
      ts: `await fetch("${API_BASE}/api/Auth/logout", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${token}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ refreshToken: currentRefreshToken })
});`,
      csharp: `client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
var res = await client.PostAsJsonAsync("${API_BASE}/api/Auth/logout", new { refreshToken });`,
      python: `headers = {"Authorization": f"Bearer {token}"}
requests.post("${API_BASE}/api/Auth/logout", headers=headers, json={"refreshToken": refresh_token})`
    }
  },
  {
    id: "auth-register",
    method: "POST",
    path: "/api/Auth/register",
    category: "Authentication",
    title: "Register Staff User",
    description: "Provisions a new course organiser, industry partner, or administrator account. Requires administrator privileges.",
    roles: ["admin"],
    requestBody: JSON.stringify({
      email: "lecturer@qut.edu.au",
      password: "InitialPassword123!",
      fullName: "Dr. Jane Smith",
      role: "course_organiser",
      facultyId: 1
    }, null, 2),
    responseBody: JSON.stringify({
      id: "a1c430e2-9b21-42e1-8854-912803810f23",
      email: "lecturer@qut.edu.au",
      fullName: "Dr. Jane Smith",
      role: "course_organiser",
      facultyId: 1,
      organisationId: null
    }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "${API_BASE}/api/Auth/register" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"lecturer@qut.edu.au","password":"InitialPassword123!","fullName":"Dr. Jane Smith","role":"course_organiser","facultyId":1}'`,
      ts: `const res = await fetch("${API_BASE}/api/Auth/register", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${token}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: "lecturer@qut.edu.au",
    password: "InitialPassword123!",
    fullName: "Dr. Jane Smith",
    role: "course_organiser",
    facultyId: 1
  })
});`,
      csharp: `var payload = new {
    email = "lecturer@qut.edu.au",
    password = "InitialPassword123!",
    fullName = "Dr. Jane Smith",
    role = "course_organiser",
    facultyId = 1
};
var res = await client.PostAsJsonAsync("${API_BASE}/api/Auth/register", payload);`,
      python: `res = requests.post(
    "${API_BASE}/api/Auth/register",
    headers={"Authorization": f"Bearer {token}"},
    json={"email": "lecturer@qut.edu.au", "password": "InitialPassword123!", "fullName": "Dr. Jane Smith", "role": "course_organiser", "facultyId": 1}
)`
    }
  },

  // --- ORGANISATIONS ---
  {
    id: "orgs-list",
    method: "GET",
    path: "/api/organisations",
    category: "Organisations",
    title: "List Organisations",
    description: "Returns organisations accessible to the caller with optional substring search, partnership status, and industry filters.",
    roles: ["admin", "course_organiser", "industry_team_manager", "industry_team", "industry_partner (own only)"],
    responseBody: JSON.stringify([
      {
        id: "7b13904e-28b9-4b35-8664-5858cfd79904",
        registrationId: "ORG-001",
        name: "TechCorp Australia",
        abn: "12345678901",
        partnershipStatus: "active",
        submissionStatus: "approved",
        industryId: 2,
        industryName: "Information Technology",
        addressLine1: "123 Innovation Way",
        city: "Brisbane",
        state: "QLD",
        postcode: "4000",
        country: "Australia",
        projectCount: 5,
        pendingApplicationCount: 1,
        notes: "Key research collaborator for capstone projects."
      }
    ], null, 2),
    codeSnippets: {
      curl: `curl -X GET "${API_BASE}/api/organisations?partnershipStatus=active" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("${API_BASE}/api/organisations?partnershipStatus=active", {
  headers: { "Authorization": \`Bearer \${token}\` }
});
const data = await res.json();`,
      csharp: `client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
var res = await client.GetAsync("${API_BASE}/api/organisations?partnershipStatus=active");
var data = await res.Content.ReadAsStringAsync();`,
      python: `headers = {"Authorization": f"Bearer {token}"}
res = requests.get("${API_BASE}/api/organisations", headers=headers, params={"partnershipStatus": "active"})
data = res.json()`
    }
  },
  {
    id: "orgs-create",
    method: "POST",
    path: "/api/organisations",
    category: "Organisations",
    title: "Create Organisation",
    description: "Registers a new industry partner organisation along with initial primary contact metadata and address details.",
    roles: ["admin", "course_organiser", "industry_team_manager"],
    requestBody: JSON.stringify({
      name: "BioHealth Innovations",
      abn: "98765432109",
      partnershipStatus: "active",
      submissionStatus: "approved",
      industryId: 3,
      addressLine1: "45 Biomedical Blvd",
      city: "Herston",
      state: "QLD",
      postcode: "4006",
      country: "Australia",
      primaryContactName: "Dr. Marcus Vance",
      primaryContactEmail: "m.vance@biohealth.com.au",
      phone: "+61 7 3000 1234",
      notes: "Biotech capstone sponsor."
    }, null, 2),
    responseBody: JSON.stringify({ id: "8f422c57-6c2e-4b68-8098-b98a12345678" }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "${API_BASE}/api/organisations" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"BioHealth Innovations","abn":"98765432109","partnershipStatus":"active","submissionStatus":"approved","industryId":3}'`,
      ts: `const res = await fetch("${API_BASE}/api/organisations", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${token}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "BioHealth Innovations",
    abn: "98765432109",
    partnershipStatus: "active",
    submissionStatus: "approved",
    industryId: 3
  })
});`,
      csharp: `var payload = new {
    name = "BioHealth Innovations",
    abn = "98765432109",
    partnershipStatus = "active",
    submissionStatus = "approved",
    industryId = 3
};
var res = await client.PostAsJsonAsync("${API_BASE}/api/organisations", payload);`,
      python: `res = requests.post(
    "${API_BASE}/api/organisations",
    headers={"Authorization": f"Bearer {token}"},
    json={"name": "BioHealth Innovations", "abn": "98765432109", "partnershipStatus": "active", "submissionStatus": "approved", "industryId": 3}
)`
    }
  },

  // --- PROJECTS ---
  {
    id: "projects-list",
    method: "GET",
    path: "/api/projects",
    category: "Projects",
    title: "List Projects",
    description: "Returns capstone projects visible to the caller with optional search, status, semester, year, and organisation filters.",
    roles: ["admin", "course_organiser", "industry_team_manager", "industry_team", "industry_partner (own org only)"],
    responseBody: JSON.stringify([
      {
        id: "2b226f30-84c1-4091-a67b-1175bc66c5d1",
        title: "Autonomous Fleet Telemetry Pipeline",
        description: "High-throughput IoT telemetry ingestion and edge analytics platform.",
        organisationId: "7b13904e-28b9-4b35-8664-5858cfd79904",
        organisationName: "TechCorp Australia",
        projectType: "capstone",
        disciplineArea: "Computer Science & IoT",
        semester: "1",
        year: 2026,
        status: "active",
        ppaSigned: true,
        spaSigned: true,
        notes: "Weekly check-ins scheduled on Thursdays."
      }
    ], null, 2),
    codeSnippets: {
      curl: `curl -X GET "${API_BASE}/api/projects?semester=1&year=2026" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("${API_BASE}/api/projects?semester=1&year=2026", {
  headers: { "Authorization": \`Bearer \${token}\` }
});
const projects = await res.json();`,
      csharp: `var res = await client.GetAsync("${API_BASE}/api/projects?semester=1&year=2026");
var data = await res.Content.ReadAsStringAsync();`,
      python: `res = requests.get(
    "${API_BASE}/api/projects",
    headers={"Authorization": f"Bearer {token}"},
    params={"semester": "1", "year": 2026}
)`
    }
  },

  // --- DYNAMIC SEARCH DSL ---
  {
    id: "search-fields",
    method: "GET",
    path: "/api/search/fields/{entity}",
    category: "Dynamic Search DSL",
    title: "Discover Filterable Fields",
    description: "Returns the whitelist of searchable properties, display labels, and data types (text, number, select, date) for an entity.",
    roles: ["Authenticated"],
    responseBody: JSON.stringify([
      { field: "name", label: "Organisation Name", type: "text" },
      { field: "partnershipStatus", label: "Partnership Status", type: "select", options: ["prospect", "active", "inactive"] },
      { field: "state", label: "State", type: "select", options: ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "ACT", "NT"] },
      { field: "createdAt", label: "Creation Date", type: "date" }
    ], null, 2),
    codeSnippets: {
      curl: `curl -X GET "${API_BASE}/api/search/fields/organisations" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("${API_BASE}/api/search/fields/organisations", {
  headers: { "Authorization": \`Bearer \${token}\` }
});`,
      csharp: `var res = await client.GetAsync("${API_BASE}/api/search/fields/organisations");`,
      python: `res = requests.get("${API_BASE}/api/search/fields/organisations", headers={"Authorization": f"Bearer {token}"})`
    }
  },
  {
    id: "search-execute",
    method: "POST",
    path: "/api/search/{entity}",
    category: "Dynamic Search DSL",
    title: "Execute Dynamic Search Filter",
    description: "Evaluates multi-column criteria and cross-entity relationship conditions using EF Core expression trees.",
    roles: ["Authenticated"],
    requestBody: JSON.stringify({
      filters: [
        { field: "partnershipStatus", operator: "equals", value: "active" },
        { field: "state", operator: "equals", value: "QLD" }
      ],
      relatedFilters: [
        {
          entity: "projects",
          quantifier: "any",
          filters: [{ field: "year", operator: "greaterThan", value: "2024" }]
        }
      ],
      sortBy: "name",
      sortDirection: "asc",
      page: 1,
      pageSize: 25
    }, null, 2),
    responseBody: JSON.stringify({
      total: 14,
      items: [
        {
          id: "7b13904e-28b9-4b35-8664-5858cfd79904",
          name: "TechCorp Australia",
          partnershipStatus: "active",
          state: "QLD",
          projectCount: 5
        }
      ],
      page: 1,
      pageSize: 25
    }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "${API_BASE}/api/search/organisations" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"filters":[{"field":"partnershipStatus","operator":"equals","value":"active"}],"page":1,"pageSize":25}'`,
      ts: `const res = await fetch("${API_BASE}/api/search/organisations", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${token}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    filters: [{ field: "partnershipStatus", operator: "equals", value: "active" }],
    page: 1,
    pageSize: 25
  })
});`,
      csharp: `var payload = new {
    filters = new[] { new { field = "partnershipStatus", @operator = "equals", value = "active" } },
    page = 1,
    pageSize = 25
};
var res = await client.PostAsJsonAsync("${API_BASE}/api/search/organisations", payload);`,
      python: `res = requests.post(
    "${API_BASE}/api/search/organisations",
    headers={"Authorization": f"Bearer {token}"},
    json={"filters": [{"field": "partnershipStatus", "operator": "equals", "value": "active"}], "page": 1, "pageSize": 25}
)`
    }
  },

  // --- ANALYTICS ---
  {
    id: "analytics-summary",
    method: "GET",
    path: "/api/Analytics/summary",
    category: "Analytics",
    title: "Aggregate Metric Summary",
    description: "Returns platform-wide headline metrics including total organisations, active partnerships, capstone project volumes, and upcoming events.",
    roles: ["admin", "course_organiser", "industry_team_manager"],
    responseBody: JSON.stringify({
      totalOrganisations: 128,
      activePartnerships: 94,
      totalProjects: 312,
      activeProjectsThisSemester: 45,
      upcomingEvents: 3,
      pendingProposals: 7
    }, null, 2),
    codeSnippets: {
      curl: `curl -X GET "${API_BASE}/api/Analytics/summary" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("${API_BASE}/api/Analytics/summary", {
  headers: { "Authorization": \`Bearer \${token}\` }
});
const summary = await res.json();`,
      csharp: `var res = await client.GetAsync("${API_BASE}/api/Analytics/summary");
var data = await res.Content.ReadAsStringAsync();`,
      python: `res = requests.get("${API_BASE}/api/Analytics/summary", headers={"Authorization": f"Bearer {token}"})`
    }
  },
  {
    id: "analytics-most-active",
    method: "GET",
    path: "/api/Analytics/most-active-partners",
    category: "Analytics",
    title: "Most Active Partners (3 Years)",
    description: "Leverages analytical view v_most_active_partners_3yr to rank organisations by project commitment and student participation over a 36-month horizon.",
    roles: ["admin", "course_organiser", "industry_team_manager"],
    responseBody: JSON.stringify([
      {
        organisationId: "7b13904e-28b9-4b35-8664-5858cfd79904",
        organisationName: "TechCorp Australia",
        projectCount3Yr: 18,
        activeProjects: 4,
        primaryIndustry: "Information Technology"
      }
    ], null, 2),
    codeSnippets: {
      curl: `curl -X GET "${API_BASE}/api/Analytics/most-active-partners" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("${API_BASE}/api/Analytics/most-active-partners", {
  headers: { "Authorization": \`Bearer \${token}\` }
});`,
      csharp: `var res = await client.GetAsync("${API_BASE}/api/Analytics/most-active-partners");`,
      python: `res = requests.get("${API_BASE}/api/Analytics/most-active-partners", headers={"Authorization": f"Bearer {token}"})`
    }
  },

  // --- AUDIT LOG ---
  {
    id: "audit-log",
    method: "GET",
    path: "/api/AuditLog",
    category: "Audit Logs",
    title: "Browse Audit Trail",
    description: "Returns paginated audit trail events capturing INSERT, UPDATE, DELETE, and SOFT_DELETE operations across all system entities.",
    roles: ["admin"],
    responseBody: JSON.stringify({
      items: [
        {
          id: 1042,
          tableName: "organisations",
          recordId: "7b13904e-28b9-4b35-8664-5858cfd79904",
          action: "UPDATE",
          changedBy: "3a921d28-769a-4c92-a16f-1234567890ab",
          changedByFullName: "System Administrator",
          changedByEmail: "admin@system.com",
          changedAt: "2026-08-24T10:15:30Z",
          oldValues: "{\"partnership_status\":\"prospect\"}",
          newValues: "{\"partnership_status\":\"active\"}",
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0..."
        }
      ],
      totalCount: 142,
      page: 1,
      pageSize: 25
    }, null, 2),
    codeSnippets: {
      curl: `curl -X GET "${API_BASE}/api/AuditLog?tableName=organisations&page=1&pageSize=25" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("${API_BASE}/api/AuditLog?tableName=organisations&page=1&pageSize=25", {
  headers: { "Authorization": \`Bearer \${token}\` }
});
const auditLog = await res.json();`,
      csharp: `var res = await client.GetAsync("${API_BASE}/api/AuditLog?tableName=organisations&page=1&pageSize=25");`,
      python: `res = requests.get("${API_BASE}/api/AuditLog", headers={"Authorization": f"Bearer {token}"}, params={"tableName": "organisations", "page": 1, "pageSize": 25})`
    }
  },

  // --- HEALTH CHECK ---
  {
    id: "health-check",
    method: "GET",
    path: "/health",
    category: "Operations",
    title: "Liveness & Database Probe",
    description: "Unauthenticated health probe verifying API readiness and live MySQL database connectivity. Returns HTTP 200 'Healthy' or 503 'Unhealthy'.",
    roles: ["Public / Monitoring"],
    responseBody: "Healthy",
    codeSnippets: {
      curl: `curl -i "${API_BASE}/health"`,
      ts: `const res = await fetch("${API_BASE}/health");
const status = await res.text(); // "Healthy"`,
      csharp: `var res = await client.GetAsync("${API_BASE}/health");
var status = await res.Content.ReadAsStringAsync();`,
      python: `res = requests.get("${API_BASE}/health")
assert res.status_code == 200`
    }
  }
];

export default function DocumentationPage() {
  const [selectedSection, setSelectedSection] = useState<string>("overview");
  const [activeLang, setActiveLang] = useState<Record<string, CodeLang>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return ENDPOINTS;
    const query = searchQuery.toLowerCase();
    return ENDPOINTS.filter(
      (ep) =>
        ep.title.toLowerCase().includes(query) ||
        ep.path.toLowerCase().includes(query) ||
        ep.category.toLowerCase().includes(query) ||
        ep.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  function getLang(endpointId: string): CodeLang {
    return activeLang[endpointId] || "curl";
  }

  function setLang(endpointId: string, lang: CodeLang) {
    setActiveLang((prev) => ({ ...prev, [endpointId]: lang }));
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="docs-container">
      {/* Sidebar */}
      <aside className="docs-sidebar" aria-label="Documentation Navigation">
        <div className="docs-sidebar-header">
          <div className="docs-logo">PF</div>
          <div>
            <div className="docs-title">PartnerForge</div>
            <div className="docs-subtitle">DEVELOPER &amp; API SPEC</div>
          </div>
        </div>

        <div className="docs-search-container">
          <input
            type="text"
            className="docs-search-input"
            placeholder="Search API, guides &amp; routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="docs-nav">
          <div className="docs-nav-group-title">Architecture Guides</div>
          <a
            className={`docs-nav-item ${selectedSection === "overview" ? "active" : ""}`}
            onClick={() => setSelectedSection("overview")}
          >
            <span>Overview &amp; BFF Architecture</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "quickstart" ? "active" : ""}`}
            onClick={() => setSelectedSection("quickstart")}
          >
            <span>Quickstart &amp; Local Setup</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "security" ? "active" : ""}`}
            onClick={() => setSelectedSection("security")}
          >
            <span>5-Role RBAC &amp; JWT Auth</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "search-dsl" ? "active" : ""}`}
            onClick={() => setSelectedSection("search-dsl")}
          >
            <span>Dynamic Search Filter DSL</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "csv-import" ? "active" : ""}`}
            onClick={() => setSelectedSection("csv-import")}
          >
            <span>CSV Ingestion &amp; Export</span>
          </a>

          <div className="docs-nav-group-title" style={{ marginTop: 14 }}>
            API Endpoints ({filteredEndpoints.length})
          </div>
          {filteredEndpoints.map((ep) => (
            <a
              key={ep.id}
              className={`docs-nav-item ${selectedSection === ep.id ? "active" : ""}`}
              onClick={() => setSelectedSection(ep.id)}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ep.title}
              </span>
              <span className={`docs-nav-badge ${ep.method.toLowerCase()}`}>
                {ep.method}
              </span>
            </a>
          ))}

          <div className="docs-nav-group-title" style={{ marginTop: 14 }}>
            Operations &amp; DevOps
          </div>
          <a
            className={`docs-nav-item ${selectedSection === "database" ? "active" : ""}`}
            onClick={() => setSelectedSection("database")}
          >
            <span>Schema &amp; MySQL 8.4</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "development" ? "active" : ""}`}
            onClick={() => setSelectedSection("development")}
          >
            <span>Developer Runbook &amp; Cloud</span>
          </a>
        </nav>

        <div className="docs-sidebar-footer">
          <Link href="/dashboard" className="docs-back-link">
            <ArrowLeft size={14} /> Back to Platform Dashboard
          </Link>
          <a
            href="http://localhost:8080/swagger"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-back-link"
          >
            <ExternalLink size={14} /> Interactive Swagger UI
          </a>
        </div>
      </aside>

      {/* Content Area */}
      <main className="docs-content">
        <div className="docs-header-bar">
          <div>
            <div className="docs-section-tag">PartnerForge Architecture Portal</div>
            <h1 className="docs-main-heading">
              {selectedSection === "overview" && "Platform Overview & BFF Architecture"}
              {selectedSection === "quickstart" && "Quickstart & Local Loop"}
              {selectedSection === "security" && "Authentication, 5-Role RBAC & Token Rotation"}
              {selectedSection === "search-dsl" && "Dynamic Search Filter Specification"}
              {selectedSection === "csv-import" && "Bulk CSV Import, Auto-Mapping & Export"}
              {selectedSection === "database" && "Database Schema & Migration Workflow"}
              {selectedSection === "development" && "Local Verification & Railway Cloud Runbook"}
              {filteredEndpoints.find((e) => e.id === selectedSection)?.title}
            </h1>
          </div>
        </div>

        {/* Section: Overview */}
        {selectedSection === "overview" && (
          <div>
            <p className="docs-lead-text">
              <strong>PartnerForge</strong> is QUT&apos;s industry engagement and capstone project coordination platform. It coordinates industry partner organisations, student project agreements, partner proposals, event RSVP attendances, dynamic search filtering, and immutable audit logs.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Technology Stack</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Layer</th>
                      <th>Technology</th>
                      <th>Architectural Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Frontend</strong></td>
                      <td>Next.js 16 (App Router, React 19, TypeScript)</td>
                      <td>Server-side BFF proxy, httpOnly cookie auth, Tailwind v4 design tokens, Papaparse CSV processing, Vitest test suite.</td>
                    </tr>
                    <tr>
                      <td><strong>Backend API</strong></td>
                      <td>ASP.NET Core 10 Web API (.NET 10, C#)</td>
                      <td>Asymmetric RSA JWT signing (RS256), EF Core with Pomelo MySQL provider, dynamic LINQ expression trees, sliding rate limiting.</td>
                    </tr>
                    <tr>
                      <td><strong>Database</strong></td>
                      <td>MySQL 8.4 Server</td>
                      <td>Relational schema with 18 tables &amp; analytical views (<span className="docs-code-inline">v_intake_summary</span>, <span className="docs-code-inline">v_most_active_partners_3yr</span>, <span className="docs-code-inline">v_organisation_stats</span>).</td>
                    </tr>
                    <tr>
                      <td><strong>Deployment</strong></td>
                      <td>Railway Cloud / Docker Compose</td>
                      <td>Live Railway deployment with health probe (<span className="docs-code-inline">/health</span>), automatic restarts, and container networking.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Backend-For-Frontend (BFF) Pattern</h2>
              <p style={{ color: "var(--color-text-mid)", lineHeight: 1.6, fontSize: "14px" }}>
                The Next.js frontend implements a BFF proxy at <span className="docs-code-inline">/api/proxy/[...path]</span>. The browser client never touches raw JWT or refresh tokens; both are stored inside encrypted, <span className="docs-code-inline">httpOnly</span>, <span className="docs-code-inline">SameSite=Lax</span> cookies. When client fetch requests invoke <span className="docs-code-inline">request()</span>, Next.js server handlers read the cookie, attach the Bearer token, and seamlessly forward the request to the ASP.NET Core API at <span className="docs-code-inline">http://localhost:8080</span>.
              </p>
            </div>
          </div>
        )}

        {/* Section: Quickstart */}
        {selectedSection === "quickstart" && (
          <div>
            <p className="docs-lead-text">
              Launch the complete local development environment in minutes using Docker Compose or standalone dotnet/Next.js commands.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">1. Launch Docker Compose Stack</h2>
              <p style={{ color: "var(--color-text-mid)", fontSize: "14px" }}>
                Spins up MySQL 8.4 on port 3306, ASP.NET Core API on port 8080, and the Next.js frontend on port 3000:
              </p>
              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "var(--font-mono)" }}>Terminal (Repository Root)</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("docker compose up -d", "qs-docker")}>
                    {copiedId === "qs-docker" ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === "qs-docker" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">docker compose up -d</pre>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">2. Default Seeded Test Accounts</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Password</th>
                      <th>Role</th>
                      <th>Scope &amp; Permissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="docs-code-inline">admin@system.com</span></td>
                      <td><span className="docs-code-inline">Admin123!</span></td>
                      <td><span className="docs-role-badge">admin</span></td>
                      <td>Full system governance, user CRUD, audit logs, global organisations.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">organiser@qut.edu.au</span></td>
                      <td><span className="docs-code-inline">Organiser123!</span></td>
                      <td><span className="docs-role-badge">course_organiser</span></td>
                      <td>Faculty-scoped projects, applications, and partner management.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">manager@qut.edu.au</span></td>
                      <td><span className="docs-code-inline">Manager123!</span></td>
                      <td><span className="docs-role-badge">industry_team_manager</span></td>
                      <td>Industry relationship leadership, high-level reporting &amp; analytics.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">team@qut.edu.au</span></td>
                      <td><span className="docs-code-inline">Team123!</span></td>
                      <td><span className="docs-role-badge">industry_team</span></td>
                      <td>Day-to-day industry coordination and event management.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">partner@techcorp.com</span></td>
                      <td><span className="docs-code-inline">Partner123!</span></td>
                      <td><span className="docs-role-badge">industry_partner</span></td>
                      <td>Self-service access restricted exclusively to own organisation and projects.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Section: Security */}
        {selectedSection === "security" && (
          <div>
            <p className="docs-lead-text">
              PartnerForge enforces 5 distinct roles using asymmetric RSA cryptography (RS256) for JSON Web Tokens, single-use refresh token rotation, and strict policy authorization.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">5-Role Permission Matrix</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Entity / Route</th>
                      <th>admin</th>
                      <th>course_organiser</th>
                      <th>industry_team_manager</th>
                      <th>industry_team</th>
                      <th>industry_partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Organisations</strong></td>
                      <td>Global CRUD</td>
                      <td>Global View, Edit</td>
                      <td>Global CRUD</td>
                      <td>Global View, Edit</td>
                      <td>Own Org View/Edit</td>
                    </tr>
                    <tr>
                      <td><strong>Projects</strong></td>
                      <td>Global CRUD</td>
                      <td>Faculty View, Create</td>
                      <td>Global CRUD</td>
                      <td>Global View, Edit</td>
                      <td>Own Approved Only</td>
                    </tr>
                    <tr>
                      <td><strong>Project Applications</strong></td>
                      <td>Global Review</td>
                      <td>Faculty Review</td>
                      <td>Global Review</td>
                      <td>Global Review</td>
                      <td>Submit &amp; View Own</td>
                    </tr>
                    <tr>
                      <td><strong>Events &amp; RSVP</strong></td>
                      <td>Global CRUD</td>
                      <td>Faculty Scoped</td>
                      <td>Global CRUD</td>
                      <td>Global CRUD</td>
                      <td>Invited Events</td>
                    </tr>
                    <tr>
                      <td><strong>Analytics Portal</strong></td>
                      <td>Full Access</td>
                      <td>Full Access</td>
                      <td>Full Access</td>
                      <td>No Access</td>
                      <td>No Access</td>
                    </tr>
                    <tr>
                      <td><strong>User Management</strong></td>
                      <td>Full CRUD</td>
                      <td>No Access</td>
                      <td>No Access</td>
                      <td>No Access</td>
                      <td>No Access</td>
                    </tr>
                    <tr>
                      <td><strong>Audit Log</strong></td>
                      <td>Full Access</td>
                      <td>No Access</td>
                      <td>No Access</td>
                      <td>No Access</td>
                      <td>No Access</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Token Lifecycle &amp; Automatic Refresh</h2>
              <p style={{ color: "var(--color-text-mid)", lineHeight: 1.6, fontSize: "14px" }}>
                Access JWTs have an active lifespan of 15 minutes to 1 hour. Single-use refresh tokens have a 14-day lifetime. When an access token expires during an active session, the Next.js proxy catches HTTP 401, invokes <span className="docs-code-inline">POST /api/Auth/refresh</span> server-side, updates both httpOnly cookies, and transparently retries the user&apos;s original API call without interrupting their workflow.
              </p>
            </div>
          </div>
        )}

        {/* Section: Search DSL */}
        {selectedSection === "search-dsl" && (
          <div>
            <p className="docs-lead-text">
              The Dynamic Search system (<span className="docs-code-inline">POST /api/search/[entity]</span>) constructs type-safe Expression Trees on the backend with property whitelist validation.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Supported Comparison Operators</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Data Type</th>
                      <th>Behavior</th>
                      <th>Payload Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="docs-code-inline">equals</span></td>
                      <td>Text, Select, Number, Date</td>
                      <td>Exact match</td>
                      <td><span className="docs-code-inline">{`{"field":"state","operator":"equals","value":"QLD"}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">contains</span></td>
                      <td>Text</td>
                      <td>Case-insensitive substring</td>
                      <td><span className="docs-code-inline">{`{"field":"name","operator":"contains","value":"Tech"}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">greaterThan</span></td>
                      <td>Number, Date</td>
                      <td>Strictly greater / after date</td>
                      <td><span className="docs-code-inline">{`{"field":"year","operator":"greaterThan","value":"2024"}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">lessThan</span></td>
                      <td>Number, Date</td>
                      <td>Strictly less / before date</td>
                      <td><span className="docs-code-inline">{`{"field":"year","operator":"lessThan","value":"2027"}`}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Cross-Table Relationship Conditions</h2>
              <p style={{ color: "var(--color-text-mid)", fontSize: "14px" }}>
                Filter parent entities according to whether related records match criteria using <span className="docs-code-inline">quantifier: "any"</span> or <span className="docs-code-inline">"none"</span>:
              </p>
              <div className="docs-code-box">
                <pre className="docs-code-pre">{`{
  "filters": [
    { "field": "partnershipStatus", "operator": "equals", "value": "active" }
  ],
  "relatedFilters": [
    {
      "entity": "projects",
      "quantifier": "any",
      "filters": [{ "field": "year", "operator": "greaterThan", "value": "2024" }]
    }
  ],
  "page": 1,
  "pageSize": 25
}`}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Section: CSV Import & Export */}
        {selectedSection === "csv-import" && (
          <div>
            <p className="docs-lead-text">
              Bulk CSV Ingestion &amp; Export (<span className="docs-code-inline">/import-export</span>) supports dynamic column header auto-mapping, address normalization, simulation dry-runs, and instant template downloads.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Import &amp; Mapping Workflow</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Operation</th>
                      <th>Technical Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>1. Target Category</strong></td>
                      <td>Select Entity</td>
                      <td>Choose from Organisations, Projects, Events, or Contacts. Preloads schema validation rules.</td>
                    </tr>
                    <tr>
                      <td><strong>2. CSV Parsing</strong></td>
                      <td>Client-side PapaParse</td>
                      <td>Parses uploaded CSV files in-memory; strips BOM and normalizes whitespace.</td>
                    </tr>
                    <tr>
                      <td><strong>3. Smart Mapping</strong></td>
                      <td>Levenshtein Auto-Match</td>
                      <td><span className="docs-code-inline">suggestColumnMapping()</span> automatically maps variations (e.g. &quot;Org Name&quot; &rarr; <span className="docs-code-inline">name</span>).</td>
                    </tr>
                    <tr>
                      <td><strong>4. Address Parsing</strong></td>
                      <td>Regex Normalization</td>
                      <td>Single strings like &quot;123 Innovation Way, Brisbane QLD 4000&quot; are decomposed into street, city, state, and postcode.</td>
                    </tr>
                    <tr>
                      <td><strong>5. Ingestion</strong></td>
                      <td>Server Action</td>
                      <td><span className="docs-code-inline">uploadFileAction</span> streams validated payloads directly to the backend API with transactional rollback.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Section: Database */}
        {selectedSection === "database" && (
          <div>
            <p className="docs-lead-text">
              MySQL 8.4 schema architecture with foreign key constraints, analytical summary views, and self-contained database migration runbooks.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Analytical Views in Schema/schema.sql</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>View Name</th>
                      <th>Underlying Tables</th>
                      <th>Analytical Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="docs-code-inline">v_intake_summary</span></td>
                      <td>projects, faculties</td>
                      <td>Aggregates project counts grouped by year, semester, and faculty intake.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">v_most_active_partners_3yr</span></td>
                      <td>organisations, projects, industries</td>
                      <td>Ranks top industry partner organisations over rolling 36-month windows.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">v_organisation_stats</span></td>
                      <td>organisations, projects, contacts</td>
                      <td>Calculates active project counts and primary contact information per organisation.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Resetting Local Database</h2>
              <p style={{ color: "var(--color-text-mid)", fontSize: "14px" }}>
                To reset Docker Compose database volumes and reload clean schemas:
              </p>
              <div className="docs-code-box">
                <pre className="docs-code-pre">docker compose down -v &amp;&amp; docker compose up -d</pre>
              </div>
            </div>
          </div>
        )}

        {/* Section: Development */}
        {selectedSection === "development" && (
          <div>
            <p className="docs-lead-text">
              Local developer loop, test verification commands, and cloud deployment procedures.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Automated Verification Suite</h2>
              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "var(--font-mono)" }}>Frontend Tests &amp; Typecheck</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("cd frontend\nnpm test\nnpm run type-check", "dev-fe")}>
                    {copiedId === "dev-fe" ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === "dev-fe" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">{`cd frontend\nnpm test\nnpm run type-check`}</pre>
              </div>

              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "var(--font-mono)" }}>Backend Tests (.NET)</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("dotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj", "dev-be")}>
                    {copiedId === "dev-be" ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === "dev-be" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">dotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj</pre>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Railway Cloud Deployment URLs</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Environment</th>
                      <th>Live URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Frontend UI</strong></td>
                      <td>Production</td>
                      <td><a href="https://partnerforge-production.up.railway.app" target="_blank" rel="noreferrer" style={{ color: "var(--color-brand-primary)" }}>https://partnerforge-production.up.railway.app</a></td>
                    </tr>
                    <tr>
                      <td><strong>Backend API</strong></td>
                      <td>Production</td>
                      <td><a href="https://api-production-a804.up.railway.app" target="_blank" rel="noreferrer" style={{ color: "var(--color-brand-primary)" }}>https://api-production-a804.up.railway.app</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Section: Endpoint Details */}
        {filteredEndpoints.find((e) => e.id === selectedSection) && (
          (() => {
            const ep = filteredEndpoints.find((e) => e.id === selectedSection)!;
            const lang = getLang(ep.id);
            const snippet = ep.codeSnippets[lang];

            return (
              <div>
                <div className="docs-endpoint-header">
                  <span className={`method-badge ${ep.method.toLowerCase()}`}>
                    {ep.method}
                  </span>
                  <span className="docs-endpoint-path">{ep.path}</span>
                  {ep.roles.map((r) => (
                    <span key={r} className="docs-role-badge">
                      {r}
                    </span>
                  ))}
                </div>

                <p className="docs-lead-text">{ep.description}</p>

                {ep.requestBody && (
                  <div className="docs-card">
                    <h2 className="docs-card-title">Request Body (JSON)</h2>
                    <div className="docs-code-box">
                      <div className="docs-code-tabs">
                        <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "var(--font-mono)" }}>application/json</span>
                        <button className="docs-copy-btn" onClick={() => handleCopy(ep.requestBody!, `req-${ep.id}`)}>
                          {copiedId === `req-${ep.id}` ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === `req-${ep.id}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="docs-code-pre">{ep.requestBody}</pre>
                    </div>
                  </div>
                )}

                <div className="docs-card">
                  <h2 className="docs-card-title">Code Example</h2>
                  <div className="docs-code-box">
                    <div className="docs-code-tabs">
                      <div className="docs-tab-group">
                        <button
                          className={`docs-code-tab ${lang === "curl" ? "active" : ""}`}
                          onClick={() => setLang(ep.id, "curl")}
                        >
                          cURL
                        </button>
                        <button
                          className={`docs-code-tab ${lang === "ts" ? "active" : ""}`}
                          onClick={() => setLang(ep.id, "ts")}
                        >
                          TypeScript
                        </button>
                        <button
                          className={`docs-code-tab ${lang === "csharp" ? "active" : ""}`}
                          onClick={() => setLang(ep.id, "csharp")}
                        >
                          C# (.NET)
                        </button>
                        <button
                          className={`docs-code-tab ${lang === "python" ? "active" : ""}`}
                          onClick={() => setLang(ep.id, "python")}
                        >
                          Python
                        </button>
                      </div>
                      <button
                        className="docs-copy-btn"
                        onClick={() => handleCopy(snippet, `snip-${ep.id}`)}
                      >
                        {copiedId === `snip-${ep.id}` ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === `snip-${ep.id}` ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="docs-code-pre">{snippet}</pre>
                  </div>
                </div>

                {ep.responseBody && (
                  <div className="docs-card">
                    <h2 className="docs-card-title">Response Example (200 OK)</h2>
                    <div className="docs-code-box">
                      <div className="docs-code-tabs">
                        <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "var(--font-mono)" }}>application/json</span>
                        <button className="docs-copy-btn" onClick={() => handleCopy(ep.responseBody!, `res-${ep.id}`)}>
                          {copiedId === `res-${ep.id}` ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === `res-${ep.id}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="docs-code-pre">{ep.responseBody}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </main>
    </div>
  );
}

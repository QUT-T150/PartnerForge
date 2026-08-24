"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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

const ENDPOINTS: EndpointDoc[] = [
  // Auth
  {
    id: "auth-login",
    method: "POST",
    path: "/api/auth/login",
    category: "Authentication",
    title: "User Login",
    description: "Authenticates credentials and returns an RSA-signed JWT token with user profile and role claims.",
    roles: ["Public / Anonymous"],
    requestBody: JSON.stringify({ email: "admin@system.com", password: "YourPassword123!" }, null, 2),
    responseBody: JSON.stringify({
      token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      email: "admin@system.com",
      fullName: "System Administrator",
      role: "admin",
      facultyId: null,
      organisationId: null
    }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "http://localhost:5000/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@system.com","password":"YourPassword123!"}'`,
      ts: `const res = await fetch("http://localhost:5000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@system.com", password: "YourPassword123!" })
});
const data = await res.json();`,
      csharp: `var client = new HttpClient();
var payload = new { email = "admin@system.com", password = "YourPassword123!" };
var res = await client.PostAsJsonAsync("http://localhost:5000/api/auth/login", payload);
var data = await res.Content.ReadAsStringAsync();`,
      python: `import requests

res = requests.post(
    "http://localhost:5000/api/auth/login",
    json={"email": "admin@system.com", "password": "YourPassword123!"}
)
data = res.json()`
    }
  },
  {
    id: "auth-register",
    method: "POST",
    path: "/api/auth/register",
    category: "Authentication",
    title: "Register Staff User",
    description: "Creates a new course organiser, industry partner, or administrator account. Requires administrator privileges.",
    roles: ["admin"],
    requestBody: JSON.stringify({
      email: "lecturer@qut.edu.au",
      password: "InitialPassword123!",
      fullName: "Dr. Jane Smith",
      role: "course_organiser",
      facultyId: 1
    }, null, 2),
    responseBody: JSON.stringify({
      token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      email: "lecturer@qut.edu.au",
      fullName: "Dr. Jane Smith",
      role: "course_organiser",
      facultyId: 1,
      organisationId: null
    }, null, 2),
    codeSnippets: {
      curl: `curl -X POST "http://localhost:5000/api/auth/register" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"lecturer@qut.edu.au","password":"InitialPassword123!","fullName":"Dr. Jane Smith","role":"course_organiser","facultyId":1}'`,
      ts: `const res = await fetch("http://localhost:5000/api/auth/register", {
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
      csharp: `client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
var payload = new {
    email = "lecturer@qut.edu.au",
    password = "InitialPassword123!",
    fullName = "Dr. Jane Smith",
    role = "course_organiser",
    facultyId = 1
};
var res = await client.PostAsJsonAsync("http://localhost:5000/api/auth/register", payload);`,
      python: `headers = {"Authorization": f"Bearer {token}"}
payload = {
    "email": "lecturer@qut.edu.au",
    "password": "InitialPassword123!",
    "fullName": "Dr. Jane Smith",
    "role": "course_organiser",
    "facultyId": 1
}
res = requests.post("http://localhost:5000/api/auth/register", headers=headers, json=payload)`
    }
  },

  // Organisations
  {
    id: "orgs-list",
    method: "GET",
    path: "/api/organisations",
    category: "Organisations",
    title: "List Organisations",
    description: "Returns organisations accessible to the caller with optional substring search, partnership status, and industry filters.",
    roles: ["admin", "course_organiser", "industry_partner (own only)"],
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
      curl: `curl -X GET "http://localhost:5000/api/organisations?status=active" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("http://localhost:5000/api/organisations?status=active", {
  headers: { "Authorization": \`Bearer \${token}\` }
});
const data = await res.json();`,
      csharp: `client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
var res = await client.GetAsync("http://localhost:5000/api/organisations?status=active");
var data = await res.Content.ReadAsStringAsync();`,
      python: `headers = {"Authorization": f"Bearer {token}"}
res = requests.get("http://localhost:5000/api/organisations", headers=headers, params={"status": "active"})
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
    roles: ["admin", "course_organiser"],
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
      curl: `curl -X POST "http://localhost:5000/api/organisations" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"BioHealth Innovations","abn":"98765432109","partnershipStatus":"active","submissionStatus":"approved","industryId":3}'`,
      ts: `const res = await fetch("http://localhost:5000/api/organisations", {
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
var res = await client.PostAsJsonAsync("http://localhost:5000/api/organisations", payload);`,
      python: `payload = {
    "name": "BioHealth Innovations",
    "abn": "98765432109",
    "partnershipStatus": "active",
    "submissionStatus": "approved",
    "industryId": 3
}
res = requests.post("http://localhost:5000/api/organisations", headers=headers, json=payload)`
    }
  },

  // Projects
  {
    id: "projects-list",
    method: "GET",
    path: "/api/projects",
    category: "Projects",
    title: "List Projects",
    description: "Returns capstone projects visible to the caller with optional search, status, semester, year, and organisation filters.",
    roles: ["admin", "course_organiser", "industry_partner (own org only)"],
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
      curl: `curl -X GET "http://localhost:5000/api/projects?semester=1&year=2026" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("http://localhost:5000/api/projects?semester=1&year=2026", {
  headers: { "Authorization": \`Bearer \${token}\` }
});
const projects = await res.json();`,
      csharp: `var res = await client.GetAsync("http://localhost:5000/api/projects?semester=1&year=2026");
var data = await res.Content.ReadAsStringAsync();`,
      python: `res = requests.get(
    "http://localhost:5000/api/projects",
    headers=headers,
    params={"semester": "1", "year": 2026}
)`
    }
  },

  // Search DSL
  {
    id: "search-dynamic",
    method: "POST",
    path: "/api/search/{entity}",
    category: "Dynamic Search DSL",
    title: "Execute Dynamic Search Filter",
    description: "Performs expression-tree-based dynamic filtering and multi-column search on organisations, projects, or events.",
    roles: ["admin", "course_organiser", "industry_partner"],
    requestBody: JSON.stringify({
      filters: [
        { field: "partnership_status", operator: "eq", value: "active" },
        { field: "state", operator: "eq", value: "QLD" }
      ],
      relation_filters: [
        { relation: "projects", condition: "has_any" }
      ]
    }, null, 2),
    responseBody: JSON.stringify([
      {
        id: "7b13904e-28b9-4b35-8664-5858cfd79904",
        name: "TechCorp Australia",
        partnershipStatus: "active",
        state: "QLD",
        projectCount: 5
      }
    ], null, 2),
    codeSnippets: {
      curl: `curl -X POST "http://localhost:5000/api/search/organisations" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"filters":[{"field":"partnership_status","operator":"eq","value":"active"}],"relation_filters":[{"relation":"projects","condition":"has_any"}]}'`,
      ts: `const res = await fetch("http://localhost:5000/api/search/organisations", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${token}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    filters: [{ field: "partnership_status", operator: "eq", value: "active" }],
    relation_filters: [{ relation: "projects", condition: "has_any" }]
  })
});`,
      csharp: `var searchPayload = new {
    filters = new[] {
        new { field = "partnership_status", @operator = "eq", value = "active" }
    },
    relation_filters = new[] {
        new { relation = "projects", condition = "has_any" }
    }
};
var res = await client.PostAsJsonAsync("http://localhost:5000/api/search/organisations", searchPayload);`,
      python: `payload = {
    "filters": [{"field": "partnership_status", "operator": "eq", "value": "active"}],
    "relation_filters": [{"relation": "projects", "condition": "has_any"}]
}
res = requests.post("http://localhost:5000/api/search/organisations", headers=headers, json=payload)`
    }
  },

  // Audit Log
  {
    id: "audit-log",
    method: "GET",
    path: "/api/auditlog",
    category: "Audit Logs",
    title: "Browse Audit Log",
    description: "Returns paginated audit trail events recording INSERT, UPDATE, DELETE, and SOFT_DELETE operations across all database entities.",
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
          oldValues: "{\"partnership_status\":\"pending\"}",
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
      curl: `curl -X GET "http://localhost:5000/api/auditlog?tableName=organisations&page=1&pageSize=25" \\
  -H "Authorization: Bearer <TOKEN>"`,
      ts: `const res = await fetch("http://localhost:5000/api/auditlog?tableName=organisations&page=1&pageSize=25", {
  headers: { "Authorization": \`Bearer \${token}\` }
});
const auditLog = await res.json();`,
      csharp: `var res = await client.GetAsync("http://localhost:5000/api/auditlog?tableName=organisations&page=1&pageSize=25");
var logData = await res.Content.ReadAsStringAsync();`,
      python: `res = requests.get(
    "http://localhost:5000/api/auditlog",
    headers=headers,
    params={"tableName": "organisations", "page": 1, "pageSize": 25}
)`
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
      <aside className="docs-sidebar">
        <div className="docs-sidebar-header">
          <div className="docs-logo">PF</div>
          <div>
            <div className="docs-title">PartnerForge Docs</div>
            <div className="docs-subtitle">v2.0 Developer & API Guide</div>
          </div>
        </div>

        <div className="docs-search-container">
          <input
            type="text"
            className="docs-search-input"
            placeholder="Search API & Guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="docs-nav" aria-label="Documentation Navigation">
          <div className="docs-nav-group-title">Getting Started</div>
          <a
            className={`docs-nav-item ${selectedSection === "overview" ? "active" : ""}`}
            onClick={() => setSelectedSection("overview")}
          >
            <span>Overview & Architecture</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "quickstart" ? "active" : ""}`}
            onClick={() => setSelectedSection("quickstart")}
          >
            <span>Quickstart & Setup</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "security" ? "active" : ""}`}
            onClick={() => setSelectedSection("security")}
          >
            <span>Authentication & RBAC</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "search-dsl" ? "active" : ""}`}
            onClick={() => setSelectedSection("search-dsl")}
          >
            <span>Dynamic Search DSL</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "csv-import" ? "active" : ""}`}
            onClick={() => setSelectedSection("csv-import")}
          >
            <span>CSV Import & Mapping</span>
          </a>

          <div className="docs-nav-group-title" style={{ marginTop: 16 }}>
            API Reference
          </div>
          {filteredEndpoints.map((ep) => (
            <a
              key={ep.id}
              className={`docs-nav-item ${selectedSection === ep.id ? "active" : ""}`}
              onClick={() => setSelectedSection(ep.id)}
            >
              <span>{ep.title}</span>
              <span className={`docs-nav-badge ${ep.method.toLowerCase()}`}>
                {ep.method}
              </span>
            </a>
          ))}

          <div className="docs-nav-group-title" style={{ marginTop: 16 }}>
            Operations & Dev
          </div>
          <a
            className={`docs-nav-item ${selectedSection === "database" ? "active" : ""}`}
            onClick={() => setSelectedSection("database")}
          >
            <span>Database & Migrations</span>
          </a>
          <a
            className={`docs-nav-item ${selectedSection === "development" ? "active" : ""}`}
            onClick={() => setSelectedSection("development")}
          >
            <span>Local Development</span>
          </a>
        </nav>

        <div className="docs-sidebar-footer">
          <Link href="/dashboard" className="docs-back-link">
            &larr; Back to App Dashboard
          </Link>
          <a
            href="http://localhost:5000/swagger"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-back-link"
          >
            Interactive Swagger UI &rarr;
          </a>
        </div>
      </aside>

      {/* Content Area */}
      <main className="docs-content">
        <div className="docs-header-bar">
          <div>
            <div className="docs-section-tag">Developer Documentation</div>
            <h1 className="docs-main-heading">
              {selectedSection === "overview" && "Platform Overview & Architecture"}
              {selectedSection === "quickstart" && "Quickstart & Local Setup"}
              {selectedSection === "security" && "Authentication & Role-Based Access"}
              {selectedSection === "search-dsl" && "Dynamic Search Filter Specification"}
              {selectedSection === "csv-import" && "Bulk CSV Import & Column Mapping"}
              {selectedSection === "database" && "Database Schema & Migration Workflow"}
              {selectedSection === "development" && "Local Loop & Developer Runbook"}
              {filteredEndpoints.find((e) => e.id === selectedSection)?.title}
            </h1>
          </div>
        </div>

        {/* Section: Overview */}
        {selectedSection === "overview" && (
          <div>
            <p className="docs-lead-text">
              <strong>PartnerForge</strong> is QUT&apos;s industry engagement and capstone project coordination platform. It manages industry partner organisations, student project agreements, partner proposals, event RSVP attendances, dynamic search filtering, and immutable audit logs.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Technology Stack</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Layer</th>
                      <th>Technology</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Frontend</strong></td>
                      <td>Next.js 16 (React 19, TypeScript, Tailwind CSS, Turbopack)</td>
                      <td>App Router, SSR + Client interactive platform views, BFF API proxy with httpOnly cookies.</td>
                    </tr>
                    <tr>
                      <td><strong>Backend API</strong></td>
                      <td>ASP.NET Core 10 Web API (.NET 10, C#)</td>
                      <td>RESTful endpoints, EF Core with Pomelo MySQL provider, asymmetric RSA JWT token signing.</td>
                    </tr>
                    <tr>
                      <td><strong>Database</strong></td>
                      <td>MySQL 8.4 Server</td>
                      <td>Relational schema with foreign keys, UTF8MB4 collation, and analytical summary views.</td>
                    </tr>
                    <tr>
                      <td><strong>Containerisation</strong></td>
                      <td>Docker &amp; Docker Compose</td>
                      <td>Containerised local environment with live database volume and Adminer database management UI.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Backend-For-Frontend (BFF) Architecture</h2>
              <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                The Next.js frontend implements a BFF proxy at <span className="docs-code-inline">/api/proxy/[...path]</span>. The browser maintains a secure <span className="docs-code-inline">httpOnly</span> session cookie containing the RSA JWT. When the frontend makes client-side requests, the Next.js API route extracts the cookie, attaches the bearer token, and proxies the call to the ASP.NET Core API at <span className="docs-code-inline">http://localhost:5000</span>.
              </p>
            </div>
          </div>
        )}

        {/* Section: Quickstart */}
        {selectedSection === "quickstart" && (
          <div>
            <p className="docs-lead-text">
              Get PartnerForge running locally in under two minutes using Docker Compose.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">1. Launch Docker Infrastructure</h2>
              <p style={{ color: "#cbd5e1" }}>Start the MySQL database and Adminer database manager:</p>
              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>Terminal (Repository Root)</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("docker compose up -d", "qs-docker")}>
                    {copiedId === "qs-docker" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">docker compose up -d</pre>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">2. Launch Backend API</h2>
              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>Terminal (Backend)</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("dotnet run --project api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.csproj", "qs-api")}>
                    {copiedId === "qs-api" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">dotnet run --project api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.csproj</pre>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">3. Launch Frontend Web App</h2>
              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>Terminal (Frontend)</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("cd frontend\npnpm install\npnpm dev", "qs-fe")}>
                    {copiedId === "qs-fe" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">{`cd frontend\npnpm install\npnpm dev`}</pre>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Default Seeded Accounts</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Password</th>
                      <th>Role</th>
                      <th>Permissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="docs-code-inline">admin@system.com</span></td>
                      <td><span className="docs-code-inline">Admin123!</span></td>
                      <td><span className="docs-role-badge">admin</span></td>
                      <td>Full system access, user management, audit logs, global CRUD.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">organiser@qut.edu.au</span></td>
                      <td><span className="docs-code-inline">Organiser123!</span></td>
                      <td><span className="docs-role-badge">course_organiser</span></td>
                      <td>Faculty-scoped projects, applications, and organisation management.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">partner@techcorp.com</span></td>
                      <td><span className="docs-code-inline">Partner123!</span></td>
                      <td><span className="docs-role-badge">industry_partner</span></td>
                      <td>Read/write own organisation proposals and linked projects.</td>
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
              PartnerForge uses asymmetric RSA cryptography (RS256) for JSON Web Tokens and granular Role-Based Access Control.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Asymmetric JWT Architecture</h2>
              <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                Tokens are signed exclusively by <span className="docs-code-inline">AuthService</span> using a private RSA key. The ASP.NET Core API middleware validates tokens using the corresponding public key. Exposing the public key in configuration does not compromise token integrity because forging valid signatures requires the private key.
              </p>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Role Permission Matrix</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Entity / Feature</th>
                      <th>admin</th>
                      <th>course_organiser</th>
                      <th>industry_partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Organisations</strong></td>
                      <td>Global View, Create, Edit, Delete</td>
                      <td>Global View, Create, Edit</td>
                      <td>View / Edit Own Organisation Only</td>
                    </tr>
                    <tr>
                      <td><strong>Projects</strong></td>
                      <td>Global View, Create, Edit, Delete</td>
                      <td>Faculty Scoped View, Create, Edit</td>
                      <td>View Own Approved Projects Only</td>
                    </tr>
                    <tr>
                      <td><strong>Project Proposals</strong></td>
                      <td>Global View, Review, Approve</td>
                      <td>Faculty Scoped View, Review</td>
                      <td>Submit &amp; View Own Proposals</td>
                    </tr>
                    <tr>
                      <td><strong>Events &amp; RSVP</strong></td>
                      <td>Global View, Create, Edit, Delete</td>
                      <td>Faculty Scoped View, RSVP</td>
                      <td>View Invited Events Only</td>
                    </tr>
                    <tr>
                      <td><strong>User Management</strong></td>
                      <td>Full CRUD &amp; Password Reset</td>
                      <td>No Access</td>
                      <td>No Access</td>
                    </tr>
                    <tr>
                      <td><strong>Audit Trail Browser</strong></td>
                      <td>Full Global Audit Log View</td>
                      <td>No Access</td>
                      <td>No Access</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Section: Search DSL */}
        {selectedSection === "search-dsl" && (
          <div>
            <p className="docs-lead-text">
              The Dynamic Search system (<span className="docs-code-inline">POST /api/search/[entity]</span>) constructs type-safe Expression Trees on the backend with whitelist validation.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Supported Comparison Operators</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>C# Expression Equivalent</th>
                      <th>Example Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="docs-code-inline">eq</span></td>
                      <td><span className="docs-code-inline">property == value</span></td>
                      <td><span className="docs-code-inline">{`{"field": "state", "operator": "eq", "value": "QLD"}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">neq</span></td>
                      <td><span className="docs-code-inline">property != value</span></td>
                      <td><span className="docs-code-inline">{`{"field": "status", "operator": "neq", "value": "archived"}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">contains</span></td>
                      <td><span className="docs-code-inline">property.Contains(value)</span></td>
                      <td><span className="docs-code-inline">{`{"field": "name", "operator": "contains", "value": "Health"}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">starts_with</span></td>
                      <td><span className="docs-code-inline">property.StartsWith(value)</span></td>
                      <td><span className="docs-code-inline">{`{"field": "registration_id", "operator": "starts_with", "value": "ORG-"}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">gte / lte</span></td>
                      <td><span className="docs-code-inline">property &gt;= value</span></td>
                      <td><span className="docs-code-inline">{`{"field": "year", "operator": "gte", "value": 2026}`}</span></td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">is_null / is_not_null</span></td>
                      <td><span className="docs-code-inline">property == null</span></td>
                      <td><span className="docs-code-inline">{`{"field": "deleted_at", "operator": "is_null"}`}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Relationship Filters</h2>
              <p style={{ color: "#cbd5e1" }}>
                Allows querying parent entities based on the presence of related child entities:
              </p>
              <div className="docs-code-box">
                <pre className="docs-code-pre">{`{
  "filters": [
    { "field": "partnership_status", "operator": "eq", "value": "active" }
  ],
  "relation_filters": [
    { "relation": "projects", "condition": "has_any" }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Section: CSV Import */}
        {selectedSection === "csv-import" && (
          <div>
            <p className="docs-lead-text">
              Bulk CSV Import (<span className="docs-code-inline">/dashboard</span>) supports dynamic column header mapping, address splitting, and complete notes and contact persistence.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Import Workflow</h2>
              <ol style={{ color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 20 }}>
                <li><strong>1. Select Target Category:</strong> Industry Partners, Organisations, Projects, Events, Applications, or Users.</li>
                <li><strong>2. Upload CSV:</strong> Parsed client-side using PapaParse.</li>
                <li><strong>3. Column Mapping:</strong> Standard headers auto-match automatically; non-standard headers can be manually selected via interactive dropdowns.</li>
                <li><strong>4. Address Parsing:</strong> Single-line addresses (e.g. <em>&quot;123 Innovation Way, Brisbane QLD 4000&quot;</em>) are parsed into Address Line 1, Suburb/City, State, and Postcode.</li>
                <li><strong>5. Dry-Run &amp; Import:</strong> Simulation validates foreign keys and required columns before persisting records to MySQL.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Section: Database */}
        {selectedSection === "database" && (
          <div>
            <p className="docs-lead-text">
              Database schema documentation and workflow for writing, testing, and applying migrations.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Core Entities</h2>
              <div className="docs-table-wrapper">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Primary Key</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="docs-code-inline">organisations</span></td>
                      <td>UUID (<span className="docs-code-inline">char(36)</span>)</td>
                      <td>Industry partner companies, registration IDs, ABNs, and addresses.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">projects</span></td>
                      <td>UUID (<span className="docs-code-inline">char(36)</span>)</td>
                      <td>Approved capstone projects linked to an organisation.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">project_applications</span></td>
                      <td>UUID (<span className="docs-code-inline">char(36)</span>)</td>
                      <td>Proposed projects submitted by industry partners awaiting review.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">events</span></td>
                      <td>UUID (<span className="docs-code-inline">char(36)</span>)</td>
                      <td>Networking events and showcase dates.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">event_attendances</span></td>
                      <td>UUID (<span className="docs-code-inline">char(36)</span>)</td>
                      <td>RSVP responses linked to contacts and events.</td>
                    </tr>
                    <tr>
                      <td><span className="docs-code-inline">audit_logs</span></td>
                      <td>BIGINT Auto-Increment</td>
                      <td>Immutable audit records capturing user, action, timestamp, and JSON snapshots.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Applying Migrations</h2>
              <p style={{ color: "#cbd5e1" }}>To apply a new SQL migration script to a running container:</p>
              <div className="docs-code-box">
                <pre className="docs-code-pre">docker exec -i qpf-db mysql -u qpf -pqpf_dev_secret partnerforge &lt; Schema/migrations/your_migration.sql</pre>
              </div>
            </div>
          </div>
        )}

        {/* Section: Development */}
        {selectedSection === "development" && (
          <div>
            <p className="docs-lead-text">
              Local developer loop, test execution commands, and common troubleshooting tips.
            </p>

            <div className="docs-card">
              <h2 className="docs-card-title">Local Verification Commands</h2>
              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>Frontend Verification</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("cd frontend\npnpm test\npnpm run type-check\npnpm run build", "dev-fe")}>
                    {copiedId === "dev-fe" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">{`cd frontend\npnpm test\npnpm run type-check\npnpm run build`}</pre>
              </div>

              <div className="docs-code-box">
                <div className="docs-code-tabs">
                  <span style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>Backend Verification</span>
                  <button className="docs-copy-btn" onClick={() => handleCopy("dotnet build api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.csproj -warnAsError\ndotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj", "dev-be")}>
                    {copiedId === "dev-be" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="docs-code-pre">{`dotnet build api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.csproj -warnAsError\ndotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj`}</pre>
              </div>
            </div>

            <div className="docs-card">
              <h2 className="docs-card-title">Resetting Local Database</h2>
              <p style={{ color: "#cbd5e1" }}>If local MySQL data becomes out of sync with migrations:</p>
              <div className="docs-code-box">
                <pre className="docs-code-pre">docker compose down -v &amp;&amp; docker compose up -d</pre>
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
                        <span style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>application/json</span>
                        <button className="docs-copy-btn" onClick={() => handleCopy(ep.requestBody!, `req-${ep.id}`)}>
                          {copiedId === `req-${ep.id}` ? "Copied!" : "Copy"}
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
                        {copiedId === `snip-${ep.id}` ? "Copied!" : "Copy"}
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
                        <span style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>application/json</span>
                        <button className="docs-copy-btn" onClick={() => handleCopy(ep.responseBody!, `res-${ep.id}`)}>
                          {copiedId === `res-${ep.id}` ? "Copied!" : "Copy"}
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

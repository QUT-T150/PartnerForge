# Frontend Architecture & Next.js Design

This document details the architectural layout, authentication state handling, Backend-for-Frontend (BFF) proxy, and component structure of the PartnerForge Next.js application.

---

## 1. Application Structure

The frontend is built on **Next.js 16 (App Router)** with **React 19** and **TypeScript**.

```
frontend/
├── app/
│   ├── (authenticated)/            # Protected route group
│   │   ├── layout.tsx              # Authenticated shell layout (AuthContext + Header)
│   │   ├── dashboard/              # Analytics tiles, recent activity, CSV import
│   │   ├── platform/               # Entity directory (Organisations, Projects, Events, Applications)
│   │   └── audit-log/              # System audit trail browser (Admin only)
│   ├── api/
│   │   ├── auth/                   # Session management routes (login, logout, session)
│   │   └── proxy/[...path]/        # BFF API reverse proxy to ASP.NET Core API
│   ├── docs/                       # Web-based SaaS documentation portal
│   ├── login/                      # Public login view
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global CSS variables & Tailwind imports
├── components/
│   ├── Header.tsx                  # Global top navigation bar
│   ├── DataTable.tsx               # Sortable, searchable paginated entity table
│   ├── FilterBuilder.tsx           # Dynamic Expression Tree filter composer
│   └── RecordModal.tsx             # Universal create/edit record modal
├── lib/
│   ├── auth-context.tsx            # React authentication context & session hooks
│   ├── api.ts                      # BFF API client helpers
│   └── permissions.ts              # RBAC role helper functions (canCreate, canEdit, prettyRole)
└── helper/
    └── upload-core.ts              # CSV parsing, column mapping, and address splitting logic
```

---

## 2. Authentication & Session Flow

1. **User Authentication**:
   - User submits email and password on `/login`.
   - Next.js route `/api/auth/login` calls the ASP.NET Core API `POST /api/auth/login`.
   - The received RSA JWT token is saved into a secure `httpOnly`, `SameSite=Lax` cookie.
2. **BFF Proxy (`/api/proxy/[...path]`)**:
   - Client components make API calls to `/api/proxy/organisations`, `/api/proxy/projects`, etc.
   - The Next.js BFF proxy reads the token from the `httpOnly` cookie, sets `Authorization: Bearer <TOKEN>`, and forwards the request to `http://localhost:5000/api/...`.
   - Responses and error statuses are forwarded back to the browser.
3. **Session Verification**:
   - `AuthProvider` in `lib/auth-context.tsx` queries `/api/auth/session` on mount to populate the active user context (`email`, `fullName`, `role`, `facultyId`).

---

## 3. Core Components

### `FilterBuilder` (`components/FilterBuilder.tsx`)
Constructs dynamic filter payloads conforming to the Search DSL. It translates user-selected fields, operators, and values into the JSON contract consumed by `/api/search/[entity]`.

### `DataTable` (`components/DataTable.tsx`)
Generic tabular component supporting column sorting, custom renderers, empty states, and pagination.

### `RecordModal` (`components/RecordModal.tsx`)
Modal dialog dynamically rendering form field sets (text inputs, selects, textareas, date pickers) for creating and updating organisations, projects, applications, and events.

### `upload-core` (`helper/upload-core.ts`)
Client-side processing engine for bulk CSV uploads. Features:
- Automatic column matching for standard header names.
- Interactive user-driven mapping for custom CSV columns.
- Address normalization and splitting (`AddressLine1`, `City`, `State`, `Postcode`, `Country`).
- Dry-run validation and foreign key resolution.

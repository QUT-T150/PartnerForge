"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ClipboardList,
  Calendar,
  ArrowRight,
  ChevronRight,
  ArrowUpDown,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { request } from "@/lib/api";
import { type Role } from "@/lib/permissions";
import { canUseImportExport, IMPORT_EXPORT_HREF } from "@/lib/navigation";
import "./dashboard.css";

interface MetricCounts {
  partners: number | null;
  projects: number | null;
  events: number | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<MetricCounts>({
    partners: null,
    projects: null,
    events: null,
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      request<unknown[]>("/Organisations"),
      request<unknown[]>("/Projects"),
      request<unknown[]>("/Events"),
    ]).then(([orgs, projs, evts]) => {
      if (!active) return;
      setCounts({
        partners:
          orgs.status === "fulfilled" && Array.isArray(orgs.value)
            ? orgs.value.length
            : null,
        projects:
          projs.status === "fulfilled" && Array.isArray(projs.value)
            ? projs.value.length
            : null,
        events:
          evts.status === "fulfilled" && Array.isArray(evts.value)
            ? evts.value.length
            : null,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const role = user.role as Role;
  const firstName = user.fullName.split(" ")[0];

  const journeySteps = [
    {
      step: "01",
      title: "Organisations",
      count: counts.partners,
      countLabel: "Partners",
      desc: "Manage industry partners, company profiles, and engagement tiers.",
      href: "/platform?view=partners",
      Icon: Building2,
    },
    {
      step: "02",
      title: "Projects",
      count: counts.projects,
      countLabel: "Projects",
      desc: "Browse capstone briefs, team allocations, and project agreements.",
      href: "/platform?view=projects",
      Icon: ClipboardList,
    },
    {
      step: "03",
      title: "Events",
      count: counts.events,
      countLabel: "Events",
      desc: "Track industry showcases, capstone expos, and meeting history.",
      href: "/platform?view=events",
      Icon: Calendar,
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Page Header */}
        <header className="dashboard-header">
          <div className="category-label">PartnerForge // Overview</div>
          <h1 className="page-heading">Welcome back, {firstName}</h1>
          <p className="dashboard-subtitle">
            Industry engagement pipeline and partner records at a glance.
          </p>
        </header>

        {/* Section Label */}
        <div className="section-header-row">
          <span className="section-title">Engagement Pipeline</span>
          <span className="section-meta">Linear workflow</span>
        </div>

        {/* Pipeline Journey Cards */}
        <div className="journey-grid">
          {journeySteps.map((step, idx) => {
            const { Icon } = step;
            return (
              <div key={step.step} className="journey-card-wrapper">
                <Link href={step.href} className="journey-card">
                  <div className="card-top">
                    <div className="step-tag">{step.step}</div>
                    <div className="card-icon-wrap">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="card-metric">
                      <span className="metric-number">
                        {step.count !== null ? step.count : "—"}
                      </span>
                      <span className="metric-label">{step.countLabel}</span>
                    </div>
                    <h2 className="card-title">{step.title}</h2>
                    <p className="card-desc">{step.desc}</p>
                  </div>

                  <div className="card-footer">
                    <span>View {step.title}</span>
                    <ArrowRight size={14} className="card-arrow" />
                  </div>
                </Link>

                {idx < journeySteps.length - 1 && (
                  <div className="journey-connector" aria-hidden="true">
                    <ChevronRight size={18} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Action Strip */}
        {canUseImportExport(role) && (
          <div className="admin-strip">
            <div className="admin-strip-title">
              <span className="category-label">Quick Actions</span>
            </div>
            <div className="admin-actions-grid">
              <Link href={IMPORT_EXPORT_HREF} className="admin-action-item">
                <ArrowUpDown size={15} strokeWidth={1.8} />
                <span>Bulk CSV Import / Export</span>
              </Link>
              {role === "admin" && (
                <>
                  <Link href="/platform?view=users" className="admin-action-item">
                    <Users size={15} strokeWidth={1.8} />
                    <span>Manage Users & Roles</span>
                  </Link>
                  <Link href="/audit-log" className="admin-action-item">
                    <ShieldCheck size={15} strokeWidth={1.8} />
                    <span>System Audit Logs</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Building2,
  ClipboardList,
  Calendar,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { JOURNEY_STEPS, type JourneyStep } from "@/lib/navigation";
import "./dashboard.css";


const STEP_ICONS: Record<JourneyStep["key"], LucideIcon> = {
  partners: Building2,
  projects: ClipboardList,
  events: Calendar,
};

// Deliberately minimal (#63): the header nav already exposes every other tool by role,
// so the dashboard only offers the Partners -> Projects -> Events path.

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="welcome">
          <h2>Welcome back, {firstName}</h2>
          <p>
            Start with an industry partner, then follow it through to its
            projects and events.
          </p>
        </div>

        <nav className="journey" aria-label="Start here">
          {JOURNEY_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[step.key];
            return (
              <Fragment key={step.key}>
                {i > 0 && (
                  <ChevronRight className="journey-arrow" size={22} aria-hidden="true" />
                )}
                <Link href={step.href} className="tab-card">
                  <div className="tab-icon">
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <div className="tab-title">{step.title}</div>
                  <div className="tab-action">{step.action} &rarr;</div>
                </Link>
              </Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

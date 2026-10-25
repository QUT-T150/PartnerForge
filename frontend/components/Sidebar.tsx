"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Calendar,
  ArrowUpDown,
  BarChart3,
  Users,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPermissions, prettyRole, type Role } from "@/lib/permissions";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!user) return null;

  const currentView = searchParams.get("view") || "";
  const isOnDashboard = pathname === "/dashboard";
  const isOnPlatform = pathname === "/platform";
  const isOnAuditLog = pathname === "/audit-log";
  const isOnImportExport = pathname === "/import-export";
  const isOnAnalytics = pathname === "/analytics";

  function isActive(target: string): boolean {
    if (target === "/dashboard") return isOnDashboard;
    if (target === "/audit-log") return isOnAuditLog;
    if (target === "/import-export") return isOnImportExport;
    if (target === "/analytics") return isOnAnalytics;
    if (isOnPlatform && currentView === target) return true;
    return false;
  }

  const rolePretty = prettyRole(user.role);
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={styles.sidebar} aria-label="Main Navigation">
      {/* Brand Header */}
      <Link href="/dashboard" className={styles.brand}>
        <div className={styles.logoWrap}>
          <Image src="/qut-logo.svg" alt="QUT logo" width={20} height={20} />
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandTitle}>PartnerForge</span>
          <span className={styles.brandTagline}>QUT Industry Relations</span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className={styles.navSection}>
        <div className={styles.navHeading}>Platform</div>

        <Link
          href="/dashboard"
          className={`${styles.navItem} ${
            isActive("/dashboard") ? styles.navItemActive : ""
          }`}
        >
          <LayoutDashboard className={styles.navIcon} size={16} strokeWidth={1.8} />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/platform?view=partners"
          className={`${styles.navItem} ${
            isActive("partners") ? styles.navItemActive : ""
          }`}
        >
          <Building2 className={styles.navIcon} size={16} strokeWidth={1.8} />
          <span>Organisations</span>
        </Link>

        <Link
          href="/platform?view=projects"
          className={`${styles.navItem} ${
            isActive("projects") ? styles.navItemActive : ""
          }`}
        >
          <ClipboardList className={styles.navIcon} size={16} strokeWidth={1.8} />
          <span>Projects</span>
        </Link>

        <Link
          href="/platform?view=events"
          className={`${styles.navItem} ${
            isActive("events") ? styles.navItemActive : ""
          }`}
        >
          <Calendar className={styles.navIcon} size={16} strokeWidth={1.8} />
          <span>Events</span>
        </Link>

        {getPermissions(user.role as Role).analytics !== "no" && (
          <Link
            href="/analytics"
            className={`${styles.navItem} ${
              isActive("/analytics") ? styles.navItemActive : ""
            }`}
          >
            <BarChart3 className={styles.navIcon} size={16} strokeWidth={1.8} />
            <span>Analytics</span>
          </Link>
        )}

        {getPermissions(user.role as Role).upload !== "no" && (
          <Link
            href="/import-export"
            className={`${styles.navItem} ${
              isActive("/import-export") ? styles.navItemActive : ""
            }`}
          >
            <ArrowUpDown className={styles.navIcon} size={16} strokeWidth={1.8} />
            <span>Import / Export</span>
          </Link>
        )}

        {user.role === "admin" && (
          <>
            <div className={styles.navHeading} style={{ marginTop: 12 }}>
              Administration
            </div>
            <Link
              href="/platform?view=users"
              className={`${styles.navItem} ${
                isActive("users") ? styles.navItemActive : ""
              }`}
            >
              <Users className={styles.navIcon} size={16} strokeWidth={1.8} />
              <span>Users</span>
            </Link>

            <Link
              href="/audit-log"
              className={`${styles.navItem} ${
                isActive("/audit-log") ? styles.navItemActive : ""
              }`}
            >
              <ShieldCheck className={styles.navIcon} size={16} strokeWidth={1.8} />
              <span>Audit Log</span>
            </Link>
          </>
        )}
      </nav>

      {/* Modern Profile & Sign Out Footer */}
      <div className={styles.footer}>
        <div className={styles.profileRow}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileMeta}>
            <span className={styles.userName} title={user.fullName}>
              {user.fullName}
            </span>
            <span className={styles.roleBadge}>{rolePretty}</span>
          </div>
          <button
            className={styles.signOutBtn}
            onClick={logout}
            type="button"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}

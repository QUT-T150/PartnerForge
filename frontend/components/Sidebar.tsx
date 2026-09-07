"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { prettyRole } from "@/lib/permissions";
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

  function isActive(target: string): boolean {
    if (target === "/dashboard") return isOnDashboard;
    if (target === "/audit-log") return isOnAuditLog;
    if (target === "import_export") return isOnDashboard && typeof window !== "undefined" && window.location.hash === "#upload-section";
    if (isOnPlatform && currentView === target) return true;
    return false;
  }

  const rolePretty = prettyRole(user.role);

  return (
    <aside className={styles.sidebar} aria-label="Main Sidebar Navigation">
      {/* Brand Header */}
      <Link href="/dashboard" className={styles.brand}>
        <div className={styles.logoWrap}>
          <Image src="/qut-logo.svg" alt="QUT logo" width={22} height={22} />
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandTitle}>PARTNERFORGE</span>
          <span className={styles.brandTagline}>Industry Relations</span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className={styles.navSection}>
        <div className={styles.navHeading}>Platform</div>
        
        <Link
          href="/dashboard"
          className={`${styles.navItem} ${isActive("/dashboard") ? styles.navItemActive : ""}`}
        >
          <span className={styles.navIcon}>▤</span>
          <span>Dashboard</span>
        </Link>

        <Link
          href="/platform?view=partners"
          className={`${styles.navItem} ${isActive("partners") ? styles.navItemActive : ""}`}
        >
          <span className={styles.navIcon}>🏢</span>
          <span>Organisations</span>
        </Link>

        <Link
          href="/platform?view=projects"
          className={`${styles.navItem} ${isActive("projects") ? styles.navItemActive : ""}`}
        >
          <span className={styles.navIcon}>📋</span>
          <span>Projects</span>
        </Link>

        <Link
          href="/platform?view=events"
          className={`${styles.navItem} ${isActive("events") ? styles.navItemActive : ""}`}
        >
          <span className={styles.navIcon}>📅</span>
          <span>Events</span>
        </Link>

        {user.role === "admin" && (
          <Link
            href="/dashboard#upload-section"
            className={`${styles.navItem} ${isActive("import_export") ? styles.navItemActive : ""}`}
          >
            <span className={styles.navIcon}>⇅</span>
            <span>Import / Export</span>
          </Link>
        )}

        {user.role === "admin" && (
          <>
            <div className={styles.navHeading} style={{ marginTop: 8 }}>Admin</div>
            <Link
              href="/platform?view=users"
              className={`${styles.navItem} ${isActive("users") ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIcon}>👥</span>
              <span>Users</span>
            </Link>

            <Link
              href="/audit-log"
              className={`${styles.navItem} ${isActive("/audit-log") ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIcon}>🛡</span>
              <span>Audit Log</span>
            </Link>
          </>
        )}
      </nav>

      {/* Status & User Footer */}
      <div className={styles.footer}>
        <div className={styles.statusIndicator}>
          <span className={styles.statusDot} />
          <span>Connected</span>
        </div>

        <div className={styles.userInfo}>
          <span className={styles.userName} title={user.fullName}>
            {user.fullName}
          </span>
          <span className={styles.userEmail} title={user.email}>
            {user.email}
          </span>
          <span className={styles.roleBadge}>{rolePretty}</span>
        </div>

        <button className={styles.signOutBtn} onClick={logout} type="button">
          Sign out
        </button>
      </div>
    </aside>
  );
}

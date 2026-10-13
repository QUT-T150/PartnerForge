"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "./login.css";

const TEST_ACCOUNTS = [
  { label: "Admin", email: "admin@system.com", password: "Admin123!" },
  { label: "Staff", email: "staff@system.com", password: "Staff123!" },
  { label: "Faculty", email: "faculty@system.com", password: "Faculty123!" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data: { fullName?: string; error?: string } | null = null;
      const isJson = res.headers.get("content-type")?.includes("application/json");

      if (isJson) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const errorText =
          data?.error ||
          (res.status === 404
            ? "Authentication endpoint not found. Please verify the server is running on the correct port."
            : res.status === 502 || res.status === 503
            ? "Backend API service is unavailable. Please verify the backend API is online."
            : `Login failed (HTTP ${res.status}).`);
        throw new Error(errorText);
      }

      if (!data) {
        throw new Error("Invalid response received from authentication service.");
      }

      setMessage({
        type: "success",
        text: `Welcome, ${data.fullName || "User"}. Redirecting...`,
      });

      setTimeout(() => router.push("/dashboard"), 600);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign in.";
      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function autofill(account: (typeof TEST_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <Image
            src="/qut-logo.svg"
            alt="QUT logo"
            className="brand-logo"
            width={48}
            height={48}
          />
          <div className="category-label">PARTNERFORGE — AUTHENTICATION</div>
          <h1>Industry Relations Database</h1>
          <p className="subtitle">Sign in to access your platform workspace</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="staff@qut.edu.au"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="options-row">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-link">
              Forgot password?
            </a>
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>

          {message && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}
        </form>

        <div className="demo-pills-wrap">
          <span className="demo-label">Demo Quick-Fill</span>
          <div className="demo-pills">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="demo-pill"
                onClick={() => autofill(account)}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        <p className="footer">
          QUT Professional Services &middot; IFB398 Capstone
        </p>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";

function LoadingSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-canvas, #F7F7F5)",
      }}
    >
      {/* Sidebar Skeleton */}
      <div
        style={{
          width: 220,
          minWidth: 220,
          background: "var(--color-sidebar, #001C3D)",
          display: "flex",
          flexDirection: "column",
          padding: "22px 18px",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                width: 90,
                height: 12,
                borderRadius: 2,
                background: "rgba(255,255,255,0.15)",
              }}
            />
            <div
              style={{
                width: 60,
                height: 8,
                borderRadius: 2,
                background: "rgba(255,255,255,0.08)",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: "100%",
                height: 28,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content Area Skeleton */}
      <div
        style={{
          flex: 1,
          padding: "36px 40px",
          maxWidth: 1280,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 4,
            padding: 24,
            marginBottom: 20,
            border: "1px solid #E8E8E5",
          }}
        >
          <div
            style={{
              width: 220,
              height: 20,
              borderRadius: 2,
              background: "#E8E8E5",
              marginBottom: 8,
            }}
          />
          <div
            style={{
              width: 340,
              height: 12,
              borderRadius: 2,
              background: "#F5F5F3",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: "#FFFFFF",
                borderRadius: 4,
                padding: "22px 24px",
                border: "1px solid #E8E8E5",
                height: 110,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 10,
                  borderRadius: 2,
                  background: "#F5F5F3",
                  marginBottom: 12,
                }}
              />
              <div
                style={{
                  width: 120,
                  height: 26,
                  borderRadius: 2,
                  background: "#E8E8E5",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingSkeleton />;
  }

  return <>{children}</>;
}

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGate>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            background: "var(--color-canvas, #F7F7F5)",
          }}
        >
          <Suspense>
            <Sidebar />
          </Suspense>
          <main
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
              padding: "36px 40px",
            }}
          >
            {children}
          </main>
        </div>
      </AuthGate>
    </AuthProvider>
  );
}

"use client";

import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <main style={{ padding: "2rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1>LawBrokr Partners Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {user ? <span>{user.firstName} {user.lastName}</span> : null}
          <button
            onClick={() => {
              void logout();
            }}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              borderRadius: "4px",
              border: "1px solid #ccc",
              background: "transparent",
              color: "inherit",
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <p>Welcome to the LawBrokr Partners dashboard.</p>
    </main>
  );
}

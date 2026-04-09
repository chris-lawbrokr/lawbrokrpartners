"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

interface PartnerUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  website: string;
  status: string;
  is_admin: boolean;
  created_at: string;
  invite_token: string | null;
}

export default function Home() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = (await res.json()) as PartnerUser[];
      setUsers(data);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function getInviteLink(token: string): string {
    return `${window.location.origin}/invite/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getInviteLink(token));
    setCopiedToken(token);
    setTimeout(() => { setCopiedToken(null); }, 2000);
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
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
            onClick={() => { void logout(); }}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>Partners</h2>
        <button
          onClick={() => { setShowModal(true); }}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Create Partner
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "0.75rem 0.5rem" }}>Name</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Email</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Website</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Status</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Created</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Invite</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "1.5rem 0.5rem", textAlign: "center", color: "#9ca3af" }}>
                  No partners yet. Create one to get started.
                </td>
              </tr>
            ) : null}
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  {u.first_name || u.last_name
                    ? `${u.first_name} ${u.last_name}`.trim()
                    : <span style={{ color: "#9ca3af" }}>-</span>}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  {u.email || <span style={{ color: "#9ca3af" }}>-</span>}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  {u.website ? (
                    <a href={u.website} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                      {u.website}
                    </a>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>-</span>
                  )}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: u.status === "active" ? "#dcfce7" : "#fef9c3",
                      color: u.status === "active" ? "#166534" : "#854d0e",
                    }}
                  >
                    {u.status === "active" ? "Active" : "Pending"}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 0.5rem", color: "#6b7280" }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  {u.invite_token && u.status === "pending" ? (
                    <button
                      onClick={() => { void copyLink(u.invite_token ?? ""); }}
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        color: "inherit",
                      }}
                    >
                      {copiedToken === u.invite_token ? "Copied!" : "Copy Link"}
                    </button>
                  ) : u.status === "active" ? (
                    <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>Used</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <CreatePartnerModal
          onClose={() => { setShowModal(false); }}
          onCreated={() => { void loadData(); }}
        />
      ) : null}
    </main>
  );
}

function CreatePartnerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          website: website || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Failed to create partner");
      }

      const data = (await res.json()) as { inviteToken: string };
      setInviteLink(`${window.location.origin}/invite/${data.inviteToken}`);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 2000);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 50,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: "8px", padding: "2rem", width: "100%", maxWidth: "450px" }}>
        {inviteLink ? (
          <>
            <h2 style={{ marginBottom: "1rem" }}>Invite Link Created</h2>
            <p style={{ marginBottom: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
              Send this link to the partner. It can only be used once.
            </p>
            <div
              style={{
                padding: "0.75rem",
                background: "#f3f4f6",
                borderRadius: "4px",
                fontSize: "0.8rem",
                wordBreak: "break-all",
                marginBottom: "1rem",
              }}
            >
              {inviteLink}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => { void copyLink(); }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "inherit",
                }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: "0.5rem" }}>Create Partner</h2>
            <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
              Optionally pre-fill partner details for reference. The partner can update these when they sign up.
            </p>

            {error ? (
              <div style={{ padding: "0.75rem", borderRadius: "4px", background: "#fee2e2", color: "#dc2626", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {error}
              </div>
            ) : null}

            <form
              onSubmit={(e) => { void handleSubmit(e); }}
              style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                  First Name
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); }}
                    placeholder="Optional"
                    style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                  Last Name
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); }}
                    placeholder="Optional"
                    style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
                  />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); }}
                  placeholder="Optional"
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                Website
                <input
                  type="url"
                  value={website}
                  onChange={(e) => { setWebsite(e.target.value); }}
                  placeholder="Optional"
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
                />
              </label>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "4px",
                    border: "none",
                    background: "#2563eb",
                    color: "#fff",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    fontSize: "0.875rem",
                  }}
                >
                  {submitting ? "Creating..." : "Generate Invite Link"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

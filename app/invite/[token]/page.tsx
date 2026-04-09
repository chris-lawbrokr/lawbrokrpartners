"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface InviteInfo {
  firstName: string;
  lastName: string;
  email: string;
  website: string;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invite/${params.token}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message ?? "Invalid or expired invite link");
        return;
      }
      const data = (await res.json()) as InviteInfo;
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setEmail(data.email);
      setWebsite(data.website);
      setLoaded(true);
    }
    void load();
  }, [params.token]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invite/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, website, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Something went wrong");
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "2rem" }}>
          <h1 style={{ marginBottom: "1rem" }}>Account Created</h1>
          <p style={{ marginBottom: "1.5rem" }}>
            Your account has been set up. You can now sign in.
          </p>
          <button
            onClick={() => { router.push("/login"); }}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "4px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  if (error && !loaded) {
    return (
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "2rem" }}>
          <h1 style={{ marginBottom: "1rem" }}>Invite Link</h1>
          <div style={{ padding: "0.75rem", borderRadius: "4px", background: "#fee2e2", color: "#dc2626", fontSize: "0.875rem" }}>
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!loaded) {
    return (
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "450px", padding: "2rem" }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Join LawBrokr Partners</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "0.5rem" }}>
          Fill in your details to create your partner account.
        </p>

        {error ? (
          <div style={{ padding: "0.75rem", borderRadius: "4px", background: "#fee2e2", color: "#dc2626", fontSize: "0.875rem" }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
            First Name
            <input
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); }}
              required
              style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
            Last Name
            <input
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); }}
              required
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
            required
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Website
          <input
            type="url"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); }}
            placeholder="https://..."
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            required
            minLength={8}
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          Confirm Password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); }}
            required
            minLength={8}
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem" }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "0.75rem",
            borderRadius: "4px",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontSize: "1rem",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invite/${params.token}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
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

    if (!agreeTerms) {
      setError("You must agree to the terms & conditions");
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
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
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
      <div>
        <h1>Account Created</h1>
        <p>Your account has been set up. You can now sign in.</p>
        <button
          onClick={() => {
            router.push("/login");
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (error && !loaded) {
    return (
      <div>
        <h1>Invite Link</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!loaded) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <div className="border-4 h-screen w-screen p-8 flex items-center justify-center">
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex flex-col max-w-xl mx-auto border-4 p-8"
        >
          <h1>Sign Up</h1>
          {error ? <p className="error">{error}</p> : null}
          <label>
            First Name *
            <input
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
              }}
              required
              placeholder="John"
            />
          </label>

          <label>
            Last Name
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
              }}
              placeholder="Doe"
            />
          </label>

          <label>
            Email *
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
              placeholder="Enter your email"
            />
          </label>

          <label>
            Password *
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              minLength={8}
              placeholder="Enter your password"
            />
          </label>

          <label>
            Website
            <input
              type="url"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
              }}
              placeholder="https://example.com"
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
              }}
            />
            I agree to Lawbrokr&apos;s affiliate terms &amp; conditions *
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Sign Up"}
          </button>

          <p>
            Already have an account? <Link href="/login">Sign In</Link>
          </p>
        </form>
      </div>
    </>
  );
}

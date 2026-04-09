"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="flex w-full max-w-[400px] flex-col gap-4 p-8"
      >
        <h1 className="mb-4 text-center text-2xl font-bold">
          LawBrokr Partners
        </h1>

        {error ? (
          <div className="rounded bg-red-100 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <label className="flex flex-col gap-1">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            required
            className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            required
            className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded bg-brand-gray-600 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

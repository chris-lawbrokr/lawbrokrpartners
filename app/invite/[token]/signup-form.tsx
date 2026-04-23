"use client";

import { useState } from "react";
import Link from "next/link";

interface SignupFormProps {
  token: string;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  initialWebsite: string;
  onSuccess: () => void;
}

export default function SignupForm({
  token,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialWebsite,
  onSuccess,
}: SignupFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [website, setWebsite] = useState(initialWebsite);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, {
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

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-10"
    >
      <h1 className="mb-6 text-center text-3xl font-bold text-brand-gray-600">
        Sign Up
      </h1>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {/* Name row */}
      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-bold text-brand-gray-600">
            First Name <span className="text-brand-gray-600">*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
            }}
            required
            placeholder="John"
            className="w-full rounded-lg bg-brand-gray-50 px-4 py-3 text-sm text-brand-gray-600 placeholder-brand-gray-200 outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-bold text-brand-gray-600">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
            }}
            placeholder="Doe"
            className="w-full rounded-lg bg-brand-gray-50 px-4 py-3 text-sm text-brand-gray-600 placeholder-brand-gray-200 outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-bold text-brand-gray-600">
          Email <span className="text-brand-gray-600">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          required
          placeholder="Enter your email"
          className="w-full rounded-lg bg-brand-gray-50 px-4 py-3 text-sm text-brand-gray-600 placeholder-brand-gray-200 outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {/* Password */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-bold text-brand-gray-600">
          Password <span className="text-brand-gray-600">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          required
          minLength={8}
          placeholder="Enter your password"
          className="w-full rounded-lg bg-brand-gray-50 px-4 py-3 text-sm text-brand-gray-600 placeholder-brand-gray-200 outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {/* Confirm Password */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-bold text-brand-gray-600">
          Confirm Password <span className="text-brand-gray-600">*</span>
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
          }}
          required
          minLength={8}
          placeholder="Confirm your password"
          className="w-full rounded-lg bg-brand-gray-50 px-4 py-3 text-sm text-brand-gray-600 placeholder-brand-gray-200 outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {/* Website */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-bold text-brand-gray-600">
          Website
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
          }}
          placeholder="https://example.com"
          className="w-full rounded-lg bg-brand-gray-50 px-4 py-3 text-sm text-brand-gray-600 placeholder-brand-gray-200 outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {/* Terms checkbox */}
      <label className="mb-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => {
            setAgreeTerms(e.target.checked);
          }}
          className="mt-1 h-4 w-4 rounded border-gray-300 accent-purple-400"
        />
        <span className="text-sm text-brand-gray-400">
          I agree to Lawbrokr&apos;s{" "}
          <span className="text-purple-400">
            affiliate terms &amp; conditions
          </span>{" "}
          *
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full cursor-pointer rounded-lg bg-purple-600 py-3.5 text-base font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Creating account..." : "Sign Up"}
      </button>

      <p className="mt-4 text-center text-sm text-brand-gray-300">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-purple-400 underline">
          Sign In
        </Link>
      </p>
    </form>
  );
}

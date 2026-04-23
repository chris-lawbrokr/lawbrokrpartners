"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
        500
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-brand-gray-600 sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-base text-brand-gray-400">
        An unexpected error occurred. Please try again.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
          }}
          className="inline-flex items-center rounded-lg bg-purple-400 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-brand-gray-100 px-5 py-2.5 text-sm font-medium text-brand-gray-500 transition hover:bg-brand-gray-50"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

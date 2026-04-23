"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
            Error
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-brand-gray-600 sm:text-4xl">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-base text-brand-gray-400">
            A critical error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
            }}
            className="mt-8 inline-flex items-center rounded-lg bg-purple-400 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

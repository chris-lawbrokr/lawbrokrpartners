import { NextResponse } from "next/server";

/**
 * Wraps an API route handler so that any uncaught error (including Neon DB
 * failures and malformed JSON bodies) is converted to a proper HTTP response
 * instead of a raw 500 HTML page.
 */
export function withApi<TArgs extends readonly unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API error:", error);

      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { message: "Invalid request body" },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

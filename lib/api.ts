const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

let getAccessToken: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null): void {
  getAccessToken = getter;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getAccessToken?.();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  return response;
}

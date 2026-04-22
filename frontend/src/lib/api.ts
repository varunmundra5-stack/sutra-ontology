// Empty-string base → Vite proxy handles routing (dev); set VITE_API_URL for production
const BASE = (import.meta.env.VITE_API_URL as string) || "";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function getToken(): string | null {
  return localStorage.getItem("sutra_token");
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const tok = getToken();
  if (tok) headers.set("Authorization", `Bearer ${tok}`);

  const r = await fetch(`${BASE}${path}`, { ...init, headers });
  const ct = r.headers.get("content-type") ?? "";
  const body = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) {
    const msg =
      (body && typeof body === "object" && "detail" in body && String((body as any).detail)) ||
      r.statusText;
    throw new ApiError(r.status, body, msg);
  }
  return body as T;
}

export const API_BASE = BASE;

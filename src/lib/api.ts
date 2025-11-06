// lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// --- Core fetch with cookie support + 401 -> refresh retry once ---
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _triedRefresh = false
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include", // ✅ send cookies for /auth/me, /auth/refresh, etc.
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.ok) {
    // If there's no content, avoid throwing on empty body
    const text = await res.text();
    return (text ? JSON.parse(text) : ({} as T)) as T;
  }

  // If unauthorized and we didn't try refreshing yet AND request isn't using explicit Bearer header
  const hasExplicitBearer =
    !!(options.headers as Record<string, string> | undefined)?.Authorization;

  if (res.status === 401 && !_triedRefresh && !hasExplicitBearer) {
    try {
      // attempt refresh
      await refreshSession();
      // retry original request once
      return apiFetch<T>(path, options, true);
    } catch {
      // fall through to throw the original error
    }
  }

  const errorText = await res.text().catch(() => "");
  throw new Error(errorText || res.statusText || "Request failed");
}

// ---------- Types ----------
export interface BackendClient {
  id: number;
  name: string;
  email: string;
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  login_customer_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BackendCampaign {
  id: number;
  name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  client_id: number;
}

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string; // ✅ now included
  token_type: string;
  user: BackendUser;
}

// ---------- Auth API ----------
export function login(credentials: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// Use this in components instead of fetching an auth_url
// (your backend /auth/google-connect will 302 to Google and set state cookie)
export function startGoogleOAuth() {
  window.location.assign(`${API_BASE_URL}/auth/google-connect`);
}

// Who am I (reads cookie on server)
export function me() {
  return apiFetch<{ id: number | string; name?: string; email: string; role?: string; google?: any }>(
    "/auth/me",
    { method: "GET" }
  );
}

// Manually trigger refresh (usually not needed; apiFetch auto-refreshes once on 401)
export function refreshSession() {
  return apiFetch<{ access_token: string; token_type: string }>("/auth/refresh", {
    method: "POST",
  });
}

// ---------- Data API (optional token header still supported) ----------
export function fetchClients(token?: string) {
  return apiFetch<BackendClient[]>("/clients/all", token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined);
}

export function fetchCampaigns(token?: string) {
  return apiFetch<BackendCampaign[]>("/campaigns", token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined);
}

export function fetchUsers(token?: string) {
  return apiFetch<BackendUser[]>("/users", token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined);
}

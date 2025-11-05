const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || response.statusText || "Request failed");
  }

  return response.json() as Promise<T>;
}

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
  token_type: string;
  user: BackendUser;
}

export function login(credentials: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function requestGoogleOAuthUrl() {
  return apiFetch<{ auth_url: string }>("/auth/google-connect");
}

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

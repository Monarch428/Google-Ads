// lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://google-ads-backend-ofxo.onrender.com";

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

// --- Core fetch with cookie support + 401 -> refresh retry once ---
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _triedRefresh = false
): Promise<T> {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...normalizeHeaders(options.headers),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include", // ✅ send cookies for /auth/me, /auth/refresh, etc.
    headers: mergedHeaders,
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
  created_by_id?: number | null;
  assigned_manager_id?: number | null;
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
  company_name?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
  company_website?: string | null;
  company_address?: string | null;
  assigned_client_ids?: number[] | null;
}

export type BackendRecommendationStatus =
  | "PENDING"
  | "APPROVED"
  | "MODIFIED"
  | "DISMISSED"
  | "EXECUTED";

export type BackendRecommendationPriority = "HIGH" | "MEDIUM" | "LOW";

export interface BackendRecommendation {
  id: number;
  client_id: number | null;
  campaign_name: string | null;
  suggestion: string | null;
  data_snapshot: string | null;
  predicted_impact: number | null;
  action_proposal: string | null;
  priority: BackendRecommendationPriority | null;
  status: BackendRecommendationStatus | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ChatbotReply {
  status: string;
  reply: string;
}

export interface OptimizationRequest {
  campaign_name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  conversions: number;
  budget: number;
}

export interface OptimizationResponse {
  status: string;
  campaign_name: string;
  suggestions: string;
}

export interface InsightResponse {
  summary: string;
  recommendations?: string[];
  [key: string]: unknown;
}

export interface SystemStatusResponse {
  database: string;
  last_sync: string;
  scheduler_jobs: string[];
  system_uptime: string;
  cpu_usage: string;
  memory_usage: string;
  log_files: string[];
  error_logs: string[];
  server_time: string;
  status: string;
}

export type CreateClientPayload = Omit<
  BackendClient,
  "id" | "created_at" | "updated_at" | "created_by_id"
>;

export interface ClientAssignmentResponse {
  manager_id: number;
  assigned_client_ids: number[];
}

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
  company_name?: string;
  company_email?: string | null;
  company_phone?: string | null;
  company_website?: string | null;
  company_address?: string | null;
  assigned_client_ids?: number[];
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role?: string;
  is_active?: boolean;
  assigned_client_ids?: number[];
};

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

export function createClient(
  payload: CreateClientPayload,
  tokens?: { accessToken?: string; refreshToken?: string | null },
) {
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  if (tokens?.refreshToken) {
    headers["X-Refresh-Token"] = tokens.refreshToken;
  }

  return apiFetch<BackendClient>("/clients/add", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(Object.keys(headers).length ? { headers } : undefined),
  });
}

export function updateClientAssignments(
  managerId: number | string,
  clientIds: Array<number | string>,
  token?: string,
) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const payload = {
    manager_id: Number(managerId),
    client_ids: clientIds.map((id) => Number(id)),
  };

  return apiFetch<ClientAssignmentResponse>("/clients/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(headers ? { headers } : undefined),
  });
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

export function createUser(payload: CreateUserPayload, token?: string) {
  return apiFetch<BackendUser>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

export function updateUser(
  userId: number | string,
  payload: UpdateUserPayload,
  token?: string,
) {
  return apiFetch<BackendUser>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

// ---------- Recommendations ----------
export function fetchRecommendations(token?: string) {
  return apiFetch<BackendRecommendation[]>("/recommendations", token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined);
}

export function approveRecommendation(recId: number | string, token?: string) {
  return apiFetch<{ message: string }>(`/recommendations/${recId}/approve`, {
    method: "POST",
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

export function dismissRecommendation(recId: number | string, token?: string) {
  return apiFetch<{ message: string }>(`/recommendations/${recId}/dismiss`, {
    method: "POST",
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

export function modifyRecommendation(
  recId: number | string,
  newAction: string,
  token?: string,
) {
  return apiFetch<{ message: string; new_action: string }>(`/recommendations/${recId}/modify`, {
    method: "POST",
    body: JSON.stringify({ new_action: newAction }),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

export function fetchRecommendationBundle(recId: number | string, token?: string) {
  return apiFetch<{ bundle: Record<string, unknown> }>(`/recommendations/${recId}/bundle`, token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined);
}

export function markRecommendationExecuted(
  recId: number | string,
  payload: { before_metric: number; after_metric: number },
  token?: string,
) {
  return apiFetch<{ message: string; improvement_percent: number }>(`/recommendations/${recId}/executed`, {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

export function addRecommendationComment(
  recId: number | string,
  text: string,
  token?: string,
) {
  return apiFetch<{ message: string; comment_id: number }>(`/recommendations/${recId}/comment`, {
    method: "POST",
    body: JSON.stringify({ text }),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

// ---------- Chatbot ----------
export function sendChatbotMessage(message: string, token?: string) {
  return apiFetch<ChatbotReply>("/chatbot/message", {
    method: "POST",
    body: JSON.stringify({ message }),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

// ---------- Analytics & Insights ----------
export function optimizeCampaign(payload: OptimizationRequest, token?: string) {
  return apiFetch<OptimizationResponse>("/analytics/optimize", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

export function generateInsights(payload: Record<string, unknown>, token?: string) {
  return apiFetch<InsightResponse>("/insights/generate", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined),
  });
}

// ---------- System Monitoring ----------
export function fetchSystemStatus(token?: string) {
  return apiFetch<SystemStatusResponse>("/system/status", token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined);
}

// lib/api.ts
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://google-ads-w6ag.onrender.com";

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

/**
 * ✅ ADDED: helper to build querystring from optional params
 * (Needed because you call toQuery() in fetchCampaigns/fetchRecommendations/syncGoogleAdsRange.)
 */
function toQuery(params: Record<string, string | undefined>) {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") qp.set(k, v);
  });
  const s = qp.toString();
  return s ? `?${s}` : "";
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
  developer_token?: string | null;
  client_id?: string | null;
  client_secret?: string | null;
  refresh_token?: string | null;
  customer_id?: string | null;
  customer_ids?: string[] | null;
  login_customer_id?: string | null;
  industry?: string | null;
  currency_code?: string | null;
  monthly_budget?: number | null;
  has_google_ads_auth?: boolean;
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
  ctr?: number;
  average_cpc?: number;
  conversion_value?: number;
  cost_per_conversion?: number;
  client_id: number;
}

export interface GoogleAdsSyncResponse {
  status?: string;
  saved_records?: number;
  period?: string;
  message?: string;
  error?: string;
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

export interface WebsiteFile {
  id: string;
  name: string;
  type: string;
  project: string;
  uploadDate: string;
  size: string;
  status: "Processed" | "Processing" | "Analysed";
}

export interface UploadResponse {
  uploaded: WebsiteFile[];
  count: number;
}

export interface ContentAIPayload {
  url?: string;
  text?: string;
  region: string;
  tone_rules?: string[];
  missing_notes?: string[];
  meeting_notes?: string[];
  sitemap?: string[];
  content_map?: Record<string, string[]>;
}

export interface ContentAIAnalysisResult {
  status: string;
  source: string;
  region: string;
  analysis: {
    word_count: number;
    grammar_errors: Array<{ message: string; suggest: string[]; offset: number; errorText: string }>;
    tone: { tone: string; confidence?: number };
    voice: string;
    region_issues: string[];
    tone_rule_violations: string[];
    meeting_instruction_mismatch: string[];
    missing_section_flags: string[];
    content_score: number;
  };
  placement_validation: Record<string, string[]>;
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

export interface WebsiteSEORequest {
  url: string;
  target_keywords?: string[];
  priority_pages?: string[];
}

export interface WebsiteAnalysisRequest {
  url: string;
}

export interface WebsiteReportRequest {
  url: string;
  region?: string;
  keyword_targets?: string[];
  priority_pages?: string[];
  brand_colors?: string[];
  brand_fonts?: string[];
}

export interface WebsiteReportResponse {
  website: string;
  content_ai: Record<string, unknown>;
  seo_ai: Record<string, unknown>;
  design_ai: Record<string, unknown>;
  technical_ai: Record<string, unknown>;
}


// export type CreateClientPayload = Omit<
//   BackendClient,
//   "id" | "created_at" | "updated_at" | "created_by_id"
// >;
export interface CreateClientPayload {
  name: string;
  email: string;
  developer_token?: string | null;
  client_id?: string | null;
  client_secret?: string | null;
  refresh_token?: string | null;
  customer_id?: string | null;
  customer_ids?: string[] | null;
  login_customer_id?: string | null;
  currency_code?: string;
  monthly_budget?: number | null;
  has_google_ads_auth?: boolean;
  assigned_manager_id?: number | null;
}

export type UpdateClientPayload = Partial<CreateClientPayload>;

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
  refresh_token: string;
  token_type: string;
  user: BackendUser;
}

export interface MeetingNotesPayload {
  meeting_id?: string;
  title: string;
  date?: string;
  attendees?: string[];
  notes: string;
  action_items?: string[];
  project?: string;
}

export interface ContentAIRequest {
  url?: string;
  text?: string;
  region?: string;
  tone_rules?: string[];
  missing_notes?: string[];
  meeting_notes?: string[];
  sitemap?: string[];
  content_map?: Record<string, string[]>;
}

export interface ContentAIAnalysis {
  grammar_issues?: Array<{ text: string; suggestion: string; severity: string }>;
  spelling_errors?: Array<{ word: string; suggestion: string }>;
  tone_issues?: Array<{ text: string; issue: string }>;
  readability_score?: number;
  word_count?: number;
  seo_density?: Record<string, number>;
  missing_sections?: string[];
  overall_score?: number;
  summary?: string;
  [key: string]: unknown;
}

export interface ContentAIResponse {
  status: string;
  source: string;
  region: string;
  analysis: ContentAIAnalysis;
  placement_validation: Record<string, unknown>;
}

export interface RunNewCheckPayload {
  project_name: string;
  website_url: string;
  project_id: string;
  client_region: string;
  project_type: string;
  language: string;
  content_placement: string;
  proofreading: string;
  missing_content: string;
  sitemap_url: string;
  skip_incomplete: boolean;
  meeting_notes: string;
  client_emails: string;
  special_requests: string;
  deadlines: string;
  overall_deadline: string;
  brand_notes: string;
  primary_color: string;
  secondary_colors: string;
  primary_font: string;
  secondary_font: string;
  theme_demo_url: string;
  theme_desc: string;
  competitor_refs: string;
  design_prefs_desc: string;
  custom_layout: string;
  priority_pages: string;
  forms_list: string;
  form_fields: string;
  captcha_details: string;
  captcha_behavior: string;
  form_submission_flows: string;
  interactive_elements: string[];
  interactive_behavior: string;
  third_party_integrations: string;
  seo_pages: object[];
  canonical_urls: string;
  alt_text: string;
  header_structure: string;
  sitemap_index_notes: string;
  og_tags: string;
  schema_markup: string;
  robots_txt: string;
  compression_rules: string;
  naming_conventions: string;
  priority_media: string;
  auto_optimize: boolean;
  accessibility_standard: string;
  custom_accessibility: string;
  device_sizes: string[];
  custom_devices: string;
  browsers: string[];
  browser_notes: string;
  alt_text_req: string;
  text_resizing: string;
  high_contrast: string;
  keyboard_nav: string;
  aria_labels: string;
  accessibility_priority_pages: string;
  accessibility_notes: string;
  ssl_enabled: boolean;
  ssl_details: string;
  redirects: string;
  redirects_verified: boolean;
  scripts_code: string;
  performance_notes: string;
  third_party_integrations_sec: string;
  custom_404: string;
  custom_500: string;
  other_errors: string;
  error_handling_notes: string;
  priority_technical_checks: string;
  backup_notes: string;
  report_recipients: string;
  report_format: string;
  severity_levels: string[];
  kpi_selected: string[];
  delivery_selected: string[];
  auto_weekly: boolean;
  qa_comments: string;
  follow_up_notes: string;
  summary_metrics: string;
}

export interface DesignAIPayload {
  url: string;
  brand_colors: string[];
  brand_fonts: string[];
  theme_refs?: string[];
  competitor_urls?: string[];
  custom_layout_rules?: Record<string, boolean>;
  priority_pages?: string[];
}

export interface DesignAIResult {
  status: string;
  [key: string]: unknown;
}

export function analyzeDesignAIWizard(payload: DesignAIPayload, token?: string) {
  return apiFetch<DesignAIResult>("/website/design-ai/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export interface SEOAIPayload {
  url: string;
  target_keywords?: string[];
  priority_pages?: string[];
}

export interface SEOAIResult {
  status: string;
  data: {
    url: string;
    title: string;
    description: string;
    canonical: string;
    robots: string;
    index_status: string;
    headers: { h1: string[]; h2: string[]; h3: string[] };
    alt_texts: Array<{ src: string; alt: string }>;
    missing_alt_tags: number;
    keyword_density: Record<string, number>;
    meta_issues: string[];
    heading_issues: string[];
    seo_score: number;
  };
}

export interface AccessibilityBreakpoints {
  desktop: { width: number; height: number };
  tablet: { width: number; height: number };
  mobile: { width: number; height: number };
}

export interface AccessibilityAIPayload {
  urls: string[];
  wcag_level: string;
  browsers: string[];
  breakpoints?: AccessibilityBreakpoints;
}

export interface AccessibilityAIResult {
  status: string;
  message: string;
  json_report: string;
  csv_summary: string;
}

export interface TechnicalAIPayload {
  base_url: string;
  redirect_rules: Record<string, string>;
  custom_script_rules?: string[];
  performance_limits: { max_load_time: number; image_max_kb: number };
  integrations: string[];
  critical_pages: Record<string, string>;
}

export interface TechnicalAIResult {
  data: Record<string, unknown>;
  report_file: string;
}

export interface ReportAIPayload {
  url: string;
  region?: string;
  keyword_targets?: string[];
  priority_pages?: string[];
  brand_colors?: string[];
  brand_fonts?: string[];
  competitors?: string[];
  layout_rules?: Record<string, boolean>;
}

export interface ReportAIResult {
  status: string;
  message: string;
  data: {
    content_ai: Record<string, unknown>;
    seo_ai: Record<string, unknown>;
    design_ai: Record<string, unknown>;
    technical_ai: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// ---------- Website Settings ----------
export interface WebsiteSettings {
  company_name: string;
  default_region: string;
  email_notifs: boolean;
  weekly_reports: boolean;
  issue_alerts: boolean;
  accessibility_std: string;
  page_load_target: string;
  language_pref: string;
}

export function fetchWebsiteSettings(token?: string) {
  return apiFetch<WebsiteSettings>(
    "/website/settings",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}

export function saveWebsiteSettings(payload: WebsiteSettings, token?: string) {
  return apiFetch<WebsiteSettings>("/website/settings", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function generateReportWizard(payload: ReportAIPayload, token?: string) {
  return apiFetch<ReportAIResult>("/website/report/generate", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function analyzeTechnicalWizard(payload: TechnicalAIPayload, token?: string) {
  return apiFetch<TechnicalAIResult>("/website/audit/technical", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function analyzeAccessibilityWizard(payload: AccessibilityAIPayload, token?: string) {
  return apiFetch<AccessibilityAIResult>("/website/audit/accessibility", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function analyzeSEOAIWizard(payload: SEOAIPayload, token?: string) {
  return apiFetch<SEOAIResult>("/website/seo/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function saveRunNewCheck(payload: RunNewCheckPayload, token?: string) {
  return apiFetch<{ message: string; id: number }>(
    "/website/run-new-checks",
    {
      method: "POST",
      body: JSON.stringify(payload),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

export function uploadMeetingNotes(payload: MeetingNotesPayload, token?: string) {
  return apiFetch<{ status: string; message: string }>(
    "/website/meeting-notes/upload",
    {
      method: "POST",
      body: JSON.stringify(payload),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

// ---------- Auth API ----------
export function login(credentials: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}


export function analyzeContentAIWizard(payload: ContentAIPayload, token?: string) {
  return apiFetch<ContentAIAnalysisResult>("/website/content-ai/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

// Use this in components instead of fetching an auth_url
// (your backend /auth/google-connect will 302 to Google and set state cookie)
export function startGoogleOAuth() {
  window.location.assign(`${API_BASE_URL}/auth/google-connect`);
}

export function startMccGoogleOAuth() {
  window.location.assign(`${API_BASE_URL}/auth/google-connect?mode=mcc`);
}

// Who am I (reads cookie on server)
export function me() {
  return apiFetch<{
    id: number | string;
    name?: string;
    email: string;
    role?: string;
    google?: any;
  }>("/auth/me", { method: "GET" });
}

// Manually trigger refresh (usually not needed; apiFetch auto-refreshes once on 401)
export function refreshSession() {
  return apiFetch<{ access_token: string; token_type: string }>("/auth/refresh", {
    method: "POST",
  });
}

export interface MccStatusResponse {
  connected: boolean;
  login_customer_id?: string | null;
  connected_clients: number;
  total_clients: number;
}

export function fetchMccStatus(token?: string) {
  return apiFetch<MccStatusResponse>(
    "/auth/google-mcc-status",
    token
      ? {
        headers: { Authorization: `Bearer ${token}` },
      }
      : undefined,
  );
}

// ---------- Data API (optional token header still supported) ----------
export function fetchClients(token?: string) {
  return apiFetch<BackendClient[]>(
    "/clients/all",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}

export function createClient(
  payload: CreateClientPayload,
  tokens?: { accessToken?: string; refreshToken?: string | null }
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

export function updateClient(
  clientId: number | string,
  payload: UpdateClientPayload,
  tokens?: { accessToken?: string; refreshToken?: string | null }
) {
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  if (tokens?.refreshToken) {
    headers["X-Refresh-Token"] = tokens.refreshToken;
  }

  return apiFetch<BackendClient>(`/clients/${clientId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    ...(Object.keys(headers).length ? { headers } : undefined),
  });
}

export function deleteClient(
  clientId: number | string,
  tokens?: { accessToken?: string; refreshToken?: string | null }
) {
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  if (tokens?.refreshToken) {
    headers["X-Refresh-Token"] = tokens.refreshToken;
  }

  return apiFetch<{ message?: string }>(`/clients/${clientId}`, {
    method: "DELETE",
    ...(Object.keys(headers).length ? { headers } : undefined),
  });
}

export function updateClientAssignments(
  managerId: number | string,
  clientIds: Array<number | string>,
  token?: string
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

export function fetchGoogleAdsRange(
  clientId: number | string,
  startDate: string,
  endDate: string,
  token?: string,
  customerId?: string
) {
  const params = new URLSearchParams({
    client_id: String(clientId),
    start_date: startDate,
    end_date: endDate,
  });

  if (customerId) {
    params.append("customer_id", customerId);
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return apiFetch<GoogleAdsSyncResponse>(
    `/google-ads/fetch-customized?${params.toString()}`,
    {
      method: "GET",
      ...(headers ? { headers } : undefined),
    }
  );
}

export function fetchGoogleAdsDaily(
  clientId: number | string,
  token?: string,
  customerId?: string
) {
  const params = new URLSearchParams({ client_id: String(clientId) });
  if (customerId) {
    params.append("customer_id", customerId);
  }
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return apiFetch<GoogleAdsSyncResponse>(
    `/google-ads/fetch-daily?${params.toString()}`,
    {
      method: "GET",
      ...(headers ? { headers } : undefined),
    }
  );
}

// ✅ UPDATED version (your own) — now supports date range
export function fetchCampaigns(token: string, startDate: string, endDate: string) {
  const qs = toQuery({ start_date: startDate, end_date: endDate });
  return apiFetch<BackendCampaign[]>(`/campaigns${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function updateUser(
  userId: number | string,
  payload: UpdateUserPayload,
  token?: string
) {
  return apiFetch<BackendUser>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function deleteUser(userId: number | string, token?: string) {
  return apiFetch<{ message?: string }>(`/users/${userId}`, {
    method: "DELETE",
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

// ---------- Recommendations ----------
// ✅ UPDATED version (your own) — now supports date range
export function fetchRecommendations(token: string, startDate: string, endDate: string) {
  const qs = toQuery({ start_date: startDate, end_date: endDate });
  return apiFetch<BackendRecommendation[]>(`/recommendations${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function approveRecommendation(recId: string, token: string) {
  return apiFetch(`/recommendations/${encodeURIComponent(recId)}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function dismissRecommendation(recId: string, token: string) {
  return apiFetch(`/recommendations/${encodeURIComponent(recId)}/dismiss`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function modifyRecommendation(
  recId: number | string,
  newAction: string,
  token?: string
) {
  return apiFetch<{ message: string; new_action: string }>(
    `/recommendations/${recId}/modify`,
    {
      method: "POST",
      body: JSON.stringify({ new_action: newAction }),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

export function fetchRecommendationBundle(recId: number | string, token?: string) {
  return apiFetch<{ bundle: Record<string, unknown> }>(
    `/recommendations/${recId}/bundle`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}

export function markRecommendationExecuted(
  recId: number | string,
  payload: { before_metric: number; after_metric: number },
  token?: string
) {
  return apiFetch<{ message: string; improvement_percent: number }>(
    `/recommendations/${recId}/executed`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

export function addRecommendationComment(
  recId: number | string,
  text: string,
  token?: string
) {
  return apiFetch<{ message: string; comment_id: number }>(
    `/recommendations/${recId}/comment`,
    {
      method: "POST",
      body: JSON.stringify({ text }),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

// ---------- Sync ----------
export function syncGoogleAdsRange(token: string, startDate: string, endDate: string) {
  const qs = toQuery({ start_date: startDate, end_date: endDate });
  return apiFetch<GoogleAdsSyncResponse>(`/google_ads/fetch_range${qs}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function syncGoogleAdsDaily(token: string) {
  return apiFetch<GoogleAdsSyncResponse>(`/google_ads/fetch_today`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// export function fetchUsers(token: string) {
//   return apiFetch<BackendUser[]>("/users/all", {
//     headers: { Authorization: `Bearer ${token}` },
//   });
// }

// ---------- Chatbot ----------
export function sendChatbotMessage(message: string, token?: string) {
  return apiFetch<ChatbotReply>("/chatbot/message", {
    method: "POST",
    body: JSON.stringify({ message }),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

// ---------- Analytics & Insights ----------
export function optimizeCampaign(payload: OptimizationRequest, token?: string) {
  return apiFetch<OptimizationResponse>("/analytics/optimize", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function generateInsights(payload: Record<string, unknown>, token?: string) {
  return apiFetch<InsightResponse>("/insights/generate", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

// ---------- System Monitoring ----------
export function fetchSystemStatus(token?: string) {
  return apiFetch<SystemStatusResponse>(
    "/system/status",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}

export function analyzeWebsiteSEO(payload: WebsiteSEORequest, token?: string) {
  return apiFetch<Record<string, unknown>>("/website/seo/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function analyzeWebsiteDesign(payload: WebsiteAnalysisRequest, token?: string) {
  return apiFetch<Record<string, unknown>>("/website/design/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function analyzeWebsiteContent(payload: WebsiteAnalysisRequest, token?: string) {
  return apiFetch<Record<string, unknown>>("/website/content/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function generateWebsiteReport(payload: WebsiteReportRequest, token?: string) {
  return apiFetch<WebsiteReportResponse>("/website/report/generate", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

// ---------- Meeting Notes Files ----------
export function fetchWebsiteFiles(token?: string) {
  return apiFetch<{ files: WebsiteFile[] }>(
    "/website/meeting-notes/files",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}
/** Upload one or more files */

export async function uploadWebsiteFiles(
  files: FileList | File[],
  token?: string
): Promise<UploadResponse> {
  const uploaded: WebsiteFile[] = [];

  for (const file of Array.from(files)) {
    // Read file content as text
    const text = await file.text();
    const meeting_id = crypto.randomUUID();

    const payload = {
      meeting_id,
      title: file.name,
      notes: text,           // ← file content goes into notes
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      attendees: [],
      action_items: [],
      project: "Unassigned",
    };

    const res = await fetch(`${API_BASE_URL}/website/meeting-notes/upload`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await res.text());

    // Build a WebsiteFile record for the UI
    uploaded.push({
      id: meeting_id,
      name: file.name,
      type: "Meeting Notes",
      project: "Unassigned",
      uploadDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      size: file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      status: "Processed",
    });
  }

  return { uploaded, count: uploaded.length };
}

export function deleteWebsiteFile(fileId: string, token?: string) {
  return apiFetch<{ message: string }>(
    `/website/meeting-notes/delete/${fileId}`,
    {
      method: "DELETE",
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

export function getWebsiteFileDownloadUrl(fileId: string): string {
  return `${API_BASE_URL}/website/meeting-notes/download/${fileId}`;
}

export function updateWebsiteFileProject(
  fileId: string,
  project: string,
  token?: string
) {
  return apiFetch<WebsiteFile>(`/website/files/${fileId}/project`, {
    method: "PATCH",
    body: JSON.stringify({ project }),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function analyzeContentAI(payload: ContentAIRequest, token?: string) {
  return apiFetch<ContentAIResponse>("/website/content-ai/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

export function fetchRunNewChecks(token?: string) {
  return apiFetch<any[]>(
    "/website/run-new-checks",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}

export function getReportPdfUrl(recordId: number): string {
  return `${API_BASE_URL}/website/run-new-checks/${recordId}/download-pdf`;
}

export async function fetchRunNewChecksCount(token?: string): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/website/run-new-checks/`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch checks count");
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

export async function fetchWebsiteFileContent(
  fileId: string,
  token?: string
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/website/meeting-notes/download/${fileId}`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return (data.content as string) ?? "";
}

export function saveAnalysisResult(fileId: string, result: object, token?: string) {
  return apiFetch<{ message: string; id: number }>(
    `/website/meeting-notes/analysis/${fileId}`,
    {
      method: "POST",
      body: JSON.stringify(result),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

export function updateFileStatus(
  fileId: string,
  status: "Processed" | "Processing" | "Analysed",
  token?: string
) {
  return apiFetch<{ message: string }>(
    `/website/meeting-notes/${fileId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    }
  );
}

export function fetchAnalysisResults(token?: string) {
  return apiFetch<any[]>(
    "/website/meeting-notes/analysis",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}

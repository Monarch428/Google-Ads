import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Client, Manager, AIRecommendation } from "./mock-data";
import {
  fetchCampaigns,
  fetchClients,
  fetchUsers,
  fetchRecommendations,
  approveRecommendation,
  dismissRecommendation,
  deleteClient as deleteClientApi,
  updateClient as updateClientApi,
  deleteUser,
  fetchGoogleAdsRange,
  fetchGoogleAdsDaily,
  BackendCampaign,
  BackendClient,
  BackendUser,
  BackendRecommendation,
  GoogleAdsSyncResponse,
} from "./api";
import type { AuthDetails } from "./auth-types";

type ClientStatus = Client["status"];

type CampaignSummary = {
  id: string;
  name: string;
  clientId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  cpc: number;
  cpa: number;
};

type DataContextValue = {
  clients: Client[];
  clientsLoading: boolean;
  clientsError: string | null;
  managers: Manager[];
  managersLoading: boolean;
  managersError: string | null;
  campaigns: CampaignSummary[];
  refreshClients: () => Promise<void>;
  refreshManagers: () => Promise<void>;
  recommendations: AIRecommendation[];
  recommendationsLoading: boolean;
  recommendationsError: string | null;
  refreshRecommendations: () => Promise<void>;
  approveRecommendation: (recId: string) => Promise<void>;
  dismissRecommendation: (recId: string) => Promise<void>;
  updateClient: (clientId: string, payload: Partial<BackendClient>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  deleteManager: (managerId: string) => Promise<void>;
  authToken?: string;
  refreshToken?: string | null;
  viewerRole: string;
  currentUser?: BackendUser;
  authDetails: AuthDetails | null;
  syncGoogleAdsRange: (
    clientId: string,
    startDate: string,
    endDate: string,
  ) => Promise<GoogleAdsSyncResponse>;
  syncGoogleAdsDaily: (clientId: string) => Promise<GoogleAdsSyncResponse>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

function buildCampaignSummaries(campaigns: BackendCampaign[]): {
  summaries: CampaignSummary[];
  metricsByClient: Map<number, { impressions: number; clicks: number; conversions: number; cost: number }>;
} {
  const metricsByClient = new Map<number, { impressions: number; clicks: number; conversions: number; cost: number }>();
  const summaries: CampaignSummary[] = campaigns.map((campaign) => {
    const impressions = Number(campaign.impressions ?? 0);
    const clicks = Number(campaign.clicks ?? 0);
    const conversions = Number(campaign.conversions ?? 0);
    const cost = Number(campaign.cost ?? 0);

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;

    const clientMetrics = metricsByClient.get(campaign.client_id) ?? {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
    };

    clientMetrics.impressions += impressions;
    clientMetrics.clicks += clicks;
    clientMetrics.conversions += conversions;
    clientMetrics.cost += cost;

    metricsByClient.set(campaign.client_id, clientMetrics);

    return {
      id: String(campaign.id),
      name: campaign.name,
      clientId: String(campaign.client_id),
      impressions,
      clicks,
      conversions,
      cost,
      ctr: Number(ctr.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      cpa: Number(cpa.toFixed(2)),
    };
  });

  return { summaries, metricsByClient };
}

function deriveStatus(conversionRate: number, ctr: number, conversions: number, fallback: ClientStatus): ClientStatus {
  if (conversions === 0 && conversionRate === 0 && ctr === 0) {
    return fallback;
  }

  if (conversionRate >= 4 && ctr >= 3) {
    return "healthy";
  }

  if (conversionRate >= 2 || ctr >= 2) {
    return "warning";
  }

  return "critical";
}

function mapClients(
  backendClients: BackendClient[],
  metricsByClient: Map<number, { impressions: number; clicks: number; conversions: number; cost: number }>
): Client[] {
  if (!backendClients.length) {
    return [];
  }

  return backendClients.map((client, index) => {
    const metrics = metricsByClient.get(client.id) ?? {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
    };

    const customerIds =
      client.customer_ids && client.customer_ids.length > 0
        ? client.customer_ids
        : client.customer_id
        ? client.customer_id.split(",").map((value) => value.trim()).filter(Boolean)
        : [];

    const impressions = Number(metrics.impressions ?? 0);
    const clicks = Number(metrics.clicks ?? 0);
    const conversions = Number(metrics.conversions ?? 0);
    const cost = Number(metrics.cost ?? 0);

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;

    const estimatedRevenue = conversions > 0 ? conversions * 120 : 0;
    const roas = cost > 0 && estimatedRevenue > 0 ? estimatedRevenue / cost : 0;
    const hasGoogleOAuth =
      typeof client.has_google_ads_auth === "boolean"
        ? client.has_google_ads_auth
        : Boolean(client.refresh_token);

      return {
        id: String(client.id),
        name: client.name || `Client ${index + 1}`,
        adSpend: Number(cost.toFixed(2)),
        currencyCode: client.currency_code || "USD",
        conversions,
        ctr: Number(ctr.toFixed(2)),
        cpa: Number(cpa.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      revenue: Number(estimatedRevenue.toFixed(2)),
      impressions,
      clicks,
      roas: Number(roas.toFixed(2)),
      status: deriveStatus(conversionRate, ctr, conversions, "critical"),
      industry: client.industry || undefined,
      customerIds,
      assignedManagerId:
        client.assigned_manager_id != null
          ? String(client.assigned_manager_id)
          : undefined,
      createdById:
        client.created_by_id != null ? String(client.created_by_id) : undefined,
      hasGoogleOAuth,
      customerId: client.customer_id ?? undefined,
      loginCustomerId: client.login_customer_id ?? undefined,
    };
  });
}

function normalizePriority(priority: BackendRecommendation["priority"], fallback: AIRecommendation["priority"]): AIRecommendation["priority"] {
  if (!priority) return fallback;
  const lowered = priority.toLowerCase();
  if (lowered === "high" || lowered === "medium" || lowered === "low") {
    return lowered;
  }
  return fallback;
}

function normalizeStatus(status: BackendRecommendation["status"], fallback: AIRecommendation["status"]): AIRecommendation["status"] {
  if (!status) return fallback;
  const lowered = status.toLowerCase();
  if (
    lowered === "pending" ||
    lowered === "approved" ||
    lowered === "modified" ||
    lowered === "rejected" ||
    lowered === "dismissed" ||
    lowered === "executed"
  ) {
    return lowered;
  }
  return fallback;
}

function formatRelativeTime(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  return date.toLocaleDateString();
}

function mapRecommendations(
  backendRecommendations: BackendRecommendation[],
  clients: Client[],
): AIRecommendation[] {
  if (!backendRecommendations.length) {
    return [];
  }

  return backendRecommendations.map((rec, index) => {
    const client = clients.find((c) => Number(c.id) === Number(rec.client_id));

    const predictedImpact = rec.predicted_impact ?? null;
    const impactText =
      predictedImpact !== null
        ? `${predictedImpact >= 0 ? "+" : ""}${predictedImpact.toFixed(1)}% predicted impact`
        : "No impact prediction available.";

    return {
      id: String(rec.id),
      clientId: client?.id ?? (rec.client_id != null ? String(rec.client_id) : undefined),
      clientName: client?.name ?? `Client ${client?.id ?? index + 1}`,
      campaignName: rec.campaign_name ?? "Unnamed campaign",
      type: "optimization",
      priority: normalizePriority(rec.priority, "medium"),
      status: normalizeStatus(rec.status, "pending"),
      recommendation: rec.suggestion ?? "Recommendation details unavailable.",
      impact: impactText,
      manager: "AI System",
      actionProposal: rec.action_proposal ?? rec.suggestion ?? undefined,
      predictedImpact: predictedImpact ?? undefined,
      createdAt: formatRelativeTime(rec.created_at, "Just now"),
    };
  });
}

function formatRole(role: string | undefined, fallbackRole: string): string {
  if (!role) return fallbackRole;
  switch (role.toLowerCase()) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Ad Manager";
    case "senior_manager":
    case "senior":
      return "Senior Ad Manager";
    case "junior":
      return "Junior Ad Manager";
    default:
      return role;
  }
}

function mapManagers(
  backendUsers: BackendUser[],
  clients: Client[],
): Manager[] {
  if (!backendUsers.length) {
    return [];
  }

  const effectiveClients = clients;
  const assignments = new Map<string, string[]>();

  for (const client of effectiveClients) {
    if (client.assignedManagerId) {
      const managerId = client.assignedManagerId;
      const assigned = assignments.get(managerId) ?? [];
      assigned.push(client.id);
      assignments.set(managerId, assigned);
    }
  }

  return backendUsers.map((user) => {
    const managerId = String(user.id);
    const assignedFromUser = Array.isArray(user.assigned_client_ids)
      ? user.assigned_client_ids.map((id) => String(id))
      : [];
    const assignedFromClients = assignments.get(managerId) ?? [];
    const assignedClientIds = assignedFromUser.length ? assignedFromUser : assignedFromClients;

    return {
      id: managerId,
      name: user.name || `Manager ${managerId}`,
      email: user.email,
      role: formatRole(user.role, "Ad Manager"),
      status: user.is_active ? "active" : "inactive",
      clientsAssigned: assignedClientIds.length,
      assignedClientIds,
      recommendationsReviewed: 0,
      recommendationsPending: 0,
      recommendationsApproved: 0,
      actionBundlesCreated: 0,
      avgTimeToApproval: "—",
    };
  });
}

export function DataProvider({
  children,
  authToken,
  refreshToken,
  currentUser,
  authDetails,
}: {
  children: React.ReactNode;
  authToken?: string;
  refreshToken?: string | null;
  currentUser?: BackendUser | null;
  authDetails?: AuthDetails | null;
}) {
  const normalizedRole = (currentUser?.role ?? "").toLowerCase();
  const viewerRole = normalizedRole || "manager";
  const isAdmin = viewerRole === "admin";

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);

  const [managers, setManagers] = useState<Manager[]>([]);
  const [managersLoading, setManagersLoading] = useState(true);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    if (!authToken) {
      setClients([]);
      setCampaigns([]);
      setClientsError(null);
      setClientsLoading(false);
      return;
    }

    setClientsLoading(true);
    try {
      const [clientResponse, campaignResponse] = await Promise.all([
        fetchClients(authToken),
        fetchCampaigns(authToken).catch(() => []),
      ]);

      const { summaries, metricsByClient } = buildCampaignSummaries(campaignResponse);
      const mappedClients = mapClients(clientResponse, metricsByClient);

      setClients(mappedClients);
      setCampaigns(summaries);
      setClientsError(null);
    } catch (error) {
      console.error("Failed to load clients", error);
      setClients([]);
      setCampaigns([]);
      setClientsError(error instanceof Error ? error.message : "Failed to load clients");
    } finally {
      setClientsLoading(false);
    }
  }, [authToken]);

  const loadManagers = useCallback(async () => {
    if (!authToken) {
      setManagers([]);
      setManagersError(null);
      setManagersLoading(false);
      return;
    }

    if (!isAdmin) {
      setManagers([]);
      setManagersError(null);
      setManagersLoading(false);
      return;
    }

    setManagersLoading(true);
    try {
      const users = await fetchUsers(authToken);
      const mappedManagers = mapManagers(users, clients);
      setManagers(mappedManagers);
      setManagersError(null);
    } catch (error) {
      console.error("Failed to load managers", error);
      setManagers([]);
      setManagersError(error instanceof Error ? error.message : "Failed to load managers");
    } finally {
      setManagersLoading(false);
    }
  }, [authToken, clients, isAdmin]);

  const loadRecommendations = useCallback(async () => {
    if (!authToken) {
      setRecommendations([]);
      setRecommendationsError(null);
      setRecommendationsLoading(false);
      return;
    }

    setRecommendationsLoading(true);
    try {
      const backendRecs = await fetchRecommendations(authToken);
      const mapped = mapRecommendations(backendRecs, clients);
      setRecommendations(mapped);
      setRecommendationsError(null);
    } catch (error) {
      console.error("Failed to load recommendations", error);
      setRecommendations([]);
      setRecommendationsError(error instanceof Error ? error.message : "Failed to load recommendations");
    } finally {
      setRecommendationsLoading(false);
    }
  }, [authToken, clients]);

  const handleApproveRecommendation = useCallback(async (recId: string) => {
    if (!authToken) return;
    try {
      await approveRecommendation(recId, authToken);
      await loadRecommendations();
    } catch (error) {
      console.error("Failed to approve recommendation", error);
      throw error;
    }
  }, [authToken, loadRecommendations]);

  const handleDismissRecommendation = useCallback(async (recId: string) => {
    if (!authToken) return;
    try {
      await dismissRecommendation(recId, authToken);
      await loadRecommendations();
    } catch (error) {
      console.error("Failed to dismiss recommendation", error);
      throw error;
    }
  }, [authToken, loadRecommendations]);

  const handleUpdateClient = useCallback(
    async (clientId: string, payload: Partial<BackendClient>) => {
      if (!authToken) {
        throw new Error("Authentication required to update clients");
      }

      try {
        await updateClientApi(clientId, payload, {
          accessToken: authToken,
          refreshToken: refreshToken ?? null,
        });
        await Promise.all([loadClients(), loadManagers()]);
      } catch (error) {
        console.error("Failed to update client", error);
        throw error;
      }
    },
    [authToken, refreshToken, loadClients, loadManagers],
  );

  const handleDeleteClient = useCallback(
    async (clientId: string) => {
      if (!authToken) {
        throw new Error("Authentication required to delete clients");
      }

      try {
        await deleteClientApi(clientId, {
          accessToken: authToken,
          refreshToken: refreshToken ?? null,
        });
        await loadClients();
        await loadManagers();
      } catch (error) {
        console.error("Failed to delete client", error);
        throw error;
      }
    },
    [authToken, refreshToken, loadClients, loadManagers],
  );

  const handleDeleteManager = useCallback(
    async (managerId: string) => {
      if (!authToken) {
        throw new Error("Authentication required to delete managers");
      }

      try {
        await deleteUser(managerId, authToken);
        await Promise.all([loadManagers(), loadClients()]);
      } catch (error) {
        console.error("Failed to delete manager", error);
        throw error;
      }
    },
    [authToken, loadClients, loadManagers],
  );

  const handleSyncGoogleAdsRange = useCallback(
    async (clientId: string, startDate: string, endDate: string) => {
      if (!authToken) {
        throw new Error("Sign in to sync Google Ads data");
      }

      try {
        const response = await fetchGoogleAdsRange(clientId, startDate, endDate, authToken);
        await Promise.all([loadClients(), loadRecommendations()]);
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to sync Google Ads data";
        throw error;
      }
    },
    [authToken, loadClients, loadRecommendations],
  );

  const handleSyncGoogleAdsDaily = useCallback(
    async (clientId: string) => {
      if (!authToken) {
        throw new Error("Sign in to sync Google Ads data");
      }

      try {
        const response = await fetchGoogleAdsDaily(clientId, authToken);
        await Promise.all([loadClients(), loadRecommendations()]);
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to sync Google Ads data";
        throw error;
      }
    },
    [authToken, loadClients, loadRecommendations],
  );

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const value = useMemo<DataContextValue>(() => ({
    clients,
    clientsLoading,
    clientsError,
    managers,
    managersLoading,
    managersError,
    campaigns,
    refreshClients: loadClients,
    refreshManagers: loadManagers,
    recommendations,
    recommendationsLoading,
    recommendationsError,
    refreshRecommendations: loadRecommendations,
    approveRecommendation: handleApproveRecommendation,
    dismissRecommendation: handleDismissRecommendation,
    updateClient: handleUpdateClient,
    deleteClient: handleDeleteClient,
    deleteManager: handleDeleteManager,
    authToken,
    refreshToken: refreshToken ?? null,
    viewerRole,
    currentUser: currentUser ?? undefined,
    authDetails: authDetails ?? null,
    syncGoogleAdsRange: handleSyncGoogleAdsRange,
    syncGoogleAdsDaily: handleSyncGoogleAdsDaily,
  }), [
    clients,
    clientsLoading,
    clientsError,
    managers,
    managersLoading,
    managersError,
    campaigns,
    loadClients,
    loadManagers,
    recommendations,
    recommendationsLoading,
    recommendationsError,
    loadRecommendations,
    handleApproveRecommendation,
    handleDismissRecommendation,
    handleUpdateClient,
    handleDeleteClient,
    handleDeleteManager,
    authToken,
    refreshToken,
    viewerRole,
    currentUser,
    authDetails,
    handleSyncGoogleAdsRange,
    handleSyncGoogleAdsDaily,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

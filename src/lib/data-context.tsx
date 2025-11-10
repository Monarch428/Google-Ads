import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Client, Manager, mockClients, mockManagers, mockRecommendations, AIRecommendation } from "./mock-data";
import {
  fetchCampaigns,
  fetchClients,
  fetchUsers,
  fetchRecommendations,
  approveRecommendation,
  dismissRecommendation,
  BackendCampaign,
  BackendClient,
  BackendUser,
  BackendRecommendation,
} from "./api";

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
  authToken?: string;
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
    return mockClients;
  }

  return backendClients.map((client, index) => {
    const fallback = mockClients[index % mockClients.length];
    const metrics = metricsByClient.get(client.id) ?? {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
    };

    const impressions = Number(metrics.impressions ?? 0);
    const clicks = Number(metrics.clicks ?? 0);
    const conversions = Number(metrics.conversions ?? 0);
    const cost = Number(metrics.cost ?? 0);

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;

    const estimatedRevenue = conversions > 0 ? conversions * 120 : 0;
    const roas = cost > 0 && estimatedRevenue > 0 ? estimatedRevenue / cost : 0;

    return {
      ...fallback,
      id: String(client.id),
      name: client.name || fallback.name,
      adSpend: Number(cost.toFixed(2)),
      conversions,
      ctr: Number(ctr.toFixed(2)),
      cpa: Number(cpa.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      revenue: Number(estimatedRevenue.toFixed(2)),
      impressions,
      clicks,
      roas: Number(roas.toFixed(2)),
      status: deriveStatus(conversionRate, ctr, conversions, fallback.status),
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
    return mockRecommendations;
  }

  return backendRecommendations.map((rec, index) => {
    const fallback = mockRecommendations[index % mockRecommendations.length];
    const client = clients.find((c) => Number(c.id) === Number(rec.client_id));

    const predictedImpact = rec.predicted_impact ?? fallback.predictedImpact ?? null;
    const impactText =
      predictedImpact !== null
        ? `${predictedImpact >= 0 ? "+" : ""}${predictedImpact.toFixed(1)}% predicted impact`
        : fallback.impact;

    return {
      ...fallback,
      id: String(rec.id),
      clientId: client?.id ?? (rec.client_id != null ? String(rec.client_id) : fallback.clientId),
      clientName: client?.name ?? fallback.clientName,
      campaignName: rec.campaign_name ?? fallback.campaignName,
      priority: normalizePriority(rec.priority, fallback.priority),
      status: normalizeStatus(rec.status, fallback.status),
      recommendation: rec.suggestion ?? fallback.recommendation,
      impact: impactText,
      actionProposal: rec.action_proposal ?? fallback.actionProposal ?? fallback.recommendation,
      predictedImpact: predictedImpact ?? undefined,
      createdAt: formatRelativeTime(rec.created_at, fallback.createdAt),
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

function mapManagers(backendUsers: BackendUser[], clients: Client[]): Manager[] {
  if (!backendUsers.length) {
    return mockManagers;
  }

  const effectiveClients = clients.length ? clients : mockClients;
  const totalManagers = Math.max(1, backendUsers.length);

  return backendUsers.map((user, index) => {
    const fallback = mockManagers[index % mockManagers.length];
    const fallbackAssigned = fallback.assignedClientIds ?? [];
    const derivedAssigned = effectiveClients
      .filter((_, clientIndex) => clientIndex % totalManagers === index % totalManagers)
      .map((client) => client.id);
    const assignedClientIds = derivedAssigned.length ? derivedAssigned : fallbackAssigned;

    return {
      ...fallback,
      id: String(user.id),
      name: user.name || fallback.name,
      email: user.email || fallback.email,
      role: formatRole(user.role, fallback.role),
      status: user.is_active ? "active" : "inactive",
      clientsAssigned: assignedClientIds.length || fallback.clientsAssigned,
      assignedClientIds,
    };
  });
}

export function DataProvider({ children, authToken }: { children: React.ReactNode; authToken?: string }) {
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
      setClients(mockClients);
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
      setClients(mockClients);
      setCampaigns([]);
      setClientsError(error instanceof Error ? error.message : "Failed to load clients");
    } finally {
      setClientsLoading(false);
    }
  }, [authToken]);

  const loadManagers = useCallback(async () => {
    if (!authToken) {
      setManagers(mockManagers);
      setManagersError(null);
      setManagersLoading(false);
      return;
    }

    setManagersLoading(true);
    try {
      const users = await fetchUsers(authToken);
      const mappedManagers = mapManagers(users, clients.length ? clients : mockClients);
      setManagers(mappedManagers);
      setManagersError(null);
    } catch (error) {
      console.error("Failed to load managers", error);
      setManagers(mockManagers);
      setManagersError(error instanceof Error ? error.message : "Failed to load managers");
    } finally {
      setManagersLoading(false);
    }
  }, [authToken, clients]);

  const loadRecommendations = useCallback(async () => {
    if (!authToken) {
      setRecommendations(mockRecommendations);
      setRecommendationsError(null);
      setRecommendationsLoading(false);
      return;
    }

    setRecommendationsLoading(true);
    try {
      const backendRecs = await fetchRecommendations(authToken);
      const mapped = mapRecommendations(backendRecs, clients.length ? clients : mockClients);
      setRecommendations(mapped);
      setRecommendationsError(null);
    } catch (error) {
      console.error("Failed to load recommendations", error);
      setRecommendations(mockRecommendations);
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
    authToken,
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
    authToken,
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

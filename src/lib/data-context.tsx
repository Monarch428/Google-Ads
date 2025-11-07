import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Client, Manager, mockClients, mockManagers } from "./mock-data";
import { fetchCampaigns, fetchClients, fetchUsers, BackendCampaign, BackendClient, BackendUser } from "./api";

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

    const { impressions, clicks, conversions, cost } = metrics;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : fallback.ctr;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : fallback.conversionRate;
    const cpa = conversions > 0 ? cost / conversions : fallback.cpa;

    const revenue = conversions > 0 ? conversions * 120 : fallback.revenue;
    const roas = cost > 0 ? revenue / cost : fallback.roas;

    return {
      ...fallback,
      id: String(client.id),
      name: client.name || fallback.name,
      industry: fallback.industry,
      adSpend: cost > 0 ? Number(cost.toFixed(2)) : fallback.adSpend,
      conversions: conversions > 0 ? conversions : fallback.conversions,
      ctr: Number(ctr.toFixed(2)),
      cpa: Number(cpa.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      impressions: impressions > 0 ? impressions : fallback.impressions,
      clicks: clicks > 0 ? clicks : fallback.clicks,
      roas: Number(roas.toFixed(2)),
      status: deriveStatus(conversionRate, ctr, conversions, fallback.status),
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

  const totalClients = clients.length || mockClients.length;
  return backendUsers.map((user, index) => {
    const fallback = mockManagers[index % mockManagers.length];
    const assigned = Math.max(1, Math.round(totalClients / Math.max(1, backendUsers.length)));

    return {
      ...fallback,
      id: String(user.id),
      name: user.name || fallback.name,
      email: user.email || fallback.email,
      role: formatRole(user.role, fallback.role),
      status: user.is_active ? "active" : "inactive",
      clientsAssigned: assigned,
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

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

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

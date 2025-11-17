import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { TrendingUp, DollarSign, Target, Users, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Manager } from "../lib/mock-data";
import { useData } from "../lib/data-context";
import { KPICard } from "./kpi-card";
import { ClientCard } from "./client-card";
import { ManagerActivityPanel } from "./manager-activity-panel";
import { AlertsPanel } from "./alerts-panel";
import { AIRecommendationOverview } from "./ai-recommendation-overview";
import { RecentActivityPanel } from "./recent-activity-panel";
import { CreateReport } from "./create-report";
import { ReportPreview } from "./report-preview";
import { ManagerDetails } from "./manager-details";
import { createClient } from "../lib/api";
import { toast } from "sonner@2.0.3";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type ClientFormState = {
  name: string;
  email: string;
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  customer_id: string;
  login_customer_id: string;
  assigned_manager_id: string;
};

interface DashboardOverviewProps {
  onClientClick: (clientId: string) => void;
  onNavigate?: (view: string) => void;
  onAlertClick?: (alert: any) => void;
  onManagerClick?: (manager: Manager) => void;
  onBundleClick?: (bundleId: string) => void;
  onReportClick?: (reportId: string) => void;
}

export function DashboardOverview({
  onClientClick,
  onNavigate,
  onAlertClick,
  onManagerClick,
  onBundleClick,
  onReportClick
}: DashboardOverviewProps) {
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const {
    clients,
    clientsLoading,
    managers,
    recommendations,
    recommendationsLoading,
    refreshClients,
    authToken,
    refreshToken,
    viewerRole,
    authDetails,
  } = useData();
  const isAdmin = viewerRole === "admin";
  const displayClients = clients;
  const displayManagers = isAdmin ? managers : [];
  const createInitialClientForm = useCallback(
    (): ClientFormState => ({
      name: "",
      email: "",
      developer_token: "",
      client_id: "",
      client_secret: "",
      refresh_token: refreshToken ?? "",
      customer_id: "",
      login_customer_id: "",
      assigned_manager_id: "",
    }),
    [refreshToken],
  );
  const [clientForm, setClientForm] = useState<ClientFormState>(() => createInitialClientForm());
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const oauthPendingClients = authToken ? clients.filter((client) => !client.hasGoogleOAuth) : [];
  const showGoogleOAuthReminder = oauthPendingClients.length > 0;

  const handleClientDialogChange = (open: boolean) => {
    setIsAddClientDialogOpen(open);
    if (open) {
      setClientForm((prev) => ({ ...prev, refresh_token: refreshToken ?? "" }));
    } else {
      setClientForm(createInitialClientForm());
    }
  };

  const handleClientInputChange = (field: keyof ClientFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setClientForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCreateClient = async () => {
    if (!authToken) {
      toast.error("Authentication required", {
        description: "You must be signed in to add a client.",
      });
      return;
    }

    if (!refreshToken) {
      toast.error("Session expired", {
        description: "Please sign in again to manage clients.",
      });
      return;
    }

    const requiredFields: Array<keyof ClientFormState> = [
      "name",
      "email",
      "developer_token",
      "client_id",
      "client_secret",
      "refresh_token",
      "customer_id",
    ];

    const missingField = requiredFields.find((field) => !clientForm[field]?.trim());
    if (missingField) {
      toast.error("Missing information", {
        description: "Please complete all required client credential fields.",
      });
      return;
    }

    setIsSubmittingClient(true);
    try {
      const payload = {
        name: clientForm.name.trim(),
        email: clientForm.email.trim(),
        developer_token: clientForm.developer_token.trim(),
        client_id: clientForm.client_id.trim(),
        client_secret: clientForm.client_secret.trim(),
        refresh_token: clientForm.refresh_token.trim(),
        customer_id: clientForm.customer_id.trim(),
        login_customer_id: clientForm.login_customer_id.trim() || null,
        assigned_manager_id: clientForm.assigned_manager_id
          ? Number(clientForm.assigned_manager_id)
          : undefined,
      };

      await createClient(payload, { accessToken: authToken, refreshToken });
      await refreshClients();
      toast.success("Client connected", {
        description: `${clientForm.name} is now available in your workspace`,
      });
      setIsAddClientDialogOpen(false);
      setClientForm(createInitialClientForm());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create client";
      toast.error("Failed to add client", { description: message });
    } finally {
      setIsSubmittingClient(false);
    }
  };

  useEffect(() => {
    if (isAddClientDialogOpen) {
      setClientForm((prev) => ({ ...prev, refresh_token: refreshToken ?? "" }));
    }
  }, [isAddClientDialogOpen, refreshToken]);

  const maskToken = useCallback((token: string) => {
    if (!token) return "";
    if (token.length <= 12) return token;
    return `${token.slice(0, 6)}…${token.slice(-4)}`;
  }, []);

  if (showCreateReport) {
    return (
      <CreateReport
        onBack={() => setShowCreateReport(false)}
        onGenerate={() => {
          setShowCreateReport(false);
          if (onReportClick) onReportClick("new-report");
        }}
      />
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500">Welcome back, Agency Owner</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="7days">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={isAddClientDialogOpen} onOpenChange={handleClientDialogChange}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Add New Client Account</DialogTitle>
                  <DialogDescription>
                    Connect a new Google Ads account to the AI Agency Analyst platform
                  </DialogDescription>
                </DialogHeader>
                {authDetails && (
                  <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Signed in via
                          {" "}
                          {authDetails.method === "google" ? "Google OAuth" : "Email & Password"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Last login: {new Date(authDetails.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        <div>Access token preview: {maskToken(authDetails.response.access_token)}</div>
                        <div>Refresh token preview: {maskToken(authDetails.response.refresh_token)}</div>
                      </div>
                    </div>
                    <details className="mt-3 space-y-3">
                      <summary className="cursor-pointer text-[11px] font-medium text-slate-600">
                        View login payload &amp; response details
                      </summary>
                      <div>
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                          Request payload
                        </p>
                        <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] leading-relaxed">
                          {JSON.stringify(authDetails.request, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                          Response payload
                        </p>
                        <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] leading-relaxed">
                          {JSON.stringify(authDetails.response, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
                <div className="py-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {/* Left Column */}
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Client Name</Label>
                    <Input
                      id="client-name"
                      placeholder="e.g., TechStart Inc"
                      value={clientForm.name}
                      onChange={handleClientInputChange("name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., client@example.com"
                      value={clientForm.email}
                      onChange={handleClientInputChange("email")}
                    />
                  </div>
                  
                  {/* API Credentials Section */}
                  <div className="col-span-2 pt-2">
                    <h3 className="text-sm text-slate-700 mb-3">Google Ads API Credentials</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="google-ads-id">Google Ads Customer ID</Label>
                        <Input
                          id="google-ads-id"
                          placeholder="e.g., 123-456-7890"
                          value={clientForm.customer_id}
                          onChange={handleClientInputChange("customer_id")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-customer-id">Login Customer ID</Label>
                        <Input
                          id="login-customer-id"
                          placeholder="e.g., 987-654-3210"
                          value={clientForm.login_customer_id}
                          onChange={handleClientInputChange("login_customer_id")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="developer-token">Developer Token</Label>
                        <Input
                          id="developer-token"
                          type="password"
                          placeholder="Enter developer token"
                          value={clientForm.developer_token}
                          onChange={handleClientInputChange("developer_token")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-id">Client ID</Label>
                        <Input
                          id="client-id"
                          placeholder="Enter OAuth 2.0 client ID"
                          value={clientForm.client_id}
                          onChange={handleClientInputChange("client_id")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-secret">Client Secret</Label>
                        <Input
                          id="client-secret"
                          type="password"
                          placeholder="Enter OAuth 2.0 client secret"
                          value={clientForm.client_secret}
                          onChange={handleClientInputChange("client_secret")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="refresh-token">Refresh Token</Label>
                        <Input
                          id="refresh-token"
                          type="password"
                          placeholder="Enter refresh token"
                          value={clientForm.refresh_token}
                          onChange={handleClientInputChange("refresh_token")}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Settings Section */}
                  <div className="col-span-2 pt-2">
                    <h3 className="text-sm text-slate-700 mb-3">Account Settings</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="assign-manager">Assign Ad Manager</Label>
                        <Select
                          value={clientForm.assigned_manager_id}
                          onValueChange={(value) =>
                            setClientForm((prev) => ({ ...prev, assigned_manager_id: value }))
                          }
                          disabled={!displayManagers.length}
                        >
                          <SelectTrigger id="assign-manager">
                            <SelectValue placeholder="Select a manager..." />
                          </SelectTrigger>
                          <SelectContent>
                            {displayManagers.map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthly-budget">Monthly Budget (USD)</Label>
                        <Input id="monthly-budget" type="number" placeholder="e.g., 50000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select>
                          <SelectTrigger id="industry">
                            <SelectValue placeholder="Select industry..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tech">Technology</SelectItem>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleClientDialogChange(false)}
                  disabled={isSubmittingClient}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClient} disabled={isSubmittingClient}>
                    {isSubmittingClient ? "Connecting..." : "Connect Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button onClick={() => setShowCreateReport(true)}>Generate Report</Button>
        </div>
      </div>

      {showGoogleOAuthReminder && (
        <Alert className="border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-1" />
              <div>
                <AlertTitle>Connect Google OAuth for client data</AlertTitle>
                <AlertDescription>
                  {oauthPendingClients.length === 1
                    ? `${oauthPendingClients[0].name} still needs Google OAuth before live metrics and AI recommendations can sync.`
                    : `${oauthPendingClients.length} client accounts still need Google OAuth before live metrics and recommendations can sync.`}
                </AlertDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("accounts")}>
              Review client connections
            </Button>
          </div>
        </Alert>
      )}

      {/* Alerts and Notifications */}
      <AlertsPanel alerts={[]} onAlertClick={onAlertClick} />

      {/* AI Recommendations Overview */}
      <AIRecommendationOverview
        recommendations={recommendations}
        loading={recommendationsLoading}
        onViewAll={() => onNavigate?.("recommendations")}
      />

      {/* Manager Activity */}
      {isAdmin && (
        <ManagerActivityPanel
          managers={displayManagers}
          onManagerClick={onManagerClick}
        />
      )}

      {/* Client Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900">Client Accounts</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {displayClients.filter(c => c.status === "healthy").length} Healthy
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              {displayClients.filter(c => c.status === "warning").length} Warning
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              {displayClients.filter(c => c.status === "critical").length} Critical
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientsLoading && (
            <div className="col-span-full text-sm text-slate-500">Loading client accounts...</div>
          )}
          {!clientsLoading && !displayClients.length && (
            <div className="col-span-full text-sm text-slate-500">No client accounts added yet.</div>
          )}
          {displayClients.map((client) => (
            <ClientCard key={client.id} client={client} onClick={() => onClientClick(client.id)} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivityPanel />
    </div>
  );
}

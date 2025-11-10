import { ChangeEvent, useMemo, useState } from "react";
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
import { mockClients, mockManagers, mockAlerts, Manager } from "../lib/mock-data";
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
  } = useData();
  const isAdmin = viewerRole === "admin";
  const displayClients = clients.length ? clients : authToken ? [] : mockClients;
  const displayManagers = isAdmin
    ? managers.length
      ? managers
      : authToken
      ? []
      : mockManagers
    : [];
  const initialClientForm = useMemo(
    () => ({
      name: "",
      email: "",
      developer_token: "",
      client_id: "",
      client_secret: "",
      refresh_token: "",
      login_customer_id: "",
      assigned_manager_id: "",
    }),
    [],
  );
  const [clientForm, setClientForm] = useState(() => ({ ...initialClientForm }));
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  const handleClientDialogChange = (open: boolean) => {
    setIsAddClientDialogOpen(open);
    if (!open) {
      setClientForm({ ...initialClientForm });
    }
  };

  const handleClientInputChange = (field: keyof typeof initialClientForm) =>
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

    const requiredFields: (keyof typeof initialClientForm)[] = [
      "name",
      "email",
      "developer_token",
      "client_id",
      "client_secret",
      "refresh_token",
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
      setClientForm({ ...initialClientForm });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create client";
      toast.error("Failed to add client", { description: message });
    } finally {
      setIsSubmittingClient(false);
    }
  };

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
                          value={clientForm.login_customer_id}
                          onChange={handleClientInputChange("login_customer_id")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-customer-id">Login Customer ID</Label>
                        <Input id="login-customer-id" placeholder="e.g., 123-456-7890" />
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

      {/* Alerts and Notifications */}
      <AlertsPanel alerts={mockAlerts} onAlertClick={onAlertClick} />

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

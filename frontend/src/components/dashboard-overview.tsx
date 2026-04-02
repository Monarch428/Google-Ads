import {
  AlertTriangle,
  Plus
} from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient, fetchMccStatus, startMccGoogleOAuth, type MccStatusResponse } from "../lib/api";
import { currencyOptions } from "../lib/currencies";
import { useData } from "../lib/data-context";
import { Manager } from "../lib/mock-data";
import { AIRecommendationOverview } from "./ai-recommendation-overview";
import { AlertsPanel } from "./alerts-panel";
import { ClientCard } from "./client-card";
import { CreateReport } from "./create-report";
import { GoogleAdsSyncControls } from "./google-ads";
import { ManagerActivityPanel } from "./manager-activity-panel";
import { RecentActivityPanel } from "./recent-activity-panel";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type ClientFormState = {
  name: string;
  email: string;
  // refresh_token: string;
  customer_ids: string[];
  assigned_manager_id: string;
  currency_code: string;
  monthly_budget: string;
};

type QuickRange = "today" | "7days" | "30days" | "90days" | "custom";

const STATIC_DEVELOPER_TOKEN = import.meta.env.VITE_DEVELOPER_TOKEN ?? "";
const STATIC_LOGIN_CUSTOMER_ID = import.meta.env.VITE_LOGIN_CUSTOMER_ID ?? "";
const STATIC_CLIENT_ID = import.meta.env.VITE_CLIENT_ID ?? "";
const STATIC_CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET ?? "";

interface DashboardOverviewProps {
  onClientClick: (clientId: string) => void;
  onNavigate?: (view: string) => void;
  onAlertClick?: (alert: any) => void;
  onManagerClick?: (manager: Manager) => void;
  onBundleClick?: (bundleId: string) => void;
  onReportClick?: (reportId: string) => void;
}

// Build a date range for a quick preset relative to "today"
function buildRangeForQuickPreset(preset: Exclude<QuickRange, "custom">): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end.getTime());

  const msPerDay = 1000 * 60 * 60 * 24;

  if (preset === "today") {
    // start === end
  } else if (preset === "7days") {
    // last 7 days inclusive => today and previous 6 days
    start.setTime(end.getTime() - 6 * msPerDay);
  } else if (preset === "30days") {
    start.setTime(end.getTime() - 29 * msPerDay);
  } else if (preset === "90days") {
    start.setTime(end.getTime() - 89 * msPerDay);
  }

  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  return {
    startDate: toISO(start),
    endDate: toISO(end),
  };
}

export function DashboardOverview({
  onClientClick,
  onNavigate,
  onAlertClick,
  onManagerClick,
  onBundleClick,
  onReportClick,
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

    // NEW: global date & sync state from DataContext
    dateRange,
    setDateRange,
    isSyncingGoogleAds,
  } = useData();

  const isAdmin = viewerRole === "admin";
  const displayClients = clients;
  const displayManagers = isAdmin ? managers : [];

  const createInitialClientForm = useCallback(
    (): ClientFormState => ({
      name: "",
      email: "",
      // refresh_token: refreshToken ?? "",
      customer_ids: [],
      assigned_manager_id: "",
      currency_code: "USD",
      monthly_budget: "",
    }),
    [],
  );

  const [clientForm, setClientForm] = useState<ClientFormState>(() =>
    createInitialClientForm(),
  );
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [customerIdError, setCustomerIdError] = useState<string | null>(null);
  const [mccStatus, setMccStatus] = useState<MccStatusResponse | null>(null);
  const [loadingMccStatus, setLoadingMccStatus] = useState(false);

  const loginCustomerId = mccStatus?.login_customer_id || STATIC_LOGIN_CUSTOMER_ID;
  // const oauthPendingClients = authToken
  //   ? clients.filter((client) => !client.hasGoogleOAuth)
  //   : [];
  // const showGoogleOAuthReminder = oauthPendingClients.length > 0;

  const mccConnected =
    (mccStatus?.connected ?? false) || clients.some((client) => client.hasGoogleOAuth);
  const showGoogleOAuthReminder = isAdmin && !mccConnected;

  // NEW: quick range selector state (kept in sync with global dateRange)
  const [quickRange, setQuickRange] = useState<QuickRange>("30days");

  const refreshMccStatus = useCallback(async () => {
    if (!isAdmin || !authToken) return;
    setLoadingMccStatus(true);
    try {
      const status = await fetchMccStatus(authToken);
      setMccStatus(status);
    } catch (error) {
      console.error("Failed to fetch MCC status", error);
    } finally {
      setLoadingMccStatus(false);
    }
  }, [authToken, isAdmin]);

  useEffect(() => {
    refreshMccStatus();
  }, [refreshMccStatus]);

  // Keep quick range in sync whenever global dateRange changes (e.g. via GoogleAdsSyncControls)
  useEffect(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      setQuickRange("custom");
      return;
    }

    const today = new Date();
    const todayISO = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
      .toISOString()
      .slice(0, 10);

    const parse = (s: string) => new Date(s + "T00:00:00");
    const start = parse(dateRange.startDate);
    const end = parse(dateRange.endDate);

    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.round((end.getTime() - start.getTime()) / msPerDay);

    if (dateRange.startDate === todayISO && dateRange.endDate === todayISO) {
      setQuickRange("today");
      return;
    }

    if (dateRange.endDate === todayISO) {
      if (diffDays === 6) {
        setQuickRange("7days");
        return;
      }
      if (diffDays === 29) {
        setQuickRange("30days");
        return;
      }
      if (diffDays === 89) {
        setQuickRange("90days");
        return;
      }
    }

    setQuickRange("custom");
  }, [dateRange]);

  const handleQuickRangeChange = (value: string) => {
    const preset = value as QuickRange;
    setQuickRange(preset);

    if (preset === "custom") {
      // Let other controls (e.g., a date picker or sync controls) define exact dates
      return;
    }

    const range = buildRangeForQuickPreset(preset as Exclude<QuickRange, "custom">);
    setDateRange(range);
  };

  // const launchClientOAuth = useCallback((clientId: string | number, clientName: string) => {
  //   const idStr = String(clientId);
  //   const oauthUrl = `${API_BASE_URL}/auth/google-connect?client_db_id=${encodeURIComponent(
  //     idStr,
  //   )}`;

  //   if (typeof window === "undefined") {
  //     toast.error("Unable to launch Google OAuth", {
  //       description: "A browser window is required to complete the Google consent flow.",
  //     });
  //     return;
  //   }

  //   try {
  //     window.location.assign(oauthUrl);

  //     toast.info("Redirecting to Google OAuth", {
  //       description: `Complete the consent screen for ${clientName} to finish connecting this account.`,
  //     });
  //   } catch (error) {
  //     const message = error instanceof Error ? error.message : "Unable to start OAuth";
  //     toast.error("Google OAuth failed", { description: message });
  //   }
  // }, []);

  const handleClientDialogChange = (open: boolean) => {
    setIsAddClientDialogOpen(open);
    // if (open) {
    //   setClientForm((prev) => ({ ...prev, refresh_token: refreshToken ?? "" }));
    // } else {
      if (!open) {
      setClientForm(createInitialClientForm());
      setCustomerIdError(null);
      setCustomerIdInput("");
    }
  };

  const handleClientInputChange =
    (field: keyof ClientFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setClientForm((prev) => ({ ...prev, [field]: value }));
    };

  const normalizeCustomerIdTokens = (value: string) =>
    value
      .split(/[,\s]+/)
      .map((token) => token.replace(/\D/g, "").trim())
      .filter(Boolean);

  const addCustomerIdsFromInput = () => {
    const tokens = normalizeCustomerIdTokens(customerIdInput);
    if (!tokens.length) {
      setCustomerIdError("Please enter at least one numeric customer ID.");
      return;
    }

    setCustomerIdError(null);
    setClientForm((prev) => {
      const existing = new Set(prev.customer_ids);
      const next = [...prev.customer_ids];
      tokens.forEach((id) => {
        if (!existing.has(id)) {
          existing.add(id);
          next.push(id);
        }
      });
      return { ...prev, customer_ids: next };
    });
    setCustomerIdInput("");
  };

  const removeCustomerId = (id: string) => {
    setClientForm((prev) => ({
      ...prev,
      customer_ids: prev.customer_ids.filter((existing) => existing !== id),
    }));
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

    if (!STATIC_DEVELOPER_TOKEN) {
      toast.error("Configuration required", {
        description: "Developer token is missing. Please configure VITE_DEVELOPER_TOKEN.",
      });
      return;
    }

    if (!STATIC_LOGIN_CUSTOMER_ID) {
      toast.error("Configuration required", {
        description:
          "Login customer ID is missing. Please configure VITE_LOGIN_CUSTOMER_ID.",
      });
      return;
    }

    if (!STATIC_CLIENT_ID || !STATIC_CLIENT_SECRET) {
      toast.error("Configuration required", {
        description:
          "OAuth client ID/secret are missing. Please configure VITE_CLIENT_ID and VITE_CLIENT_SECRET.",
      });
      return;
    }

    const requiredFields: Array<keyof ClientFormState> = [
      "name",
      "email",
      // "refresh_token",
      "currency_code",
    ];

    const missingField = requiredFields.find(
      (field) => !clientForm[field]?.toString().trim(),
    );
    if (missingField) {
      toast.error("Missing information", {
        description: "Please complete all required client credential fields.",
      });
      return;
    }

    if (!clientForm.customer_ids.length) {
      setCustomerIdError("Add at least one Google Ads customer ID.");
      return;
    }

    const sanitizedCustomerIds = clientForm.customer_ids
      .map((id) => id.replace(/\D/g, "").trim())
      .filter(Boolean);

    const parsedMonthlyBudget = clientForm.monthly_budget.trim()
      ? Number(clientForm.monthly_budget)
      : undefined;

    if (!sanitizedCustomerIds.length) {
      setCustomerIdError("Customer IDs must contain numbers only.");
      return;
    }

    setCustomerIdError(null);

    setIsSubmittingClient(true);
    try {
      const developerToken = STATIC_DEVELOPER_TOKEN.trim();
      const loginCustomerId = STATIC_LOGIN_CUSTOMER_ID.trim();

      const payload = {
        name: clientForm.name.trim(),
        email: clientForm.email.trim(),
        // developer_token: developerToken,
        // client_id: STATIC_CLIENT_ID,
        // client_secret: STATIC_CLIENT_SECRET,
        // refresh_token: clientForm.refresh_token.trim(),
        developer_token: developerToken || undefined,
        client_id: STATIC_CLIENT_ID || undefined,
        client_secret: STATIC_CLIENT_SECRET || undefined,
        customer_ids: sanitizedCustomerIds,
        login_customer_id: loginCustomerId || undefined,
        currency_code: clientForm.currency_code,
        monthly_budget: Number.isFinite(parsedMonthlyBudget)
          ? parsedMonthlyBudget
          : undefined,
        assigned_manager_id: clientForm.assigned_manager_id
          ? Number(clientForm.assigned_manager_id)
          : undefined,
      };

      const newClient = await createClient(payload, { accessToken: authToken, refreshToken });
      await refreshClients();
      toast.success("Client connected", {
        description: `${clientForm.name} is now available and will use the shared MCC connection.`,
      });
      setIsAddClientDialogOpen(false);
      setClientForm(createInitialClientForm());
      if (newClient?.id != null) {
        // const clientName = newClient.name ?? (clientForm.name || "new client");
        // launchClientOAuth(newClient.id, clientName);
        refreshMccStatus();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create client";
      toast.error("Failed to add client", { description: message });
    } finally {
      setIsSubmittingClient(false);
    }
  };

  useEffect(() => {
    // if (isAddClientDialogOpen) {
    //   setClientForm((prev) => ({ ...prev, refresh_token: refreshToken ?? "" }));
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const mccResult = params.get("mcc_oauth");

    if (!mccResult) return;

    if (mccResult === "success") {
      const updatedCount = params.get("updated");
      toast.success("Manager account connected", {
        description:
          updatedCount && Number(updatedCount) > 0
            ? `Shared MCC token applied to ${updatedCount} clients.`
            : "Shared MCC token saved.",
      });
      refreshMccStatus();
      refreshClients();
    } else {
      const reason = params.get("reason") ?? "Unable to save refresh token.";
      toast.error("MCC connection failed", { description: reason });
    }
  // }, [isAddClientDialogOpen, refreshToken]);
  
    ["mcc_oauth", "updated", "reason"].forEach((key) => params.delete(key));
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [refreshClients, refreshMccStatus]);

  const maskToken = useCallback((token: string) => {
    if (!token) return "";
    if (token.length <= 12) return token;
    return `${token.slice(0, 6)}…${token.slice(-4)}`;
  }, []);

  if (showCreateReport) {
    return (
      <CreateReport
        onBack={() => setShowCreateReport(false)}
        onGenerate={(clientId) => {
          setShowCreateReport(false);
          if (onReportClick) onReportClick(clientId);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500">Welcome back, Agency Owner</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={quickRange} onValueChange={handleQuickRangeChange}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Dialog
                open={isAddClientDialogOpen}
                onOpenChange={handleClientDialogChange}
              >
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
                      Connect a new Google Ads account to the Atlas
                      platform
                    </DialogDescription>
                  </DialogHeader>
                  {authDetails && (
                    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            Signed in via{" "}
                            {authDetails.method === "google"
                              ? "Google OAuth"
                              : "Email & Password"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Last login:{" "}
                            {new Date(
                              authDetails.timestamp,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          <div>
                            Access token preview:{" "}
                            {maskToken(authDetails.response.access_token)}
                          </div>
                          <div>
                            Refresh token preview:{" "}
                            {maskToken(authDetails.response.refresh_token)}
                          </div>
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
                        <h3 className="mb-3 text-sm text-slate-700">
                          Google Ads API Credentials
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            OAuth credentials are managed by your workspace and
                            applied automatically when creating clients. The
                            configured client ID and secret will be used for all
                            new accounts.
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="google-ads-id">
                              Google Ads Customer IDs
                            </Label>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Input
                                id="google-ads-id"
                                placeholder="e.g., 1234567890 (use commas for multiple)"
                                value={customerIdInput}
                                onChange={(event) =>
                                  setCustomerIdInput(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    addCustomerIdsFromInput();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={addCustomerIdsFromInput}
                              >
                                Add ID
                              </Button>
                            </div>
                            {customerIdError && (
                              <p className="text-xs text-destructive">
                                {customerIdError}
                              </p>
                            )}
                            {!!clientForm.customer_ids.length && (
                              <div className="flex flex-wrap gap-2">
                                {clientForm.customer_ids.map((id) => (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                                  >
                                    <span className="font-medium">{id}</span>
                                    <button
                                      type="button"
                                      className="text-slate-500 hover:text-slate-900"
                                      onClick={() => removeCustomerId(id)}
                                      aria-label={`Remove customer ID ${id}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-500">
                              Enter one or more numeric IDs separated by commas
                              or spaces. Duplicates are ignored.
                            </p>
                          </div>
                          {/* <div className="space-y-2">
                            <Label htmlFor="refresh-token">Refresh Token</Label>
                            <Input
                              id="refresh-token"
                              type="password"
                              placeholder="Enter refresh token"
                              value={clientForm.refresh_token}
                              onChange={handleClientInputChange("refresh_token")}
                            />
                          </div> */}
                        </div>
                      </div>

                      {/* Account Settings Section */}
                      <div className="col-span-2 pt-2">
                        <h3 className="mb-3 text-sm text-slate-700">
                          Account Settings
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="assign-manager">
                              Assign Ad Manager
                            </Label>
                            <Select
                              value={clientForm.assigned_manager_id}
                              onValueChange={(value: string) =>
                                setClientForm((prev) => ({
                                  ...prev,
                                  assigned_manager_id: value,
                                }))
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
                            <Label htmlFor="account-currency">
                              Account Currency
                            </Label>
                            <Select
                              value={clientForm.currency_code}
                              onValueChange={(value: string) =>
                                setClientForm((prev) => ({
                                  ...prev,
                                  currency_code: value,
                                }))
                              }
                            >
                              <SelectTrigger id="account-currency">
                                <SelectValue placeholder="Select currency..." />
                              </SelectTrigger>
                              <SelectContent>
                                {currencyOptions.map((option) => (
                                  <SelectItem
                                    key={option.code}
                                    value={option.code}
                                  >
                                    {option.name} ({option.symbol}{" "}
                                    {option.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="monthly-budget">
                              Monthly Budget ({clientForm.currency_code ||
                                "Currency"}
                              )
                            </Label>
                            <Input
                              id="monthly-budget"
                              type="number"
                              placeholder="e.g., 50000"
                              value={clientForm.monthly_budget}
                              onChange={handleClientInputChange("monthly_budget")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Select>
                              <SelectTrigger id="industry">
                                <SelectValue placeholder="Select industry..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tech">Technology</SelectItem>
                                <SelectItem value="ecommerce">
                                  E-commerce
                                </SelectItem>
                                <SelectItem value="saas">SaaS</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                                <SelectItem value="healthcare">
                                  Healthcare
                                </SelectItem>
                                <SelectItem value="education">
                                  Education
                                </SelectItem>
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
                    <Button
                      onClick={handleCreateClient}
                      disabled={isSubmittingClient}
                    >
                      {isSubmittingClient ? "Connecting..." : "Connect Account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button onClick={() => setShowCreateReport(true)}>Generate Report</Button>
          </div>
        </div>

{isAdmin && (
          <Card className="border border-dashed border-slate-200 bg-slate-50">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-sm text-slate-800">Manager Account (MCC)</CardTitle>
                <p className="text-xs text-slate-500">One OAuth token shared across every client connection.</p>
              </div>
              <Badge variant={mccConnected ? "secondary" : "outline"} className={mccConnected ? "bg-green-100 text-green-800" : "text-slate-700"}>
                {mccConnected ? "Connected" : "Not connected"}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1 text-sm text-slate-700">
                <p>
                  Login customer ID: <span className="font-mono text-slate-900">{loginCustomerId || "Not configured"}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {mccConnected
                    ? `Applied to ${mccStatus?.connected_clients ?? clients.length} of ${mccStatus?.total_clients ?? clients.length} clients.`
                    : "Connect your MCC to reuse one refresh token across all client accounts."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={refreshMccStatus} disabled={loadingMccStatus}>
                  {loadingMccStatus ? "Checking..." : "Refresh status"}
                </Button>
                <Button onClick={() => startMccGoogleOAuth()}>
                  {mccConnected ? "Reconnect MCC OAuth" : "Connect MCC OAuth"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Global sync status indicator */}
        {isSyncingGoogleAds && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Syncing latest Google Ads data…
          </div>
        )}
      </div>

      {showGoogleOAuthReminder && (
        <Alert className="border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
              <div>
                <AlertTitle>Connect your MCC Google Ads account</AlertTitle>
                <AlertDescription>
                  {/* {oauthPendingClients.length === 1
                    ? `${oauthPendingClients[0].name} still needs Google OAuth before live metrics and AI recommendations can sync.`
                    : `${oauthPendingClients.length} client accounts still need Google OAuth before live metrics and recommendations can sync.`} */}
                  Link your manager account once to share Google Ads access with every client and unlock live metrics and AI
                  recommendations.
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>startMccGoogleOAuth()}
            >
              Connect MCC OAuth
            </Button>
          </div>
        </Alert>
      )}

      {/* Global Google Ads Sync Controls */}
      <GoogleAdsSyncControls className="max-w-5xl" contextLabel="Google Ads data" />

      {/* Client Accounts */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-slate-900">Client Accounts</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {displayClients.filter((c) => c.status === "healthy").length} Healthy
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              {displayClients.filter((c) => c.status === "warning").length} Warning
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              {displayClients.filter((c) => c.status === "critical").length} Critical
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {clientsLoading && (
            <div className="col-span-full text-sm text-slate-500">
              Loading client accounts...
            </div>
          )}
          {!clientsLoading && !displayClients.length && (
            <div className="col-span-full text-sm text-slate-500">
              No client accounts added yet.
            </div>
          )}
          {displayClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => onClientClick(client.id)}
            />
          ))}
        </div>
      </div>

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

      {/* Recent Activity */}
      <RecentActivityPanel />
    </div>
  );
}

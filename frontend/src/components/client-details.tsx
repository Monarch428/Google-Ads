import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Calendar as CalendarIcon, Target, TrendingUp, DollarSign, Users, Package, Play, Lightbulb, XCircle, Download, Settings, MessageSquare, User, FileText, Sparkles, Plus, ListFilter } from "lucide-react";
import { useData } from "../lib/data-context";
import { ClientChatbotInline } from "./client-chatbot-inline";
import { CreateBundle } from "./create-bundle";
import { toast } from "sonner@2.0.3";
import { getCurrencyFormatter } from "../lib/currencies";

interface ClientDetailsProps {
  clientId: string;
  onBack: () => void;
}

interface DayStatus {
  date: number;
  status: "completed" | "pending" | "critical" | "none" | "sunday";
  tasksCompleted: number;
  totalTasks: number;
}

interface ActivityLog {
  id: string;
  date: string;
  time: string;
  action: string;
  user: string;
  type: "update" | "optimization" | "alert" | "report";
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "completed" | "pending" | "critical";
  priority: "high" | "medium" | "low";
  category: "optimization" | "monitoring" | "reporting" | "bidding";
  assignedTo: string;
  completedAt?: string;
  metrics?: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    spend?: number;
  };
}

interface ActionBundle {
  id: string;
  clientName: string;
  managerName: string;
  recommendationsCount: number;
  status: "pending" | "in-progress" | "completed";
  createdAt: string;
  estimatedImpact: string;
}

// Month configuration
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const createMonthConfig = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const startDay = startDate.getDay();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month - 1;

  return {
    name: startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    days,
    startDay,
    currentDay: isCurrentMonth ? now.getDate() : days,
  };
};
export function ClientDetails({ clientId, onBack }: ClientDetailsProps) {
  const { clients, campaigns, clientsLoading } = useData();
  const [activeClientId, setActiveClientId] = useState(clientId);
  const client = useMemo(
    () => clients.find((c) => c.id === activeClientId),
    [activeClientId, clients]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [currentMonthConfig, setCurrentMonthConfig] = useState(() => createMonthConfig(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`));
  const [monthlyData, setMonthlyData] = useState<DayStatus[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    setActiveClientId(clientId);
  }, [clientId]);
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [bundleStatusFilter, setBundleStatusFilter] = useState<"all" | "in-progress" | "pending" | "completed">("in-progress");
  
  // New task form state
  const [newTaskType, setNewTaskType] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [newTaskRecommendation, setNewTaskRecommendation] = useState("");
  const [newTaskImpact, setNewTaskImpact] = useState("");
  const [newTaskCampaign, setNewTaskCampaign] = useState("");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>(["overall"]);

  useEffect(() => {
    setSelectedCampaignIds(["overall"]);
    setSelectedDay(null);
    setIsDayDetailsOpen(false);
    setMonthlyData([]);
  }, [activeClientId]);

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    });
  }, []);

  const actionBundles: ActionBundle[] = [];
  const activityLogs: ActivityLog[] = [];

  const displayedCustomerId = client.customerId || client.loginCustomerId || "Not set";

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setCurrentMonthConfig(createMonthConfig(month));
    setMonthlyData([]);
    setSelectedDay(null);
    setIsDayDetailsOpen(false);
  };

  const handleDayClick = (day: number) => {
    const dayStatus = monthlyData.find((entry) => entry.date === day)?.status;
    if (dayStatus && dayStatus !== "none" && dayStatus !== "sunday") {
      setSelectedDay(day);
      setIsDayDetailsOpen(true);
    }
  };

  const handleSaveNewTask = () => {
    if (!newTaskType || !newTaskRecommendation) {
      toast.error("Please fill in required fields");
      return;
    }

    // In a real app, this would save to backend
    console.log("Saving new task:", {
      type: newTaskType,
      priority: newTaskPriority,
      recommendation: newTaskRecommendation,
      impact: newTaskImpact,
      campaign: newTaskCampaign,
    });
    
    toast.success("Task added successfully to the action bundle");
    
    // Reset form
    setNewTaskType("");
    setNewTaskPriority("medium");
    setNewTaskRecommendation("");
    setNewTaskImpact("");
    setNewTaskCampaign("");
    setIsAddTaskDialogOpen(false);
  };

  const handleExecuteRecommendation = (recId: string, recType: string) => {
    toast.success(`Executing "${recType}"...`);
    // In a real app, this would execute the recommendation
    setTimeout(() => {
      toast.success(`"${recType}" executed successfully`);
    }, 1500);
  };

  const handleSkipRecommendation = (recId: string, recType: string) => {
    toast.info(`"${recType}" has been skipped`);
    // In a real app, this would update the recommendation status
  };

  const selectedDayData = selectedDay ? monthlyData.find((entry) => entry.date === selectedDay) ?? null : null;
  const selectedDayTasks: Task[] = selectedDayData ? [] : [];

  if (clientsLoading) {
    return <div>Loading client data...</div>;
  }

  if (!client) {
    return <div>No client data available.</div>;
  }

  const clientCurrency = client.currencyCode || "USD";
  const currencyFormatterWithCents = useMemo(
    () => getCurrencyFormatter(clientCurrency),
    [clientCurrency]
  );

  const campaignsForClient = useMemo(
    () => campaigns.filter((campaign) => campaign.clientId === client.id),
    [campaigns, client.id]
  );

  const accountOptions = useMemo(
    () =>
      clients.map((account) => ({
        value: account.id,
        label: account.customerId || account.loginCustomerId || account.name,
        description: account.customerId
          ? `${account.name} • ${account.customerId}`
          : account.loginCustomerId
            ? `${account.name} • ${account.loginCustomerId}`
            : account.name,
      })),
    [clients]
  );

  useEffect(() => {
    if (!campaignsForClient.length) {
      setSelectedCampaignIds(["overall"]);
      return;
    }

    setSelectedCampaignIds((prev) => {
      const availableIds = new Set(campaignsForClient.map((campaign) => campaign.id));
      const filtered = prev.filter((id) => id === "overall" || availableIds.has(id));

      return filtered.length ? filtered : ["overall"];
    });
  }, [campaignsForClient]);

  const selectedCampaigns = useMemo(() => {
    if (selectedCampaignIds.includes("overall") || selectedCampaignIds.length === 0) {
      return campaignsForClient;
    }

    const selectedSet = new Set(selectedCampaignIds);
    return campaignsForClient.filter((campaign) => selectedSet.has(campaign.id));
  }, [campaignsForClient, selectedCampaignIds]);

  const handleCampaignToggle = (value: string) => {
    if (value === "overall") {
      setSelectedCampaignIds(["overall"]);
      return;
    }

    setSelectedCampaignIds((prev) => {
      const next = new Set(prev.includes("overall") ? [] : prev);

      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }

      if (next.size === 0) {
        next.add("overall");
      }

      return Array.from(next);
    });
  };

  const { totals: campaignTotals, topCampaigns, hasMetrics } = useMemo(() => {
    const totals = selectedCampaigns.reduce(
      (acc, campaign) => {
        acc.impressions += campaign.impressions;
        acc.clicks += campaign.clicks;
        acc.conversions += campaign.conversions;
        acc.cost += campaign.cost;
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, cost: 0 }
    );

    const sortedByCost = [...selectedCampaigns].sort((a, b) => {
      if (b.cost === a.cost) {
        return b.conversions - a.conversions;
      }
      return b.cost - a.cost;
    });

    return {
      totals,
      topCampaigns: sortedByCost.slice(0, 3),
      hasMetrics: selectedCampaigns.some(
        (campaign) => campaign.impressions > 0 || campaign.clicks > 0 || campaign.conversions > 0 || campaign.cost > 0
      ),
    };
  }, [selectedCampaigns]);

  const totalImpressions = campaignTotals.impressions || client.impressions || 0;
  const totalClicks = campaignTotals.clicks || client.clicks || 0;
  const totalConversions = campaignTotals.conversions || client.conversions || 0;
  const totalCost = campaignTotals.cost || client.adSpend || 0;

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : client.ctr || 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : client.conversionRate || 0;
  const averageCpc = totalClicks > 0
    ? totalCost / totalClicks
    : client.clicks > 0 && client.adSpend > 0
      ? client.adSpend / client.clicks
      : 0;
  const averageCpa = totalConversions > 0 ? totalCost / totalConversions : client.cpa || 0;
  const totalRevenue = Number.isFinite(client.revenue) ? client.revenue : totalConversions * 120;
  const roas = totalCost > 0 && totalRevenue > 0 ? totalRevenue / totalCost : 0;

  const safeAverageCpc = Number.isFinite(averageCpc) ? averageCpc : 0;
  const safeAverageCpa = Number.isFinite(averageCpa) ? averageCpa : 0;
  const safeRevenue = Number.isFinite(totalRevenue) ? totalRevenue : 0;
  const safeRoas = Number.isFinite(roas) ? roas : 0;
  const safeCtr = Number.isFinite(ctr) ? ctr : 0;
  const safeConversionRate = Number.isFinite(conversionRate) ? conversionRate : 0;
  const isOverallSelected = selectedCampaignIds.includes("overall");
  const selectedCount = selectedCampaigns.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-600";
      case "pending":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "critical":
        return "bg-red-500 hover:bg-red-600";
      case "sunday":
        return "bg-slate-300 hover:bg-slate-300";
      default:
        return "bg-slate-100 hover:bg-slate-200";
    }
  };

  const getStatusIcon = (status: string, withColor = false) => {
    const colorClass = withColor ? (
      status === "completed" ? "text-green-600" :
      status === "pending" ? "text-yellow-600" :
      "text-red-600"
    ) : "";
    
    switch (status) {
      case "completed":
        return <CheckCircle2 className={`w-4 h-4 ${colorClass}`} />;
      case "pending":
        return <Clock className={`w-4 h-4 ${colorClass}`} />;
      case "critical":
        return <AlertCircle className={`w-4 h-4 ${colorClass}`} />;
      default:
        return null;
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case "optimization":
        return "text-blue-600 bg-blue-50";
      case "update":
        return "text-green-600 bg-green-50";
      case "alert":
        return "text-red-600 bg-red-50";
      case "report":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  const getActivityTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Mock detailed recommendations for the bundle
  const bundleRecommendations = [
    {
      id: "1",
      type: "Keyword Optimization",
      priority: "high",
      status: "completed",
      recommendation: "Add 12 high-performing keywords with avg. CPC $2.30",
      impact: "+15% CTR expected",
      campaign: "Q4 Product Launch",
      executedAt: "Oct 27, 2025 10:30 AM",
      result: "+18% CTR achieved",
    },
    {
      id: "2",
      type: "Bid Adjustment",
      priority: "high",
      status: "completed",
      recommendation: "Increase bids by 15% for top-performing ad groups",
      impact: "+10% conversions expected",
      campaign: "Q4 Product Launch",
      executedAt: "Oct 27, 2025 10:35 AM",
      result: "+12% conversions achieved",
    },
    {
      id: "3",
      type: "Ad Copy Update",
      priority: "medium",
      status: "in-progress",
      recommendation: "Update ad headlines with emotional triggers",
      impact: "+8% engagement expected",
      campaign: "Brand Awareness",
      executedAt: null,
      result: null,
    },
    {
      id: "4",
      type: "Audience Expansion",
      priority: "medium",
      status: "pending",
      recommendation: "Add lookalike audiences based on converters",
      impact: "+20% reach expected",
      campaign: "Retargeting",
      executedAt: null,
      result: null,
    },
    {
      id: "5",
      type: "Budget Reallocation",
      priority: "high",
      status: "pending",
      recommendation: "Shift 20% budget from low-performing campaigns",
      impact: "+25% ROAS expected",
      campaign: "Shopping Campaigns",
      executedAt: null,
      result: null,
    },
  ];

  // Mock recent activity data for bundle
  const recentActivities = [
    {
      id: "1",
      type: "execution",
      user: "Sarah Johnson",
      action: "Executed recommendation #1: Keyword Optimization",
      timestamp: "Oct 27, 2025 10:30 AM",
      icon: Play,
    },
    {
      id: "2",
      type: "execution",
      user: "Sarah Johnson",
      action: "Executed recommendation #2: Bid Adjustment",
      timestamp: "Oct 27, 2025 10:35 AM",
      icon: Play,
    },
    {
      id: "3",
      type: "update",
      user: "System",
      action: "Updated bundle status to In Progress",
      timestamp: "Oct 27, 2025 10:28 AM",
      icon: Settings,
    },
    {
      id: "4",
      type: "comment",
      user: "Sarah Johnson",
      action: "Added comment: Proceeding with top priority items first",
      timestamp: "Oct 27, 2025 10:15 AM",
      icon: MessageSquare,
    },
    {
      id: "5",
      type: "created",
      user: "Sarah Johnson",
      action: "Created action bundle with 5 recommendations",
      timestamp: "Oct 27, 2025 9:45 AM",
      icon: Package,
    },
  ];

  const getStatusIcon2 = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge2 = (status: string) => {
    switch (status) {
      case "completed":
        return { variant: "default" as const, label: "Completed" };
      case "in-progress":
        return { variant: "outline" as const, label: "In Progress" };
      case "pending":
        return { variant: "secondary" as const, label: "Pending" };
      default:
        return { variant: "destructive" as const, label: "Failed" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Render create bundle view
  if (isCreatingBundle) {
    return (
      <>
        <CreateBundle 
          onBack={() => setIsCreatingBundle(false)}
          onSave={() => {
            setIsCreatingBundle(false);
            // In a real app, this would save the bundle to the backend
            // For now, we just close the form
          }}
          preSelectedClientId={client.id}
        />
      </>
    );
  }

  // Render bundle details view
  if (selectedBundleId) {
    const selectedBundle = actionBundles.find(b => b.id === selectedBundleId);
    const completedCount = bundleRecommendations.filter(r => r.status === "completed").length;
    const inProgressCount = bundleRecommendations.filter(r => r.status === "in-progress").length;
    const pendingCount = bundleRecommendations.filter(r => r.status === "pending").length;
    const progressPercentage = (completedCount / bundleRecommendations.length) * 100;

    return (
      <>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedBundleId(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {client.name}
              </Button>
              <div>
                <h1 className="text-slate-900">Action Bundle Details</h1>
                <p className="text-slate-500">{client.name} • Created by {selectedBundle?.managerName}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(true)} className="w-full min-w-[200px]">
                <Plus className="w-4 h-4 mr-2" />
                Add New Task
              </Button>
              <Button variant="outline" className="w-full min-w-[200px]">
                <Download className="w-4 h-4 mr-2" />
                Export Bundle
              </Button>
              <Button className="w-full min-w-[200px]">
                <Play className="w-4 h-4 mr-2" />
                Execute Pending Actions
              </Button>
            </div>
          </div>

          {/* Bundle Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">Total Actions</p>
                    <p className="text-slate-900">{bundleRecommendations.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="text-slate-900 text-green-600">{completedCount}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">In Progress</p>
                    <p className="text-slate-900 text-blue-600">{inProgressCount}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="text-slate-900 text-yellow-600">{pendingCount}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Overall Completion</span>
                  <span className="text-sm text-slate-900">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Estimated Impact</p>
                  <p className="text-sm text-green-600">{selectedBundle?.estimatedImpact}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Created Date</p>
                  <p className="text-sm text-slate-900">{selectedBundle?.createdAt}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Last Updated</p>
                  <p className="text-sm text-slate-900">2 hours ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recommendations List - Takes 2/3 of the space */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recommendations Breakdown</CardTitle>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="status-filter" className="text-sm text-slate-600">Filter by status:</Label>
                      <Select value={bundleStatusFilter} onValueChange={(value: any) => setBundleStatusFilter(value)}>
                        <SelectTrigger id="status-filter" className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-600" />
                              All ({bundleRecommendations.length})
                            </div>
                          </SelectItem>
                          <SelectItem value="in-progress">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              In Progress ({inProgressCount})
                            </div>
                          </SelectItem>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              Pending ({pendingCount})
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              Completed ({completedCount})
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Filter and sort recommendations
                    const statusOrder = { "in-progress": 1, "pending": 2, "completed": 3 };
                    const filteredRecs = bundleStatusFilter === "all" 
                      ? bundleRecommendations.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
                      : bundleRecommendations.filter(r => r.status === bundleStatusFilter);
                    
                    if (filteredRecs.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">No recommendations with this status</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {filteredRecs.map((rec, index) => {
                      const statusBadge = getStatusBadge2(rec.status);
                      return (
                        <div key={rec.id}>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              {getStatusIcon2(rec.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-slate-900">#{index + 1} {rec.type}</h4>
                                    <Badge variant={getPriorityBadge(rec.priority)} className="text-xs">
                                      {rec.priority}
                                    </Badge>
                                    <Badge variant={statusBadge.variant} className="text-xs">
                                      {statusBadge.label}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500 mb-2">{rec.campaign}</p>
                                </div>
                              </div>

                              <p className="text-sm text-slate-700 mb-3">{rec.recommendation}</p>

                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Expected Impact</p>
                                  <p className="text-sm text-green-600 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    {rec.impact}
                                  </p>
                                </div>
                                {rec.status === "completed" && rec.result && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Actual Result</p>
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {rec.result}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {rec.executedAt && (
                                <p className="text-xs text-slate-400">
                                  Executed on {rec.executedAt}
                                </p>
                              )}

                              {rec.status === "pending" && (
                                <div className="flex gap-2 mt-3">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSkipRecommendation(rec.id, rec.type)}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Skip
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={() => handleExecuteRecommendation(rec.id, rec.type)}
                                  >
                                    <Play className="w-4 h-4 mr-1" />
                                    Execute Now
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          {index < filteredRecs.length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      );
                    })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity - Takes 1/3 of the space */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => {
                      const Icon = activity.icon;
                      return (
                        <div key={activity.id}>
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-blue-600" />
                              </div>
                              {index < recentActivities.length - 1 && (
                                <div className="w-px h-full bg-slate-200 mt-2 flex-1 min-h-8" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="text-sm text-slate-900 mb-1">{activity.action}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <User className="w-3 h-3" />
                                <span>{activity.user}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{activity.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Add New Task Dialog */}
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Task to Bundle</DialogTitle>
              <DialogDescription>
                Create a new recommendation task for this action bundle
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="task-type">Task Type</Label>
                <Input
                  id="task-type"
                  placeholder="e.g., Keyword Optimization, Bid Adjustment"
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTaskPriority} onValueChange={(value: any) => setNewTaskPriority(value)}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-recommendation">Recommendation Description</Label>
                <Textarea
                  id="task-recommendation"
                  placeholder="Describe the recommendation in detail..."
                  value={newTaskRecommendation}
                  onChange={(e) => setNewTaskRecommendation(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-impact">Expected Impact</Label>
                <Input
                  id="task-impact"
                  placeholder="e.g., +15% CTR expected"
                  value={newTaskImpact}
                  onChange={(e) => setNewTaskImpact(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-campaign">Campaign</Label>
                <Input
                  id="task-campaign"
                  placeholder="e.g., Q4 Product Launch"
                  value={newTaskCampaign}
                  onChange={(e) => setNewTaskCampaign(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNewTask}>
                Add Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Accounts
            </Button>
            <div>
              <h1 className="text-slate-900">{client.name}</h1>
              <p className="text-slate-500">{client.industry}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid gap-1">
              <span className="text-xs font-medium text-slate-500">Google Ads customer ID</span>
              <Select value={activeClientId} onValueChange={setActiveClientId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Currently showing {displayedCustomerId}</p>
            </div>
            <Badge className={
              client.status === "healthy" ? "bg-green-600" :
              client.status === "warning" ? "bg-yellow-500" :
              "bg-red-600"
            }>
              {client.status}
            </Badge>
          </div>
        </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed Tasks</p>
                <p className="text-slate-900">
                  {monthlyData.filter(d => d.status === "completed").length} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Tasks</p>
                <p className="text-slate-900">
                  {monthlyData.filter(d => d.status === "pending").length} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Critical Days</p>
                <p className="text-slate-900">
                  {monthlyData.filter(d => d.status === "critical").length} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Month Progress</p>
                <p className="text-slate-900">
                  {Math.round((monthlyData.filter(d => d.status === "completed").length / (currentMonthConfig.currentDay - 1 || 1)) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600">
                Viewing {isOverallSelected ? "overall performance" : `${selectedCount} campaign${selectedCount === 1 ? "" : "s"}`} out of {campaignsForClient.length}.
              </p>
              <p className="text-xs text-slate-500">Select campaigns to recalculate spend and performance metrics.</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4" />
                  <span>
                    {isOverallSelected
                      ? `Overall (${campaignsForClient.length})`
                      : `${selectedCount} selected`}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Campaign filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={isOverallSelected}
                  onCheckedChange={() => handleCampaignToggle("overall")}
                >
                  Overall ({campaignsForClient.length} total)
                </DropdownMenuCheckboxItem>
                {campaignsForClient.map((campaign) => (
                  <DropdownMenuCheckboxItem
                    key={campaign.id}
                    checked={selectedCampaignIds.includes(campaign.id)}
                    onCheckedChange={() => handleCampaignToggle(campaign.id)}
                  >
                    {campaign.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Campaign Performance */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm text-slate-900">Campaign Performance</h3>
              </div>
              <div className="space-y-3">
                {topCampaigns.length > 0 ? (
                  topCampaigns.map((campaign) => (
                    <div key={campaign.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-900">{campaign.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {numberFormatter.format(campaign.conversions)} conversions
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Impressions</p>
                          <p className="text-slate-900">{numberFormatter.format(campaign.impressions)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">CTR</p>
                          <p className="text-green-600">{percentFormatter.format(campaign.ctr)}%</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Spend</p>
                          <p className="text-slate-900">{currencyFormatterWithCents.format(campaign.cost)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">CPA</p>
                          <p className="text-slate-900">{currencyFormatterWithCents.format(campaign.cpa)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                    Campaign level analytics will appear once data is available for this account.
                  </div>
                )}
                {selectedCampaigns.length > topCampaigns.length && (
                  <p className="text-xs text-slate-500">
                    Showing top {topCampaigns.length} of {selectedCampaigns.length} campaigns by spend.
                  </p>
                )}
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm text-slate-900">Financial Performance</h3>
              </div>
              <div className="space-y-3">
                {!hasMetrics && (
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                    No campaign performance data is available for this account yet. Values shown below reflect the latest synced totals.
                  </div>
                )}
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Total Spend</p>
                  <p className="text-lg text-slate-900">{currencyFormatterWithCents.format(totalCost)}</p>
                  {selectedCampaigns.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Aggregated from {selectedCampaigns.length} campaign{selectedCampaigns.length === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Revenue</p>
                  <p className="text-lg text-slate-900">{currencyFormatterWithCents.format(safeRevenue)}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    ROAS {safeRoas.toFixed(2)}x
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Average CPC</p>
                  <p className="text-lg text-slate-900">{currencyFormatterWithCents.format(safeAverageCpc)}</p>
                  <p className="text-xs text-slate-500 mt-1">{numberFormatter.format(totalClicks)} clicks</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Cost per Acquisition</p>
                  <p className="text-lg text-slate-900">{currencyFormatterWithCents.format(safeAverageCpa)}</p>
                  <p className="text-xs text-slate-500 mt-1">{numberFormatter.format(totalConversions)} conversions</p>
                </div>
              </div>
            </div>

            {/* Engagement & Conversion Metrics */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-sm text-slate-900">Engagement & Conversions</h3>
              </div>
              <div className="space-y-3">
                {!hasMetrics && (
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                    No engagement data has been recorded for this account yet. Once campaigns start receiving traffic, metrics will appear here.
                  </div>
                )}
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700 mb-1">Total Conversions</p>
                  <p className="text-2xl text-purple-900">{numberFormatter.format(totalConversions)}</p>
                  <p className="text-xs text-purple-600 mt-1">Conversion Rate {percentFormatter.format(safeConversionRate)}%</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Impressions</p>
                    <p className="text-lg text-slate-900">{numberFormatter.format(totalImpressions)}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Clicks</p>
                    <p className="text-lg text-slate-900">{numberFormatter.format(totalClicks)}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">CTR</p>
                    <p className="text-lg text-slate-900">{percentFormatter.format(safeCtr)}%</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Conversion Rate</p>
                    <p className="text-lg text-slate-900">{percentFormatter.format(safeConversionRate)}%</p>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Account Health</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${
                        client.status === "healthy"
                          ? "text-green-600 border-green-200"
                          : client.status === "warning"
                          ? "text-yellow-600 border-yellow-200"
                          : "text-red-600 border-red-200"
                      }`}
                    >
                      {client.status}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      Based on current CTR and conversion trends
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bundles Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Action Bundles
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsCreatingBundle(true)}>
              <Package className="w-4 h-4 mr-2" />
              Create New Bundle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actionBundles
              .filter(bundle => bundle.clientName === client.name)
              .map((bundle) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "completed":
                      return "bg-green-50 text-green-600 border-green-200";
                    case "in-progress":
                      return "bg-blue-50 text-blue-600 border-blue-200";
                    case "pending":
                      return "bg-yellow-50 text-yellow-600 border-yellow-200";
                    default:
                      return "bg-slate-50 text-slate-600 border-slate-200";
                  }
                };

                const getStatusIcon = (status: string) => {
                  switch (status) {
                    case "completed":
                      return <CheckCircle2 className="w-4 h-4" />;
                    case "in-progress":
                      return <Clock className="w-4 h-4" />;
                    case "pending":
                      return <AlertCircle className="w-4 h-4" />;
                    default:
                      return null;
                  }
                };

                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case "completed":
                      return { variant: "default" as const, label: "Completed" };
                    case "in-progress":
                      return { variant: "outline" as const, label: "In Progress" };
                    case "pending":
                      return { variant: "secondary" as const, label: "Pending" };
                    default:
                      return { variant: "secondary" as const, label: "Unknown" };
                  }
                };

                const statusBadge = getStatusBadge(bundle.status);

                return (
                  <div
                    key={bundle.id}
                    className={`p-4 border-2 rounded-lg transition-all hover:shadow-md ${getStatusColor(bundle.status)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getStatusIcon(bundle.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-slate-900">Bundle #{bundle.id}</h4>
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Created by {bundle.managerName} • {bundle.createdAt}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedBundleId(bundle.id)}
                      >
                        View Details
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <Lightbulb className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total Actions</p>
                          <p className="text-slate-900">{bundle.recommendationsCount}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Estimated Impact</p>
                          <p className="text-green-600">{bundle.estimatedImpact}</p>
                        </div>
                      </div>
                    </div>

                    {bundle.status === "pending" && (
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button variant="outline" size="sm">
                          Edit Bundle
                        </Button>
                        <Button size="sm">
                          <Play className="w-4 h-4 mr-1" />
                          Execute Actions
                        </Button>
                      </div>
                    )}

                    {bundle.status === "in-progress" && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-600">Progress</span>
                          <span className="text-xs text-slate-900">40%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: "40%" }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {actionBundles.filter(bundle => bundle.clientName === client.name).length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No action bundles created yet</p>
                <Button onClick={() => setIsCreatingBundle(true)}>
                  <Package className="w-4 h-4 mr-2" />
                  Create First Bundle
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Daily Task Status
                </CardTitle>
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              {monthlyData.length === 0 && (
                <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600 mb-4">
                  No daily tasks available for {currentMonthConfig.name}. Create the daily task module to start tracking work.
                </div>
              )}
              <div className="space-y-4">
                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-2">
                  {dayLabels.map(label => (
                    <div key={label} className="text-center text-xs text-slate-500 py-2">
                      {label}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <TooltipProvider>
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for days before the 1st */}
                    {[...Array(currentMonthConfig.startDay)].map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    
                    {monthlyData.map((day) => (
                      <Tooltip key={day.date} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleDayClick(day.date)}
                            className={`
                              aspect-square rounded-lg border-2 transition-all
                              flex flex-col items-center justify-center gap-1
                              ${selectedDay === day.date ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent"}
                              ${getStatusColor(day.status)}
                              ${day.status === "none" || day.status === "sunday" ? "cursor-default" : "cursor-pointer"}
                            `}
                            disabled={day.status === "none" || day.status === "sunday"}
                          >
                            <span className={`text-sm ${day.status === "none" ? "text-slate-400" : day.status === "sunday" ? "text-slate-600" : "text-white"}`}>
                              {day.date}
                            </span>
                            {day.status !== "none" && day.status !== "sunday" && (
                              <span className="text-white opacity-90">
                                {getStatusIcon(day.status)}
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        {day.status === "sunday" ? (
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <span className="text-sm">{currentMonthConfig.name.split(' ')[0]} {day.date}, 2025</span>
                              <p className="text-xs text-slate-500">No tasks scheduled - Weekend</p>
                            </div>
                          </TooltipContent>
                        ) : day.status !== "none" && (
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm">{currentMonthConfig.name.split(' ')[0]} {day.date}, 2025</span>
                                <Badge className={
                                  day.status === "completed" ? "bg-green-600" :
                                  day.status === "pending" ? "bg-yellow-500" :
                                  "bg-red-600"
                                }>
                                  {day.status}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">Tasks Progress</span>
                                  <span className="text-slate-700">
                                    {day.tasksCompleted} / {day.totalTasks} completed
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all ${
                                      day.status === "completed" ? "bg-green-600" :
                                      day.status === "pending" ? "bg-yellow-500" :
                                      "bg-red-600"
                                    }`}
                                    style={{
                                      width: `${(day.tasksCompleted / day.totalTasks) * 100}%`
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-slate-500 pt-1">
                                  {day.status === "completed" 
                                    ? "All tasks completed successfully" 
                                    : day.status === "pending"
                                    ? "Some tasks still in progress"
                                    : "Critical tasks need attention"}
                                </p>
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span className="text-xs text-slate-600">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded" />
                    <span className="text-xs text-slate-600">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span className="text-xs text-slate-600">Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-300 rounded" />
                    <span className="text-xs text-slate-600">Sunday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-100 rounded border border-slate-200" />
                    <span className="text-xs text-slate-600">Future</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Updates Log */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Actions & Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {activityLogs.length === 0 && (
                  <div className="text-sm text-slate-500">No actions or updates available for this client yet.</div>
                )}
                {activityLogs.map((log) => (
                  <div key={log.id} className="pb-4 border-b border-slate-100 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${getActivityTypeColor(log.type)}`}>
                            {getActivityTypeLabel(log.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{log.action}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{log.date}</span>
                          <span>•</span>
                          <span>{log.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">by {log.user}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Assistant Chatbot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            AI Assistant
          </CardTitle>
          <p className="text-xs text-slate-500">Ask me anything about your accounts</p>
        </CardHeader>
        <CardContent>
          <ClientChatbotInline clientName={client.name} />
        </CardContent>
      </Card>

      {/* Day Details Sheet */}
      <Sheet open={isDayDetailsOpen} onOpenChange={setIsDayDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>
                  {selectedDay && `${currentMonthConfig.name.split(' ')[0]} ${selectedDay}, 2025`}
                </SheetTitle>
                {selectedDayData && (
                  <Badge className={
                    selectedDayData.status === "completed" ? "bg-green-600" :
                    selectedDayData.status === "pending" ? "bg-yellow-500" :
                    "bg-red-600"
                  }>
                    {selectedDayData.status}
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Summary Stats */}
              {selectedDayData && (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedDayData.status === "completed" ? "bg-green-50" :
                          selectedDayData.status === "pending" ? "bg-yellow-50" :
                          "bg-red-50"
                        }`}>
                          {getStatusIcon(selectedDayData.status, true)}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Tasks Completed</p>
                          <p className="text-lg text-slate-900">
                            {selectedDayData.tasksCompleted} / {selectedDayData.totalTasks}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Target className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Completion Rate</p>
                          <p className="text-lg text-slate-900">
                            {selectedDayData.totalTasks > 0 
                              ? Math.round((selectedDayData.tasksCompleted / selectedDayData.totalTasks) * 100) 
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Progress Bar */}
              {selectedDayData && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Overall Progress</span>
                        <span className="text-slate-900">
                          {Math.round((selectedDayData.tasksCompleted / selectedDayData.totalTasks) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            selectedDayData.status === "completed" ? "bg-green-600" :
                            selectedDayData.status === "pending" ? "bg-yellow-500" :
                            "bg-red-600"
                          }`}
                          style={{
                            width: `${(selectedDayData.tasksCompleted / selectedDayData.totalTasks) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tasks List */}
              <div className="space-y-3">
                <h3 className="text-sm text-slate-900">Tasks</h3>
                {selectedDayTasks.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No tasks recorded for this day. Create the daily task module to add and track work items.
                  </p>
                )}
                {selectedDayTasks.map((task, index) => (
                  <Card key={task.id} className={`border-l-4 ${
                    task.status === "completed" ? "border-l-green-500" :
                    task.status === "pending" ? "border-l-yellow-500" :
                    "border-l-red-500"
                  }`}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {/* Task Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm text-slate-900">{task.title}</h4>
                              <Badge variant="outline" className={`text-xs ${
                                task.priority === "high" ? "border-red-300 text-red-700" :
                                task.priority === "medium" ? "border-yellow-300 text-yellow-700" :
                                "border-slate-300 text-slate-700"
                              }`}>
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600">{task.description}</p>
                          </div>
                          <Badge variant={task.status === "completed" ? "default" : "secondary"} className={
                            task.status === "completed" ? "bg-green-600" :
                            task.status === "pending" ? "bg-yellow-500" :
                            "bg-red-600"
                          }>
                            {task.status}
                          </Badge>
                        </div>

                        {/* Task Details */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{task.assignedTo}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {task.category}
                            </Badge>
                          </div>
                          {task.completedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{task.completedAt}</span>
                            </div>
                          )}
                        </div>

                        {/* Metrics */}
                        {task.metrics && task.status === "completed" && (
                          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Impressions</p>
                              <p className="text-sm text-slate-900">{task.metrics.impressions?.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Clicks</p>
                              <p className="text-sm text-slate-900">{task.metrics.clicks?.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Conv.</p>
                              <p className="text-sm text-slate-900">{task.metrics.conversions}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Spend</p>
                              <p className="text-sm text-slate-900">${task.metrics.spend}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  Export Tasks
                </Button>
                <Button variant="outline" className="flex-1">
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </>
  );
}

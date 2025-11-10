export interface Client {
  id: string;
  name: string;
  logo?: string;
  industry?: string;
  adSpend: number;
  conversions: number;
  ctr: number;
  cpa: number;
  conversionRate: number;
  revenue: number;
  impressions: number;
  clicks: number;
  roas: number;
  status: "healthy" | "warning" | "critical";
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  clientsAssigned: number;
  assignedClientIds?: string[];
  recommendationsReviewed: number;
  recommendationsPending: number;
  recommendationsApproved: number;
  actionBundlesCreated: number;
  avgTimeToApproval: string;
}

export interface AIRecommendation {
  id: string;
  clientId?: string;
  clientName: string;
  campaignName: string;
  type: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "approved" | "modified" | "rejected" | "dismissed" | "executed";
  recommendation: string;
  impact: string;
  manager: string;
  createdAt: string;
  actionProposal?: string;
  predictedImpact?: number;
}

export interface ActionBundle {
  id: string;
  clientName: string;
  managerName: string;
  recommendationsCount: number;
  status: "pending" | "in-progress" | "completed";
  createdAt: string;
  estimatedImpact: string;
}

export interface Report {
  id: string;
  clientName: string;
  reportType: string;
  status: "pending" | "approved" | "delivered";
  createdAt: string;
  createdBy: string;
}

export interface Alert {
  id: string;
  type: "ctr-drop" | "cpa-spike" | "budget-overspend" | "underperforming";
  clientName: string;
  campaignName: string;
  severity: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

export const mockClients: Client[] = [
  {
    id: "1",
    name: "TechStart Inc",
    industry: "Technology",
    adSpend: 45230,
    conversions: 892,
    ctr: 3.45,
    cpa: 50.7,
    conversionRate: 4.2,
    revenue: 125600,
    impressions: 1245000,
    clicks: 42952,
    roas: 2.78,
    status: "healthy",
  },
  {
    id: "2",
    name: "Fashion Forward",
    industry: "Retail & Fashion",
    adSpend: 32100,
    conversions: 456,
    ctr: 2.12,
    cpa: 70.4,
    conversionRate: 2.8,
    revenue: 78400,
    impressions: 980000,
    clicks: 20776,
    roas: 2.44,
    status: "warning",
  },
  {
    id: "3",
    name: "EcoLife Solutions",
    industry: "Sustainability",
    adSpend: 28950,
    conversions: 234,
    ctr: 1.85,
    cpa: 123.7,
    conversionRate: 1.9,
    revenue: 45600,
    impressions: 750000,
    clicks: 13875,
    roas: 1.58,
    status: "critical",
  },
  {
    id: "4",
    name: "Global Fitness",
    industry: "Health & Fitness",
    adSpend: 52400,
    conversions: 1045,
    ctr: 4.12,
    cpa: 50.1,
    conversionRate: 5.1,
    revenue: 156000,
    impressions: 1450000,
    clicks: 59738,
    roas: 2.98,
    status: "healthy",
  },
  {
    id: "5",
    name: "HomeDecor Pro",
    industry: "Home & Garden",
    adSpend: 19800,
    conversions: 312,
    ctr: 2.67,
    cpa: 63.5,
    conversionRate: 3.4,
    revenue: 58900,
    impressions: 560000,
    clicks: 14952,
    roas: 2.97,
    status: "healthy",
  },
  {
    id: "6",
    name: "AutoParts Direct",
    industry: "Automotive",
    adSpend: 38200,
    conversions: 567,
    ctr: 3.21,
    cpa: 67.4,
    conversionRate: 3.8,
    revenue: 92300,
    impressions: 1100000,
    clicks: 35310,
    roas: 2.42,
    status: "warning",
  },
];

export const mockManagers: Manager[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@agency.com",
    role: "Senior Ad Manager",
    status: "active",
    clientsAssigned: 3,
    assignedClientIds: ["1", "2", "3"],
    recommendationsReviewed: 45,
    recommendationsPending: 8,
    recommendationsApproved: 38,
    actionBundlesCreated: 12,
    avgTimeToApproval: "2.3 hours",
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.c@agency.com",
    role: "Ad Manager",
    status: "active",
    clientsAssigned: 2,
    assignedClientIds: ["4", "5"],
    recommendationsReviewed: 32,
    recommendationsPending: 5,
    recommendationsApproved: 28,
    actionBundlesCreated: 9,
    avgTimeToApproval: "3.1 hours",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@agency.com",
    role: "Ad Manager",
    status: "inactive",
    clientsAssigned: 1,
    assignedClientIds: ["6"],
    recommendationsReviewed: 23,
    recommendationsPending: 3,
    recommendationsApproved: 20,
    actionBundlesCreated: 7,
    avgTimeToApproval: "1.8 hours",
  },
];

export const mockRecommendations: AIRecommendation[] = [
  {
    id: "1",
    clientId: "1",
    clientName: "TechStart Inc",
    campaignName: "Q4 Product Launch",
    type: "Keyword Optimization",
    priority: "high",
    status: "pending",
    recommendation: "Add 12 high-performing keywords with avg. CPC $2.30",
    impact: "+15% CTR expected",
    manager: "Sarah Johnson",
    createdAt: "2 hours ago",
  },
  {
    id: "2",
    clientId: "2",
    clientName: "Fashion Forward",
    campaignName: "Winter Collection",
    type: "Budget Reallocation",
    priority: "high",
    status: "pending",
    recommendation: "Shift 20% budget from Search to Shopping campaigns",
    impact: "+22% ROAS expected",
    manager: "Mike Chen",
    createdAt: "4 hours ago",
  },
  {
    id: "3",
    clientId: "3",
    clientName: "EcoLife Solutions",
    campaignName: "Sustainability Drive",
    type: "Ad Copy Update",
    priority: "medium",
    status: "approved",
    recommendation: "Update ad copy with emotional triggers",
    impact: "+8% conversion rate expected",
    manager: "Emily Rodriguez",
    createdAt: "1 day ago",
  },
  {
    id: "4",
    clientId: "4",
    clientName: "Global Fitness",
    campaignName: "New Year Promo",
    type: "Audience Targeting",
    priority: "high",
    status: "pending",
    recommendation: "Expand to lookalike audiences based on converters",
    impact: "+30% reach with similar CPA",
    manager: "Sarah Johnson",
    createdAt: "5 hours ago",
  },
  {
    id: "5",
    clientId: "5",
    clientName: "HomeDecor Pro",
    campaignName: "Spring Sale",
    type: "Negative Keywords",
    priority: "medium",
    status: "modified",
    recommendation: "Add 45 negative keywords to reduce wasted spend",
    impact: "-12% wasted clicks",
    manager: "Mike Chen",
    createdAt: "6 hours ago",
  },
];

export const mockActionBundles: ActionBundle[] = [
  {
    id: "1",
    clientName: "TechStart Inc",
    managerName: "Sarah Johnson",
    recommendationsCount: 5,
    status: "in-progress",
    createdAt: "Oct 27, 2025",
    estimatedImpact: "+18% ROAS",
  },
  {
    id: "2",
    clientName: "Global Fitness",
    managerName: "Sarah Johnson",
    recommendationsCount: 3,
    status: "pending",
    createdAt: "Oct 28, 2025",
    estimatedImpact: "+25% Conversions",
  },
  {
    id: "3",
    clientName: "Fashion Forward",
    managerName: "Mike Chen",
    recommendationsCount: 7,
    status: "completed",
    createdAt: "Oct 25, 2025",
    estimatedImpact: "+20% CTR",
  },
];

export const mockReports: Report[] = [
  {
    id: "1",
    clientName: "TechStart Inc",
    reportType: "Monthly Performance",
    status: "pending",
    createdAt: "Oct 27, 2025",
    createdBy: "Sarah Johnson",
  },
  {
    id: "2",
    clientName: "Fashion Forward",
    reportType: "Campaign Analysis",
    status: "approved",
    createdAt: "Oct 26, 2025",
    createdBy: "Mike Chen",
  },
  {
    id: "3",
    clientName: "Global Fitness",
    reportType: "Weekly Summary",
    status: "delivered",
    createdAt: "Oct 25, 2025",
    createdBy: "Sarah Johnson",
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "ctr-drop",
    clientName: "Fashion Forward",
    campaignName: "Winter Collection",
    severity: "critical",
    message: "CTR dropped 35% in last 24 hours",
    timestamp: "1 hour ago",
  },
  {
    id: "2",
    type: "cpa-spike",
    clientName: "EcoLife Solutions",
    campaignName: "Sustainability Drive",
    severity: "warning",
    message: "CPA increased from $67 to $124",
    timestamp: "3 hours ago",
  },
  {
    id: "3",
    type: "budget-overspend",
    clientName: "AutoParts Direct",
    campaignName: "Parts Promotion",
    severity: "critical",
    message: "Daily budget exceeded by 45%",
    timestamp: "2 hours ago",
  },
  {
    id: "4",
    type: "underperforming",
    clientName: "HomeDecor Pro",
    campaignName: "Spring Sale",
    severity: "warning",
    message: "Conversion rate below target (2.1% vs 3.5%)",
    timestamp: "5 hours ago",
  },
];

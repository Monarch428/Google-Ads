import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import { CheckCircle2, RotateCcw, CheckCheck, ArrowLeft, ChevronRight, Building2, Search, Filter, TrendingUp, ClipboardCheck } from "lucide-react";
import { mockClients } from "../lib/mock-data";
import { useData } from "../lib/data-context";

interface SubChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  note: string;
  subItems?: SubChecklistItem[];
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const initialChecklistData: ChecklistSection[] = [
  {
    id: "account-tracking",
    title: "Account & Tracking Setup",
    items: [
      { id: "acc-1", label: "Ensure Google Ads account access with admin permissions", completed: false, note: "" },
      { id: "acc-2", label: "Link Google Ads with Analytics, Search Console, Tag Manager", completed: false, note: "", subItems: [
        { id: "acc-2-1", label: "Analytics", completed: false },
        { id: "acc-2-2", label: "Search Console", completed: false },
        { id: "acc-2-3", label: "Tag Manager", completed: false },
      ]},
      { id: "acc-3", label: "Confirm conversion tracking setup", completed: false, note: "", subItems: [
        { id: "acc-3-1", label: "Forms", completed: false },
        { id: "acc-3-2", label: "Calls", completed: false },
        { id: "acc-3-3", label: "Purchases", completed: false },
        { id: "acc-3-4", label: "Downloads", completed: false },
      ]},
      { id: "acc-4", label: "Test conversion actions are firing correctly", completed: false, note: "" },
      { id: "acc-5", label: "Set up call tracking (if applicable)", completed: false, note: "" },
      { id: "acc-6", label: "Import goals and transactions from Analytics", completed: false, note: "" },
    ],
  },
  {
    id: "campaign-structure",
    title: "Campaign Structure & Settings",
    items: [
      { id: "camp-1", label: "Segment campaigns logically", completed: false, note: "", subItems: [
        { id: "camp-1-1", label: "Product/Service", completed: false },
        { id: "camp-1-2", label: "Brand vs Non-brand", completed: false },
      ]},
      { id: "camp-2", label: "Choose correct bidding strategy", completed: false, note: "", subItems: [
        { id: "camp-2-1", label: "Manual CPC", completed: false },
        { id: "camp-2-2", label: "Max Conversions", completed: false },
        { id: "camp-2-3", label: "Target ROAS", completed: false },
      ]},
      { id: "camp-3", label: "Apply appropriate geo-targeting (include/exclude)", completed: false, note: "" },
      { id: "camp-4", label: "Set up ad schedule (days/times when ads run)", completed: false, note: "" },
      { id: "camp-5", label: "Create audience lists", completed: false, note: "", subItems: [
        { id: "camp-5-1", label: "Remarketing", completed: false },
        { id: "camp-5-2", label: "Lookalike", completed: false },
        { id: "camp-5-3", label: "In-market", completed: false },
      ]},
      { id: "camp-6", label: "Add negative keywords", completed: false, note: "" },
    ],
  },
  {
    id: "creative-assets",
    title: "Creative & Ad Assets",
    items: [
      { id: "cre-1", label: "Create responsive search ads (3 headlines + 2 descriptions min)", completed: false, note: "" },
      { id: "cre-2", label: "Upload brand logo and images", completed: false, note: "" },
      { id: "cre-3", label: "Align ad copy with business goals, USPs, strong CTAs", completed: false, note: "" },
      { id: "cre-4", label: "Add sitelink extensions", completed: false, note: "", subItems: [
        { id: "cre-4-1", label: "About", completed: false },
        { id: "cre-4-2", label: "Contact", completed: false },
        { id: "cre-4-3", label: "Services", completed: false },
        { id: "cre-4-4", label: "Products", completed: false },
      ]},
      { id: "cre-5", label: "Add callout extensions", completed: false, note: "", subItems: [
        { id: "cre-5-1", label: "Free Consultation", completed: false },
        { id: "cre-5-2", label: "Fast Delivery", completed: false },
        { id: "cre-5-3", label: "24/7 Support", completed: false },
        { id: "cre-5-4", label: "Money Back Guarantee", completed: false },
      ]},
      { id: "cre-6", label: "Add structured snippet extensions", completed: false, note: "", subItems: [
        { id: "cre-6-1", label: "Services", completed: false },
        { id: "cre-6-2", label: "Types", completed: false },
        { id: "cre-6-3", label: "Brands", completed: false },
      ]},
      { id: "cre-7", label: "Set up call extension (if phone calls matter)", completed: false, note: "" },
      { id: "cre-8", label: "Link location extension (if physical location)", completed: false, note: "" },
      { id: "cre-9", label: "Design and upload display/banner ads", completed: false, note: "", subItems: [
        { id: "cre-9-1", label: "300x250 (Medium Rectangle)", completed: false },
        { id: "cre-9-2", label: "728x90 (Leaderboard)", completed: false },
        { id: "cre-9-3", label: "160x600 (Wide Skyscraper)", completed: false },
        { id: "cre-9-4", label: "320x50 (Mobile Banner)", completed: false },
      ]},
    ],
  },
  {
    id: "landing-pages",
    title: "Landing Pages",
    items: [
      { id: "land-1", label: "Create/optimise landing pages for each campaign", completed: false, note: "" },
      { id: "land-2", label: "Clear headline, CTA, and contact/form on every page", completed: false, note: "" },
      { id: "land-3", label: "Ensure fast loading speed", completed: false, note: "", subItems: [
        { id: "land-3-1", label: "Mobile", completed: false },
        { id: "land-3-2", label: "Desktop", completed: false },
      ]},
      { id: "land-4", label: "Correct conversion tracking embedded", completed: false, note: "", subItems: [
        { id: "land-4-1", label: "Forms", completed: false },
        { id: "land-4-2", label: "Click-to-call", completed: false },
      ]},
    ],
  },
  {
    id: "optimization-reporting",
    title: "Ongoing Optimisation & Reporting",
    items: [
      { id: "opt-1", label: "Weekly performance review", completed: false, note: "", subItems: [
        { id: "opt-1-1", label: "CTR", completed: false },
        { id: "opt-1-2", label: "CPC", completed: false },
        { id: "opt-1-3", label: "Conversions", completed: false },
        { id: "opt-1-4", label: "ROAS", completed: false },
      ]},
      { id: "opt-2", label: "Review Google's campaign recommendations", completed: false, note: "" },
      { id: "opt-3", label: "A/B test ad copy regularly", completed: false, note: "", subItems: [
        { id: "opt-3-1", label: "Headlines", completed: false },
        { id: "opt-3-2", label: "CTAs", completed: false },
      ]},
      { id: "opt-4", label: "Review search term reports and update negatives", completed: false, note: "" },
      { id: "opt-5", label: "Adjust budgets for ROI", completed: false, note: "" },
      { id: "opt-6", label: "Maintain & optimise remarketing campaigns", completed: false, note: "" },
      { id: "opt-7", label: "Provide monthly report (insights + suggestions)", completed: false, note: "" },
    ],
  },
  {
    id: "additional-validation",
    title: "Additional Validation",
    items: [
      { id: "val-1", label: "Is 24/7 scheduling justified? If not, limit schedule", completed: false, note: "" },
      { id: "val-2", label: "Avoid AI-suggested headlines or descriptions", completed: false, note: "" },
      { id: "val-3", label: "Is a brand campaign justified? Avoid budget waste", completed: false, note: "" },
    ],
  },
];

export function SetupChecklist() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistSection[]>([]);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [checklistSearchQuery, setChecklistSearchQuery] = useState("");
  const { clients, clientsLoading } = useData();
  const availableClients = clients.length ? clients : mockClients;

  // Load checklist for selected client
  useEffect(() => {
    if (selectedClientId) {
      const saved = localStorage.getItem(`setupChecklist_${selectedClientId}`);
      const version = localStorage.getItem(`setupChecklistVersion_${selectedClientId}`);
      const currentVersion = "2.1";
      
      if (saved && version === currentVersion) {
        setChecklist(JSON.parse(saved));
      } else {
        localStorage.setItem(`setupChecklistVersion_${selectedClientId}`, currentVersion);
        setChecklist(initialChecklistData);
      }
    }
  }, [selectedClientId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (selectedClientId && checklist.length > 0) {
      localStorage.setItem(`setupChecklist_${selectedClientId}`, JSON.stringify(checklist));
      localStorage.setItem(`setupChecklistVersion_${selectedClientId}`, "2.1");
    }
  }, [checklist, selectedClientId]);

  const toggleSubItem = (sectionId: string, itemId: string, subItemId: string) => {
    setChecklist((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId && item.subItems
                  ? {
                      ...item,
                      subItems: item.subItems.map((subItem) =>
                        subItem.id === subItemId
                          ? { ...subItem, completed: !subItem.completed }
                          : subItem
                      ),
                    }
                  : item
              ),
            }
          : section
      )
    );
  };

  const toggleItem = (sectionId: string, itemId: string) => {
    setChecklist((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => {
                if (item.id === itemId) {
                  const newCompleted = !item.completed;
                  if (item.subItems) {
                    return {
                      ...item,
                      completed: newCompleted,
                      subItems: item.subItems.map((subItem) => ({
                        ...subItem,
                        completed: newCompleted,
                      })),
                    };
                  }
                  return { ...item, completed: newCompleted };
                }
                return item;
              }),
            }
          : section
      )
    );
  };

  const updateNote = (sectionId: string, itemId: string, note: string) => {
    setChecklist((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, note } : item
              ),
            }
          : section
      )
    );
  };

  const markAllComplete = (sectionId: string) => {
    setChecklist((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => ({
                ...item,
                completed: true,
                subItems: item.subItems?.map((subItem) => ({
                  ...subItem,
                  completed: true,
                })),
              })),
            }
          : section
      )
    );
  };

  const resetSection = (sectionId: string) => {
    setChecklist((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => ({
                ...item,
                completed: false,
                note: "",
                subItems: item.subItems?.map((subItem) => ({
                  ...subItem,
                  completed: false,
                })),
              })),
            }
          : section
      )
    );
  };

  const getItemProgress = (item: ChecklistItem) => {
    if (!item.subItems || item.subItems.length === 0) {
      return item.completed;
    }
    const completedSubItems = item.subItems.filter((sub) => sub.completed).length;
    return completedSubItems === item.subItems.length;
  };

  const getItemPartialProgress = (item: ChecklistItem) => {
    if (!item.subItems || item.subItems.length === 0) {
      return false;
    }
    const completedSubItems = item.subItems.filter((sub) => sub.completed).length;
    return completedSubItems > 0 && completedSubItems < item.subItems.length;
  };

  const getSectionProgress = (section: ChecklistSection) => {
    let completed = 0;
    let total = section.items.length;

    section.items.forEach((item) => {
      if (getItemProgress(item)) {
        completed++;
      }
    });

    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const getOverallProgress = () => {
    let totalItems = 0;
    let completedItems = 0;

    checklist.forEach((section) => {
      section.items.forEach((item) => {
        totalItems++;
        if (getItemProgress(item)) {
          completedItems++;
        }
      });
    });

    return {
      completed: completedItems,
      total: totalItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  };

  const getClientProgress = (clientId: string) => {
    const saved = localStorage.getItem(`setupChecklist_${clientId}`);
    if (!saved) return 0;

    const clientChecklist: ChecklistSection[] = JSON.parse(saved);
    let totalItems = 0;
    let completedItems = 0;

    clientChecklist.forEach((section) => {
      section.items.forEach((item) => {
        totalItems++;
        const isComplete = item.subItems && item.subItems.length > 0
          ? item.subItems.filter((sub) => sub.completed).length === item.subItems.length
          : item.completed;
        if (isComplete) {
          completedItems++;
        }
      });
    });

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-600">Healthy</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If no client is selected, show the list of clients
  if (!selectedClientId) {
    // Filter and sort clients
    let filteredClients = availableClients.filter((client) => {
      const matchesSearch = client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           client.industry?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort clients
    filteredClients = [...filteredClients].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "progress":
          return getClientProgress(b.id) - getClientProgress(a.id);
        case "status":
          const statusOrder = { critical: 0, warning: 1, healthy: 2 };
          return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
        default:
          return 0;
      }
    });

    // Calculate summary stats
    const totalAccounts = availableClients.length;
    const completedAccounts = availableClients.filter(c => getClientProgress(c.id) === 100).length;
    const inProgressAccounts = availableClients.filter(c => {
      const progress = getClientProgress(c.id);
      return progress > 0 && progress < 100;
    }).length;
    const notStartedAccounts = availableClients.filter(c => getClientProgress(c.id) === 0).length;
    const avgProgress = totalAccounts > 0
      ? Math.round(availableClients.reduce((sum, c) => sum + getClientProgress(c.id), 0) / totalAccounts)
      : 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-slate-900 mb-2">Setup Checklist</h1>
          <p className="text-sm text-slate-500">
            Select a client account to manage their setup checklist
          </p>
          {clientsLoading && (
            <p className="text-xs text-slate-500 mt-2">Loading latest client data...</p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Accounts</p>
                  <p className="text-2xl text-slate-900 mt-1">{totalAccounts}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Completed</p>
                  <p className="text-2xl text-green-600 mt-1">{completedAccounts}</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">In Progress</p>
                  <p className="text-2xl text-yellow-600 mt-1">{inProgressAccounts}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Average Progress</p>
                  <p className="text-2xl text-slate-900 mt-1">{avgProgress}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by client name or industry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder="Filter by status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Client List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No clients found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => {
              const progress = getClientProgress(client.id);
              return (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-slate-900 truncate">{client.name}</h3>
                            {getStatusBadge(client.status)}
                          </div>
                          <p className="text-sm text-slate-500">{client.industry}</p>
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600">Setup Progress</span>
                              <span className="text-xs text-slate-900">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Results Count */}
        {filteredClients.length > 0 && (
          <div className="text-center text-sm text-slate-500">
            Showing {filteredClients.length} of {totalAccounts} accounts
          </div>
        )}
      </div>
    );
  }

  // Show checklist for selected client
  const selectedClient = selectedClientId
    ? availableClients.find((c) => c.id === selectedClientId)
    : null;
  const overallProgress = getOverallProgress();

  // Filter checklist items based on search
  const getFilteredChecklist = () => {
    if (!checklistSearchQuery.trim()) return checklist;

    return checklist
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const matchesItemLabel = item.label.toLowerCase().includes(checklistSearchQuery.toLowerCase());
          const matchesNote = item.note.toLowerCase().includes(checklistSearchQuery.toLowerCase());
          const matchesSubItems = item.subItems?.some((subItem) =>
            subItem.label.toLowerCase().includes(checklistSearchQuery.toLowerCase())
          );
          return matchesItemLabel || matchesNote || matchesSubItems;
        }),
      }))
      .filter((section) => section.items.length > 0);
  };

  const filteredChecklist = getFilteredChecklist();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedClientId(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Accounts
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">
            Setup Checklist: {selectedClient?.name}
          </h1>
          <p className="text-sm text-slate-500">
            Track your progress through essential setup and optimization tasks
          </p>
        </div>
        {getStatusBadge(selectedClient?.status || "")}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search checklist items..."
              value={checklistSearchQuery}
              onChange={(e) => setChecklistSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {checklistSearchQuery && (
            <div className="mt-2 text-sm text-slate-500">
              {filteredChecklist.reduce((sum, section) => sum + section.items.length, 0)} items found
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {filteredChecklist.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No checklist items found matching "{checklistSearchQuery}"</p>
                <Button
                  variant="link"
                  onClick={() => setChecklistSearchQuery("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" defaultValue={filteredChecklist.map((s) => s.id)} className="space-y-4">
              {filteredChecklist.map((section) => {
                const progress = getSectionProgress(section);
              return (
                <AccordionItem key={section.id} value={section.id} className="border rounded-lg">
                  <Card className="border-0 shadow-none">
                    <AccordionTrigger className="hover:no-underline px-6 py-4">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-slate-900 text-left">{section.title}</h3>
                          <Badge
                            variant={progress.percentage === 100 ? "default" : "secondary"}
                            className={progress.percentage === 100 ? "bg-green-600" : ""}
                          >
                            {progress.percentage}%
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {progress.completed} / {progress.total}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="pt-0 pb-4">
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <Progress value={progress.percentage} className="h-2" />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mb-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAllComplete(section.id)}
                            className="text-xs"
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Mark All Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resetSection(section.id)}
                            className="text-xs"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                          </Button>
                        </div>

                        {/* Checklist Items */}
                        <div className="space-y-3">
                          {section.items.map((item) => {
                            const isComplete = getItemProgress(item);
                            const isPartial = getItemPartialProgress(item);
                            return (
                              <div key={item.id} className="space-y-2">
                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                  <Checkbox
                                    id={item.id}
                                    checked={isComplete}
                                    data-state={isPartial ? "indeterminate" : isComplete ? "checked" : "unchecked"}
                                    onCheckedChange={() => toggleItem(section.id, item.id)}
                                    className="mt-0.5"
                                  />
                                  <label
                                    htmlFor={item.id}
                                    className={`flex-1 text-sm cursor-pointer ${
                                      isComplete ? "line-through text-slate-400" : "text-slate-700"
                                    }`}
                                  >
                                    {item.label}
                                  </label>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setExpandedNote(expandedNote === item.id ? null : item.id)
                                    }
                                    className="text-xs h-6 px-2"
                                  >
                                    {expandedNote === item.id ? "Hide Note" : "Add Note"}
                                  </Button>
                                </div>

                                {/* Sub-items */}
                                {item.subItems && item.subItems.length > 0 && (
                                  <div className="ml-9 space-y-2">
                                    {item.subItems.map((subItem) => (
                                      <div
                                        key={subItem.id}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-colors"
                                      >
                                        <Checkbox
                                          id={subItem.id}
                                          checked={subItem.completed}
                                          onCheckedChange={() =>
                                            toggleSubItem(section.id, item.id, subItem.id)
                                          }
                                          className="h-3.5 w-3.5"
                                        />
                                        <label
                                          htmlFor={subItem.id}
                                          className={`flex-1 text-xs cursor-pointer ${
                                            subItem.completed
                                              ? "line-through text-slate-400"
                                              : "text-slate-600"
                                          }`}
                                        >
                                          {subItem.label}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {expandedNote === item.id && (
                                  <div className="ml-9 mr-3">
                                    <Textarea
                                      placeholder="Add notes here..."
                                      value={item.note}
                                      onChange={(e) =>
                                        updateNote(section.id, item.id, e.target.value)
                                      }
                                      className="text-xs min-h-[60px]"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              );
            })}
          </Accordion>
          )}
        </div>

        {/* Sticky Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  Progress Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Progress Circle */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-slate-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - overallProgress.percentage / 100)}`}
                        className="text-blue-600 transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl text-slate-900">{overallProgress.percentage}%</span>
                      <span className="text-xs text-slate-500">Complete</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Tasks</span>
                    <span className="text-slate-900">{overallProgress.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Completed</span>
                    <span className="text-green-600">{overallProgress.completed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Remaining</span>
                    <span className="text-orange-600">
                      {overallProgress.total - overallProgress.completed}
                    </span>
                  </div>
                </div>

                <Progress value={overallProgress.percentage} className="h-2" />

                {/* Section Breakdown */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm text-slate-900 mb-3">Section Progress</h4>
                  <div className="space-y-2">
                    {checklist.map((section) => {
                      const progress = getSectionProgress(section);
                      return (
                        <div key={section.id} className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-600 truncate pr-2">
                              {section.title}
                            </span>
                            <span className="text-slate-900 flex-shrink-0">
                              {progress.percentage}%
                            </span>
                          </div>
                          <Progress value={progress.percentage} className="h-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to reset all progress for this account? This cannot be undone."
                      )
                    ) {
                      setChecklist(initialChecklistData);
                      if (selectedClientId) {
                        localStorage.removeItem(`setupChecklist_${selectedClientId}`);
                      }
                    }
                  }}
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Reset All Progress
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

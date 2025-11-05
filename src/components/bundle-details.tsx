import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Download,
  Play,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  User,
  FileText,
  Settings,
  MessageSquare,
  Plus
} from "lucide-react";

interface BundleDetailsProps {
  bundleId: string;
  onBack: () => void;
}

// Mock recent activity data
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

export function BundleDetails({ bundleId, onBack }: BundleDetailsProps) {
  const [statusFilter, setStatusFilter] = useState<"in-progress" | "pending" | "completed">("in-progress");
  
  const completedCount = bundleRecommendations.filter(r => r.status === "completed").length;
  const inProgressCount = bundleRecommendations.filter(r => r.status === "in-progress").length;
  const pendingCount = bundleRecommendations.filter(r => r.status === "pending").length;
  const progressPercentage = (completedCount / bundleRecommendations.length) * 100;

  // Filter recommendations based on selected status
  const filteredRecommendations = bundleRecommendations.filter(r => r.status === statusFilter);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <XCircle className="w-4 h-4 text-red-600" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-slate-900">Action Bundle Details</h1>
            <p className="text-slate-500">TechStart Inc • Created by Sarah Johnson</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add New Task
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Bundle
          </Button>
          <Button>
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
                <CheckCircle className="w-5 h-5 text-green-600" />
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
              <p className="text-sm text-green-600">+18% ROAS</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Created Date</p>
              <p className="text-sm text-slate-900">Oct 27, 2025</p>
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
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === "in-progress" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("in-progress")}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    In Progress ({inProgressCount})
                  </Button>
                  <Button 
                    variant={statusFilter === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("pending")}
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Pending ({pendingCount})
                  </Button>
                  <Button 
                    variant={statusFilter === "completed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("completed")}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Completed ({completedCount})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecommendations.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No recommendations with this status</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecommendations.map((rec, index) => {
                    const statusBadge = getStatusBadge(rec.status);
                    return (
                      <div key={rec.id}>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getStatusIcon(rec.status)}
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
                                  <CheckCircle className="w-3 h-3" />
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
                              <Button variant="outline" size="sm">
                                <XCircle className="w-4 h-4 mr-1" />
                                Skip
                              </Button>
                              <Button size="sm">
                                <Play className="w-4 h-4 mr-1" />
                                Execute Now
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {index < filteredRecommendations.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
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
  );
}

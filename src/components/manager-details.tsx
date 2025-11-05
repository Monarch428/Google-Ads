import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Mail, 
  User, 
  CheckCircle, 
  Clock, 
  Package, 
  TrendingUp,
  Calendar,
  Target,
  BarChart3,
  FileText,
  AlertCircle,
  Play,
  XCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Manager, mockRecommendations, mockActionBundles, mockClients } from "../lib/mock-data";

interface ManagerDetailsProps {
  manager: Manager;
  onBack: () => void;
}

export function ManagerDetails({ manager, onBack }: ManagerDetailsProps) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  // Get manager's recommendations
  const managerRecommendations = mockRecommendations.filter(
    r => r.manager === manager.name
  );

  // Get manager's action bundles
  const managerBundles = mockActionBundles.filter(
    b => b.managerName === manager.name
  );

  // Get manager's clients (mock data - in real app would be from backend)
  const assignedClients = mockClients.slice(0, manager.clientsAssigned);

  // Recent activities for this manager
  const recentActivities = [
    {
      id: "1",
      type: "approval",
      action: "Approved keyword optimization recommendation",
      target: "TechStart Inc - Q4 Product Launch",
      timestamp: "2 hours ago",
      status: "success",
    },
    {
      id: "2",
      type: "bundle",
      action: "Created action bundle with 3 recommendations",
      target: "Global Fitness - New Year Promo",
      timestamp: "5 hours ago",
      status: "info",
    },
    {
      id: "3",
      type: "execution",
      action: "Executed budget reallocation",
      target: "TechStart Inc - Search Campaign",
      timestamp: "1 day ago",
      status: "success",
    },
    {
      id: "4",
      type: "rejection",
      action: "Rejected ad copy update",
      target: "Fashion Forward - Winter Collection",
      timestamp: "1 day ago",
      status: "warning",
    },
    {
      id: "5",
      type: "report",
      action: "Generated monthly performance report",
      target: "TechStart Inc",
      timestamp: "2 days ago",
      status: "info",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "approval":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "bundle":
        return <Package className="w-4 h-4 text-indigo-600" />;
      case "execution":
        return <Play className="w-4 h-4 text-blue-600" />;
      case "rejection":
        return <XCircle className="w-4 h-4 text-orange-600" />;
      case "report":
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "bg-green-50";
      case "warning":
        return "bg-yellow-50";
      case "error":
        return "bg-red-50";
      default:
        return "bg-blue-50";
    }
  };

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={onBack}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      {/* Manager Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-slate-900">{manager.name}</h2>
                <Badge variant={manager.status === "active" ? "default" : "secondary"}>
                  {manager.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mt-1">{manager.role}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{manager.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Clients Assigned</p>
                <p className="text-xl text-slate-900">{manager.clientsAssigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Approved</p>
                <p className="text-xl text-slate-900">{manager.recommendationsApproved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Pending Review</p>
                <p className="text-xl text-slate-900">{manager.recommendationsPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Bundles Created</p>
                <p className="text-xl text-slate-900">{manager.actionBundlesCreated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <p className="text-sm text-slate-600">Total Recommendations Reviewed</p>
              </div>
              <p className="text-xl text-slate-900 ml-6">{manager.recommendationsReviewed}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <p className="text-sm text-slate-600">Approval Rate</p>
              </div>
              <p className="text-xl text-slate-900 ml-6">
                {((manager.recommendationsApproved / manager.recommendationsReviewed) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <p className="text-sm text-slate-600">Avg. Time to Approval</p>
              </div>
              <p className="text-xl text-slate-900 ml-6">{manager.avgTimeToApproval}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="clients" className="w-full">
        <TabsList>
          <TabsTrigger value="clients">Assigned Clients</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="bundles">Action Bundles</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned Clients ({manager.clientsAssigned})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedClients.map((client) => (
                  <div key={client.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-lg gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm text-slate-900">{client.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Ad Spend: ${client.adSpend.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        ROAS: {client.roas.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant={
                      client.status === "healthy" ? "default" : 
                      client.status === "warning" ? "secondary" : 
                      "destructive"
                    } className="flex-shrink-0">
                      {client.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Recommendations ({managerRecommendations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {managerRecommendations.map((rec) => (
                  <div key={rec.id} className="p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm text-slate-900">{rec.type}</h4>
                        <p className="text-xs text-slate-600 mt-1">{rec.clientName}</p>
                        <p className="text-xs text-slate-500">{rec.campaignName}</p>
                      </div>
                      <Badge variant={
                        rec.status === "approved" ? "default" : 
                        rec.status === "pending" ? "secondary" : 
                        rec.status === "modified" ? "outline" : 
                        "destructive"
                      } className="flex-shrink-0">
                        {rec.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{rec.recommendation}</p>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "outline"} className={rec.priority === "medium" ? "bg-yellow-500 text-white border-transparent hover:bg-yellow-600" : ""}>
                        {rec.priority} priority
                      </Badge>
                      <p className="text-xs text-slate-500">{rec.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundles" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action Bundles ({managerBundles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {managerBundles.map((bundle) => (
                  <div key={bundle.id} className="p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm text-slate-900">{bundle.clientName}</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          {bundle.recommendationsCount} recommendations
                        </p>
                        <p className="text-xs text-slate-500">
                          Created {bundle.createdAt}
                        </p>
                      </div>
                      <Badge variant={
                        bundle.status === "completed" ? "default" : 
                        bundle.status === "in-progress" ? "secondary" : 
                        "outline"
                      } className="flex-shrink-0">
                        {bundle.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-green-600">{bundle.estimatedImpact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={activity.id}>
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-lg ${getStatusColor(activity.status)} flex items-center justify-center flex-shrink-0`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">{activity.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5 break-words">{activity.target}</p>
                        <p className="text-xs text-slate-400 mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                    {index < recentActivities.length - 1 && (
                      <div className="h-px bg-slate-100 my-3" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

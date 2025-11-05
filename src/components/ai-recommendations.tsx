import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Lightbulb, Search, Filter, CheckCircle, XCircle, Edit } from "lucide-react";
import { mockRecommendations } from "../lib/mock-data";
import { AIRecommendationsChatbot } from "./ai-recommendations-chatbot";

interface AIRecommendationsProps {
  onBundleClick?: (bundleId: string) => void;
}

export function AIRecommendations({ onBundleClick }: AIRecommendationsProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filteredRecommendations = mockRecommendations.filter(rec => {
    const matchesStatus = statusFilter === "all" || rec.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || rec.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "modified":
        return <Edit className="w-4 h-4 text-blue-600" />;
      default:
        return <Lightbulb className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { variant: "default" as const, label: "Approved" };
      case "rejected":
        return { variant: "destructive" as const, label: "Rejected" };
      case "modified":
        return { variant: "outline" as const, label: "Modified" };
      default:
        return { variant: "secondary" as const, label: "Pending" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return { variant: "destructive" as const, className: "" };
      case "medium":
        return { variant: "default" as const, className: "bg-yellow-500 text-white border-transparent hover:bg-yellow-600" };
      default:
        return { variant: "secondary" as const, className: "" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">AI Recommendations</h1>
          <p className="text-slate-500">Review and manage AI-generated insights</p>
        </div>
      </div>

      {/* AI Chatbot Assistant */}
      <AIRecommendationsChatbot />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search recommendations..." className="pl-10" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="modified">Modified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Total Recommendations</p>
            <p className="text-slate-900">{mockRecommendations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Pending Review</p>
            <p className="text-slate-900 text-yellow-600">{mockRecommendations.filter(r => r.status === "pending").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Approved</p>
            <p className="text-slate-900 text-green-600">{mockRecommendations.filter(r => r.status === "approved").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">High Priority</p>
            <p className="text-slate-900 text-red-600">{mockRecommendations.filter(r => r.priority === "high").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map((rec) => {
          const statusBadge = getStatusBadge(rec.status);
          return (
            <Card key={rec.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getStatusIcon(rec.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-slate-900">{rec.clientName}</h3>
                          <Badge 
                            variant={getPriorityBadge(rec.priority).variant} 
                            className={`text-xs ${getPriorityBadge(rec.priority).className}`}
                          >
                            {rec.priority} priority
                          </Badge>
                          <Badge variant={statusBadge.variant} className="text-xs">
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">{rec.campaignName} • {rec.type}</p>
                      </div>
                      <p className="text-xs text-slate-400">{rec.createdAt}</p>
                    </div>

                    <p className="text-slate-700 mb-3">{rec.recommendation}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Expected Impact</p>
                          <p className="text-sm text-green-600">{rec.impact}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Assigned To</p>
                          <p className="text-sm text-slate-900">{rec.manager}</p>
                        </div>
                      </div>
                      {rec.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button size="sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  ArrowLeft,
  Package,
  Search,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { mockClients, mockRecommendations } from "../lib/mock-data";

interface CreateBundleProps {
  onBack: () => void;
  onSave: () => void;
  preSelectedClientId?: string;
}

export function CreateBundle({ onBack, onSave, preSelectedClientId }: CreateBundleProps) {
  const [selectedClient, setSelectedClient] = useState<string>(preSelectedClientId || "");
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleRecommendationToggle = (recId: string) => {
    setSelectedRecommendations(prev =>
      prev.includes(recId)
        ? prev.filter(id => id !== recId)
        : [...prev, recId]
    );
  };

  const availableRecommendations = selectedClient
    ? mockRecommendations.filter(rec => rec.clientId === selectedClient && rec.status === "pending")
    : [];

  const filteredRecommendations = availableRecommendations.filter(rec =>
    rec.recommendation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-3 h-3" />;
      case "medium":
        return <TrendingUp className="w-3 h-3" />;
      default:
        return <CheckCircle className="w-3 h-3" />;
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
            <h1 className="text-slate-900">Create New Action Bundle</h1>
            <p className="text-slate-500">Group recommendations for coordinated execution</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={onSave} disabled={selectedRecommendations.length === 0}>
            <Package className="w-4 h-4 mr-2" />
            Create Bundle
          </Button>
        </div>
      </div>

      {/* Bundle Information */}
      <Card>
        <CardHeader>
          <CardTitle>Bundle Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bundle-name">Bundle Name *</Label>
              <Input
                id="bundle-name"
                placeholder="e.g., Q4 Performance Optimization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-select">Select Client *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bundle-description">Description</Label>
            <Textarea
              id="bundle-description"
              placeholder="Describe the purpose and goals of this action bundle..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-date">Target Completion Date</Label>
              <Input id="target-date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select defaultValue="medium">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Recommendations</CardTitle>
            {selectedClient && (
              <Badge variant="outline">
                {selectedRecommendations.length} selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedClient ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Please select a client first to view available recommendations</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search recommendations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Recommendations List */}
              {filteredRecommendations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No pending recommendations found for this client</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedRecommendations.includes(rec.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => handleRecommendationToggle(rec.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedRecommendations.includes(rec.id)}
                          onCheckedChange={() => handleRecommendationToggle(rec.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm text-slate-900 mb-1">
                                {rec.recommendation}
                              </p>
                              <p className="text-xs text-slate-500">
                                Campaign: {rec.campaignName}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`ml-3 gap-1 ${getPriorityColor(rec.priority)}`}
                            >
                              {getPriorityIcon(rec.priority)}
                              {rec.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>Impact: {rec.expectedImpact}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{rec.createdAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bundle Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Total Actions</p>
                  <p className="text-slate-900">{selectedRecommendations.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">High Priority</p>
                  <p className="text-red-600">
                    {availableRecommendations.filter(
                      r => selectedRecommendations.includes(r.id) && r.priority === "high"
                    ).length}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Medium Priority</p>
                  <p className="text-yellow-600">
                    {availableRecommendations.filter(
                      r => selectedRecommendations.includes(r.id) && r.priority === "medium"
                    ).length}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Expected Combined Impact</Label>
                <p className="text-sm text-slate-600">
                  Implementing these {selectedRecommendations.length} recommendations could improve
                  overall campaign performance and optimize ad spend allocation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

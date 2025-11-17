import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  ArrowLeft,
  FileText,
  Calendar,
  BarChart3,
  CheckCircle,
  Eye,
  MousePointer,
  DollarSign,
  Target,
} from "lucide-react";
import { useData } from "../lib/data-context";
import { toast } from "sonner@2.0.3";

interface CreateReportProps {
  onBack: () => void;
  onGenerate: () => void;
}

export function CreateReport({ onBack, onGenerate }: CreateReportProps) {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [reportType, setReportType] = useState<string>("monthly");
  const [includeSections, setIncludeSections] = useState({
    executiveSummary: true,
    performanceTrends: true,
    campaignBreakdown: true,
    topKeywords: true,
    deviceAnalysis: true,
    aiRecommendations: true,
    actionItems: true,
  });

  const handleSectionToggle = (section: string) => {
    setIncludeSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof includeSections],
    }));
  };

  const { clients } = useData();
  const availableClients = clients;
  const hasClients = availableClients.length > 0;

  const selectedSectionsCount = Object.values(includeSections).filter(Boolean).length;
  const selectedClientData = availableClients.find(c => c.id === selectedClient);

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
            <h1 className="text-slate-900">Generate New Report</h1>
            <p className="text-slate-500">Create a comprehensive performance report for your client</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button 
            onClick={() => {
              if (selectedClient) {
                toast.success(`Generating report for ${selectedClientData?.name}...`);
                setTimeout(() => {
                  toast.success("Report generated successfully!");
                  onGenerate();
                }, 1500);
              }
            }} 
            disabled={!selectedClient}
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-client">Select Client *</Label>
              <Select
                value={selectedClient}
                onValueChange={setSelectedClient}
                disabled={!hasClients}
              >
                <SelectTrigger id="report-client">
                  <SelectValue placeholder={hasClients ? "Choose a client..." : "No clients available"} />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!hasClients && (
                <p className="text-xs text-slate-500">Add a client account before generating reports.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type *</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly Performance</SelectItem>
                  <SelectItem value="monthly">Monthly Performance</SelectItem>
                  <SelectItem value="quarterly">Quarterly Review</SelectItem>
                  <SelectItem value="custom">Custom Period</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input id="start-date" type="date" defaultValue="2025-10-01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date *</Label>
              <Input id="end-date" type="date" defaultValue="2025-10-31" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-title">Report Title</Label>
            <Input
              id="report-title"
              placeholder="e.g., October 2025 Performance Report"
              defaultValue={reportType === "monthly" ? "October 2025 Performance Report" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-notes">Executive Notes (Optional)</Label>
            <Textarea
              id="report-notes"
              placeholder="Add any custom notes or highlights for this report..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Include Sections</CardTitle>
            <Badge variant="outline">{selectedSectionsCount} sections selected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => handleSectionToggle("executiveSummary")}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={includeSections.executiveSummary}
                onCheckedChange={() => handleSectionToggle("executiveSummary")}
              />
              <div>
                <p className="text-sm text-slate-900">Executive Summary</p>
                <p className="text-xs text-slate-500">High-level KPIs and key metrics</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => handleSectionToggle("performanceTrends")}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={includeSections.performanceTrends}
                onCheckedChange={() => handleSectionToggle("performanceTrends")}
              />
              <div>
                <p className="text-sm text-slate-900">Performance Trends</p>
                <p className="text-xs text-slate-500">Weekly trends and visualizations</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => handleSectionToggle("campaignBreakdown")}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={includeSections.campaignBreakdown}
                onCheckedChange={() => handleSectionToggle("campaignBreakdown")}
              />
              <div>
                <p className="text-sm text-slate-900">Campaign Breakdown</p>
                <p className="text-xs text-slate-500">Individual campaign performance</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => handleSectionToggle("topKeywords")}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={includeSections.topKeywords}
                onCheckedChange={() => handleSectionToggle("topKeywords")}
              />
              <div>
                <p className="text-sm text-slate-900">Top Performing Keywords</p>
                <p className="text-xs text-slate-500">Keyword analysis and insights</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => handleSectionToggle("deviceAnalysis")}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={includeSections.deviceAnalysis}
                onCheckedChange={() => handleSectionToggle("deviceAnalysis")}
              />
              <div>
                <p className="text-sm text-slate-900">Device Analysis</p>
                <p className="text-xs text-slate-500">Performance by device type</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => handleSectionToggle("aiRecommendations")}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={includeSections.aiRecommendations}
                onCheckedChange={() => handleSectionToggle("aiRecommendations")}
              />
              <div>
                <p className="text-sm text-slate-900">AI-Generated Recommendations</p>
                <p className="text-xs text-slate-500">Optimization suggestions</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            onClick={() => handleSectionToggle("actionItems")}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={includeSections.actionItems}
                onCheckedChange={() => handleSectionToggle("actionItems")}
              />
              <div>
                <p className="text-sm text-slate-900">Next Steps & Action Items</p>
                <p className="text-xs text-slate-500">Recommended actions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Summary */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900 mb-1">
                    {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Performance Report
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedClientData?.name} • October 2025
                  </p>
                </div>
              </div>

              <Separator />

              {selectedClientData && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-xs">Ad Spend</span>
                    </div>
                    <p className="text-sm text-slate-900">
                      ${selectedClientData.adSpend.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Eye className="w-3 h-3" />
                      <span className="text-xs">Impressions</span>
                    </div>
                    <p className="text-sm text-slate-900">
                      {selectedClientData.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <MousePointer className="w-3 h-3" />
                      <span className="text-xs">Clicks</span>
                    </div>
                    <p className="text-sm text-slate-900">
                      {selectedClientData.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Target className="w-3 h-3" />
                      <span className="text-xs">Conversions</span>
                    </div>
                    <p className="text-sm text-slate-900">
                      {selectedClientData.conversions.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-green-900">
                  Ready to generate with {selectedSectionsCount} sections
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

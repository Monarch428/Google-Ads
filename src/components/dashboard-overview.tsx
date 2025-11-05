import { useState } from "react";
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
import { mockClients, mockManagers, mockRecommendations, mockAlerts, Manager } from "../lib/mock-data";
import { KPICard } from "./kpi-card";
import { ClientCard } from "./client-card";
import { ManagerActivityPanel } from "./manager-activity-panel";
import { AlertsPanel } from "./alerts-panel";
import { AIRecommendationOverview } from "./ai-recommendation-overview";
import { RecentActivityPanel } from "./recent-activity-panel";
import { CreateReport } from "./create-report";
import { ReportPreview } from "./report-preview";
import { ManagerDetails } from "./manager-details";

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
          <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
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
                    <Input id="client-name" placeholder="e.g., TechStart Inc" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="e.g., client@example.com" />
                  </div>
                  
                  {/* API Credentials Section */}
                  <div className="col-span-2 pt-2">
                    <h3 className="text-sm text-slate-700 mb-3">Google Ads API Credentials</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="google-ads-id">Google Ads Customer ID</Label>
                        <Input id="google-ads-id" placeholder="e.g., 123-456-7890" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-customer-id">Login Customer ID</Label>
                        <Input id="login-customer-id" placeholder="e.g., 123-456-7890" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="developer-token">Developer Token</Label>
                        <Input id="developer-token" type="password" placeholder="Enter developer token" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-id">Client ID</Label>
                        <Input id="client-id" placeholder="Enter OAuth 2.0 client ID" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-secret">Client Secret</Label>
                        <Input id="client-secret" type="password" placeholder="Enter OAuth 2.0 client secret" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="refresh-token">Refresh Token</Label>
                        <Input id="refresh-token" type="password" placeholder="Enter refresh token" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Settings Section */}
                  <div className="col-span-2 pt-2">
                    <h3 className="text-sm text-slate-700 mb-3">Account Settings</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="assign-manager">Assign Ad Manager</Label>
                        <Select>
                          <SelectTrigger id="assign-manager">
                            <SelectValue placeholder="Select a manager..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mockManagers.map((manager) => (
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
                <Button variant="outline" onClick={() => setIsAddClientDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddClientDialogOpen(false)}>
                  Connect Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setShowCreateReport(true)}>Generate Report</Button>
        </div>
      </div>

      {/* Alerts and Notifications */}
      <AlertsPanel alerts={mockAlerts} onAlertClick={onAlertClick} />

      {/* AI Recommendations Overview */}
      <AIRecommendationOverview 
        recommendations={mockRecommendations} 
        onViewAll={() => onNavigate?.("recommendations")}
      />

      {/* Manager Activity */}
      <ManagerActivityPanel 
        managers={mockManagers} 
        onManagerClick={onManagerClick}
      />

      {/* Client Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900">Client Accounts</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {mockClients.filter(c => c.status === "healthy").length} Healthy
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              {mockClients.filter(c => c.status === "warning").length} Warning
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              {mockClients.filter(c => c.status === "critical").length} Critical
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockClients.map((client) => (
            <ClientCard key={client.id} client={client} onClick={() => onClientClick(client.id)} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivityPanel />
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FileText, Download, Send, Eye, CheckCircle } from "lucide-react";
import { mockReports } from "../lib/mock-data";
import { ReportPreview } from "./report-preview";
import { CreateReport } from "./create-report";

interface ClientReportsProps {
  onReportClick?: (reportId: string) => void;
}

export function ClientReports({ onReportClick }: ClientReportsProps) {
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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return { variant: "default" as const, label: "Delivered", icon: CheckCircle };
      case "approved":
        return { variant: "outline" as const, label: "Approved", icon: CheckCircle };
      default:
        return { variant: "secondary" as const, label: "Pending", icon: FileText };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Client Reports</h1>
          <p className="text-slate-500">Generate and manage client-ready performance reports</p>
        </div>
        <Button onClick={() => setShowCreateReport(true)}>
          <FileText className="w-4 h-4 mr-2" />
          Generate New Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="techstart">TechStart Inc</SelectItem>
                <SelectItem value="fashion">Fashion Forward</SelectItem>
                <SelectItem value="fitness">Global Fitness</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-status">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="30days">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Pending Approval</p>
            <p className="text-slate-900 text-yellow-600">{mockReports.filter(r => r.status === "pending").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Approved</p>
            <p className="text-slate-900 text-green-600">{mockReports.filter(r => r.status === "approved").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Delivered This Month</p>
            <p className="text-slate-900">{mockReports.filter(r => r.status === "delivered").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {mockReports.map((report) => {
          const statusBadge = getStatusBadge(report.status);
          const StatusIcon = statusBadge.icon;
          return (
            <Card key={report.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-slate-900">{report.clientName}</h3>
                          <Badge variant={statusBadge.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">{report.reportType}</p>
                      </div>
                      <p className="text-xs text-slate-400">{report.createdAt}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-1">Created by</p>
                      <p className="text-sm text-slate-900">{report.createdBy}</p>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-200">
                      <Button variant="outline" size="sm" onClick={() => onReportClick?.(report.id)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Download PDF
                      </Button>
                      {report.status === "pending" && (
                        <Button size="sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {report.status === "approved" && (
                        <Button size="sm">
                          <Send className="w-4 h-4 mr-1" />
                          Send to Client
                        </Button>
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

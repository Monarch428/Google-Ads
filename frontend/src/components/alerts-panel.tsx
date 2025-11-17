import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertTriangle, TrendingDown, DollarSign, XCircle } from "lucide-react";
import { Alert as AlertType } from "../lib/mock-data";
import { GoogleAdsSyncControls } from "./google-ads-sync-controls";

interface AlertsPanelProps {
  alerts: AlertType[];
  onAlertClick?: (alert: AlertType) => void;
}

export function AlertsPanel({ alerts, onAlertClick }: AlertsPanelProps) {
  const handleAlertClick = (alert: AlertType) => {
    if (onAlertClick) {
      onAlertClick(alert);
    }
  };
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "ctr-drop":
        return TrendingDown;
      case "cpa-spike":
        return TrendingDown;
      case "budget-overspend":
        return DollarSign;
      case "underperforming":
        return XCircle;
      default:
        return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alerts & Notifications</CardTitle>
            <Badge variant="destructive">{alerts.filter(a => a.severity === "critical").length} Critical</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <GoogleAdsSyncControls
            size="compact"
            className="mb-4"
            contextLabel="notification insights"
          />
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">No alerts or notifications available.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                return (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.severity === "critical" ? "bg-red-100" : "bg-yellow-100"}`}>
                        <Icon className={`w-4 h-4 ${alert.severity === "critical" ? "text-red-600" : "text-yellow-600"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm text-slate-900">{alert.clientName}</h4>
                          <Badge variant={getSeverityBadge(alert.severity)} className="text-xs">
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{alert.campaignName}</p>
                        <p className="text-sm text-slate-700">{alert.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{alert.timestamp}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
